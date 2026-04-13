"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";

type SelectionInput = {
  slot_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
};

type ProfileRow = {
  user_id: string;
  company_id: string;
  is_active: boolean;
  role: string;
};

type CompanyRow = {
  id: string;
  company_type: string;
};

function toJstIso(date: string, time: string) {
  return `${date}T${time}:00+09:00`;
}

function diffMinutes(startIso: string, endIso: string) {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  return Math.floor((end - start) / (1000 * 60));
}

function getJstDayOfWeek(dateString: string) {
  const date = new Date(`${dateString}T00:00:00+09:00`);
  return date.getDay(); // 0=日〜6=土
}

async function getCurrentProfile() {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("ログイン情報が確認できません。");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("user_id, company_id, is_active, role")
    .eq("user_id", user.id)
    .single<ProfileRow>();

  if (profileError || !profile) {
    throw new Error(
      `プロフィール取得に失敗しました: ${profileError?.message ?? "profile not found"}`
    );
  }

  if (!profile.is_active) {
    throw new Error("このアカウントは現在利用できません。");
  }

  return { supabase, user, profile };
}

async function getCurrentCompany(
  supabase: Awaited<ReturnType<typeof supabaseServer>>,
  companyId: string
) {
  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("id, company_type")
    .eq("id", companyId)
    .single<CompanyRow>();

  if (companyError || !company) {
    throw new Error(
      `会社情報取得に失敗しました: ${companyError?.message ?? "company not found"}`
    );
  }

  return company;
}

async function ensureBookingRuleAllows({
  supabase,
  companyType,
  slotId,
  bookingDate,
  startTime,
  endTime,
}: {
  supabase: Awaited<ReturnType<typeof supabaseServer>>;
  companyType: string;
  slotId: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
}) {
  // 工事業者は今は制限なし
  if (companyType === "work") {
    return;
  }

  const dayOfWeek = getJstDayOfWeek(bookingDate);

  const { data: rules, error } = await supabase
    .from("booking_rules")
    .select("id, start_time, end_time")
    .eq("company_type", companyType)
    .eq("slot_id", slotId)
    .eq("day_of_week", dayOfWeek)
    .eq("is_active", true);

  if (error) {
    throw new Error(`予約制限ルール確認に失敗しました: ${error.message}`);
  }

  if (!rules || rules.length === 0) {
    throw new Error("この曜日・バースでは予約可能時間が設定されていません。");
  }

  const allowed = rules.some((rule) => {
    const ruleStart = String(rule.start_time).slice(0, 5);
    const ruleEnd = String(rule.end_time).slice(0, 5);
    return startTime >= ruleStart && endTime <= ruleEnd;
  });

  if (!allowed) {
    throw new Error("この曜日・バースでは予約できる時間外です。");
  }
}

export async function createVehicleBooking(formData: FormData) {
  const { supabase, user, profile } = await getCurrentProfile();

  const vehicleId = String(formData.get("vehicle_id") ?? "");
  const selectionsJson = String(formData.get("selections_json") ?? "[]");
  const selectedDate = String(formData.get("selected_date") ?? "");

  if (!vehicleId) {
    throw new Error("車両が選択されていません。");
  }

  if (!selectedDate) {
    throw new Error("予約日が取得できませんでした。");
  }

  let selections: SelectionInput[] = [];

  try {
    selections = JSON.parse(selectionsJson);
  } catch {
    throw new Error("予約データの解析に失敗しました。");
  }

  if (!Array.isArray(selections) || selections.length === 0) {
    throw new Error("予約候補がありません。");
  }

  const currentCompanyId = profile.company_id;
  const isAdmin = profile.role === "admin";

  const company = await getCurrentCompany(supabase, currentCompanyId);

  const { data: vehicle, error: vehicleError } = await supabase
    .from("vehicles")
    .select("id, company_id")
    .eq("id", vehicleId)
    .single();

  if (vehicleError || !vehicle) {
    throw new Error(`車両確認に失敗しました: ${vehicleError?.message ?? "vehicle not found"}`);
  }

  if (vehicle.company_id !== currentCompanyId) {
    throw new Error("自社の車両のみ予約できます。");
  }

  const slotIds = [...new Set(selections.map((s) => s.slot_id))];

  const { data: validSlots, error: slotCheckError } = await supabase
    .from("vehicle_slots")
    .select("id")
    .in("id", slotIds)
    .eq("is_active", true);

  if (slotCheckError) {
    throw new Error(`車室確認に失敗しました: ${slotCheckError.message}`);
  }

  const validSlotIdSet = new Set((validSlots ?? []).map((slot) => slot.id));
  const missingSlotIds = slotIds.filter((id) => !validSlotIdSet.has(id));

  if (missingSlotIds.length > 0) {
    throw new Error(`存在しない車室IDがあります: ${missingSlotIds.join(", ")}`);
  }

  const insertRows: {
    company_id: string;
    vehicle_id: string;
    slot_id: string;
    start_at: string;
    end_at: string;
    created_by: string;
  }[] = [];

  for (const selection of selections) {
    const startAt = toJstIso(selection.booking_date, selection.start_time);
    const endAt = toJstIso(selection.booking_date, selection.end_time);
    const minutes = diffMinutes(startAt, endAt);

    if (minutes <= 0) {
      throw new Error("終了時刻は開始時刻より後にしてください。");
    }

    if (!isAdmin && minutes > 60) {
      throw new Error("一般ユーザーは1件あたり60分までです。");
    }

    // 管理者以外は予約ルール制限を適用
    if (!isAdmin) {
      await ensureBookingRuleAllows({
        supabase,
        companyType: company.company_type,
        slotId: selection.slot_id,
        bookingDate: selection.booking_date,
        startTime: selection.start_time,
        endTime: selection.end_time,
      });
    }

    insertRows.push({
      company_id: currentCompanyId,
      vehicle_id: vehicleId,
      slot_id: selection.slot_id,
      start_at: startAt,
      end_at: endAt,
      created_by: user.id,
    });
  }

  for (const row of insertRows) {
    const { data: conflicts, error: conflictError } = await supabase
      .from("vehicle_bookings")
      .select("id")
      .eq("slot_id", row.slot_id)
      .lt("start_at", row.end_at)
      .gt("end_at", row.start_at);

    if (conflictError) {
      throw new Error(`競合確認に失敗しました: ${conflictError.message}`);
    }

    if ((conflicts ?? []).length > 0) {
      throw new Error("選択した時間帯に既存予約があります。画面を更新して再選択してください。");
    }
  }

  const { error: insertError } = await supabase.from("vehicle_bookings").insert(insertRows);

  if (insertError) {
    throw new Error(`予約作成に失敗しました: ${insertError.message}`);
  }

  revalidatePath("/vehicle-bookings");
  redirect(`/vehicle-bookings?date=${selectedDate}&saved=1`);
}

export async function updateVehicleBooking(formData: FormData) {
  const { supabase, profile } = await getCurrentProfile();

  const bookingId = String(formData.get("booking_id") ?? "");
  const slotId = String(formData.get("slot_id") ?? "");
  const bookingDate = String(formData.get("booking_date") ?? "");
  const startTime = String(formData.get("start_time") ?? "");
  const endTime = String(formData.get("end_time") ?? "");

  if (!bookingId || !slotId || !bookingDate || !startTime || !endTime) {
    throw new Error("変更に必要な情報が不足しています。");
  }

  const { data: booking, error: bookingError } = await supabase
    .from("vehicle_bookings")
    .select("id, company_id, slot_id, start_at, end_at")
    .eq("id", bookingId)
    .single();

  if (bookingError || !booking) {
    throw new Error(`予約取得に失敗しました: ${bookingError?.message ?? "booking not found"}`);
  }

  const canManage = profile.role === "admin" || booking.company_id === profile.company_id;
  if (!canManage) {
    throw new Error("この予約を変更する権限がありません。");
  }

  const startAt = toJstIso(bookingDate, startTime);
  const endAt = toJstIso(bookingDate, endTime);
  const minutes = diffMinutes(startAt, endAt);

  if (minutes <= 0) {
    throw new Error("終了時刻は開始時刻より後にしてください。");
  }

  if (profile.role !== "admin" && minutes > 60) {
    throw new Error("一般ユーザーは1件あたり60分までです。");
  }

  // 一般ユーザーの更新時は予約ルールも適用
  if (profile.role !== "admin") {
    const company = await getCurrentCompany(supabase, profile.company_id);

    await ensureBookingRuleAllows({
      supabase,
      companyType: company.company_type,
      slotId,
      bookingDate,
      startTime,
      endTime,
    });
  }

  const { data: conflicts, error: conflictError } = await supabase
    .from("vehicle_bookings")
    .select("id")
    .eq("slot_id", slotId)
    .neq("id", bookingId)
    .lt("start_at", endAt)
    .gt("end_at", startAt);

  if (conflictError) {
    throw new Error(`競合確認に失敗しました: ${conflictError.message}`);
  }

  if ((conflicts ?? []).length > 0) {
    throw new Error("変更後の時間帯に既存予約があります。");
  }

  const { error: updateError } = await supabase
    .from("vehicle_bookings")
    .update({
      slot_id: slotId,
      start_at: startAt,
      end_at: endAt,
    })
    .eq("id", bookingId);

  if (updateError) {
    throw new Error(`予約変更に失敗しました: ${updateError.message}`);
  }

  revalidatePath("/vehicle-bookings");
  redirect(`/vehicle-bookings?date=${bookingDate}&updated=1`);
}

export async function deleteVehicleBooking(formData: FormData) {
  const { supabase, profile } = await getCurrentProfile();

  const bookingId = String(formData.get("booking_id") ?? "");
  const bookingDate = String(formData.get("booking_date") ?? "");

  if (!bookingId || !bookingDate) {
    throw new Error("削除に必要な情報が不足しています。");
  }

  const { data: booking, error: bookingError } = await supabase
    .from("vehicle_bookings")
    .select("id, company_id")
    .eq("id", bookingId)
    .single();

  if (bookingError || !booking) {
    throw new Error(`予約取得に失敗しました: ${bookingError?.message ?? "booking not found"}`);
  }

  const canManage = profile.role === "admin" || booking.company_id === profile.company_id;
  if (!canManage) {
    throw new Error("この予約を削除する権限がありません。");
  }

  const { error: deleteError } = await supabase
    .from("vehicle_bookings")
    .delete()
    .eq("id", bookingId);

  if (deleteError) {
    throw new Error(`予約削除に失敗しました: ${deleteError.message}`);
  }

  revalidatePath("/vehicle-bookings");
  redirect(`/vehicle-bookings?date=${bookingDate}&deleted=1`);
}