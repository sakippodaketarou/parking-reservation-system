"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function normalizeText(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function toJstIso(date: string, time: string) {
  return `${date}T${time}:00+09:00`;
}

function hasOverlap(
  newStartAt: string,
  newEndAt: string,
  existingStartAt: string,
  existingEndAt: string
) {
  const aStart = new Date(newStartAt).getTime();
  const aEnd = new Date(newEndAt).getTime();
  const bStart = new Date(existingStartAt).getTime();
  const bEnd = new Date(existingEndAt).getTime();

  return aStart < bEnd && bStart < aEnd;
}

export async function createReservation(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("ログインが必要です。");
  }

  const vehicleId = normalizeText(formData.get("vehicle_id"));
  const slotId = normalizeText(formData.get("slot_id"));
  const reservationDate = normalizeText(formData.get("reservation_date"));
  const startTime = normalizeText(formData.get("start_time"));
  const endTime = normalizeText(formData.get("end_time"));

  if (!vehicleId || !slotId || !reservationDate || !startTime || !endTime) {
    throw new Error("必須項目が未入力です。");
  }

  const startAt = toJstIso(reservationDate, startTime);
  const endAt = toJstIso(reservationDate, endTime);

  if (new Date(startAt).getTime() >= new Date(endAt).getTime()) {
    throw new Error("終了時刻は開始時刻より後にしてください。");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("user_id, company_id, role")
    .eq("user_id", user.id)
    .single();

  if (profileError || !profile?.company_id) {
    throw new Error("プロフィール情報の取得に失敗しました。");
  }

  const { data: vehicle, error: vehicleError } = await supabase
    .from("vehicles")
    .select("id, company_id, is_active")
    .eq("id", vehicleId)
    .single();

  if (vehicleError || !vehicle) {
    throw new Error("選択された車両が見つかりません。");
  }

  const canUseVehicle =
    profile.role === "admin" || vehicle.company_id === profile.company_id;

  if (!canUseVehicle) {
    throw new Error("自社車両のみ予約に使用できます。");
  }

  if (!vehicle.is_active) {
    throw new Error("使用停止中の車両は予約できません。");
  }

  const { data: existingBookings, error: bookingFetchError } = await supabase
    .from("vehicle_bookings")
    .select("id, start_at, end_at, status")
    .eq("slot_id", slotId)
    .eq("status", "reserved")

  if (bookingFetchError) {
    throw new Error("既存予約の確認に失敗しました。");
  }

  const overlapped = (existingBookings ?? []).some((item) =>
    hasOverlap(startAt, endAt, item.start_at, item.end_at)
  );

  if (overlapped) {
    throw new Error("同じ時間帯に既存予約があります。");
  }

  const { error: insertError } = await supabase.from("vehicle_bookings").insert({
    company_id: profile.company_id,
    slot_id: slotId,
    vehicle_id: vehicleId,
    start_at: startAt,
    end_at: endAt,
    status: "reserved",
    created_by: user.id,
  });

  if (insertError) {
    throw new Error(`予約作成に失敗しました: ${insertError.message}`);
  }

  revalidatePath("/reservations");
  revalidatePath("/");
  redirect("/reservations");
}

export async function updateReservation(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("ログインが必要です。");
  }

  const reservationId = normalizeText(formData.get("reservation_id"));
  const vehicleId = normalizeText(formData.get("vehicle_id"));
  const slotId = normalizeText(formData.get("slot_id"));
  const reservationDate = normalizeText(formData.get("reservation_date"));
  const startTime = normalizeText(formData.get("start_time"));
  const endTime = normalizeText(formData.get("end_time"));

  if (!reservationId || !vehicleId || !slotId || !reservationDate || !startTime || !endTime) {
    throw new Error("必須項目が未入力です。");
  }

  const startAt = toJstIso(reservationDate, startTime);
  const endAt = toJstIso(reservationDate, endTime);

  if (new Date(startAt).getTime() >= new Date(endAt).getTime()) {
    throw new Error("終了時刻は開始時刻より後にしてください。");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("user_id, company_id, role")
    .eq("user_id", user.id)
    .single();

  if (profileError || !profile?.company_id) {
    throw new Error("プロフィール情報の取得に失敗しました。");
  }

  const { data: targetBooking, error: targetError } = await supabase
    .from("vehicle_bookings")
    .select("id, company_id")
    .eq("id", reservationId)
    .single();

  if (targetError || !targetBooking) {
    throw new Error("対象の予約が見つかりません。");
  }

  const canEditBooking =
    profile.role === "admin" || targetBooking.company_id === profile.company_id;

  if (!canEditBooking) {
    throw new Error("自社予約のみ編集できます。");
  }

  const { data: vehicle, error: vehicleError } = await supabase
    .from("vehicles")
    .select("id, company_id, is_active")
    .eq("id", vehicleId)
    .single();

  if (vehicleError || !vehicle) {
    throw new Error("選択された車両が見つかりません。");
  }

  const canUseVehicle =
    profile.role === "admin" || vehicle.company_id === profile.company_id;

  if (!canUseVehicle) {
    throw new Error("自社車両のみ予約に使用できます。");
  }

  if (!vehicle.is_active) {
    throw new Error("使用停止中の車両は予約できません。");
  }

  const { data: existingBookings, error: bookingFetchError } = await supabase
    .from("vehicle_bookings")
    .select("id, start_at, end_at, status")
    .eq("slot_id", slotId)
    .eq("status", "reserved");

  if (bookingFetchError) {
    throw new Error("既存予約の確認に失敗しました。");
  }

  const overlapped = (existingBookings ?? [])
    .filter((item) => item.id !== reservationId)
    .some((item) => hasOverlap(startAt, endAt, item.start_at, item.end_at));

  if (overlapped) {
    throw new Error("同じ時間帯に既存予約があります。");
  }

  const { error: updateError } = await supabase
    .from("vehicle_bookings")
    .update({
      vehicle_id: vehicleId,
      slot_id: slotId,
      start_at: startAt,
      end_at: endAt,
    })
    .eq("id", reservationId);

  if (updateError) {
    throw new Error(`予約更新に失敗しました: ${updateError.message}`);
  }

  revalidatePath("/reservations");
  revalidatePath("/");
  redirect("/reservations");
}

export async function deleteReservation(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("ログインが必要です。");
  }

  const reservationId = normalizeText(formData.get("reservation_id"));

  if (!reservationId) {
    throw new Error("予約IDが取得できませんでした。");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("user_id, company_id, role")
    .eq("user_id", user.id)
    .single();

  if (profileError || !profile?.company_id) {
    throw new Error("プロフィール情報の取得に失敗しました。");
  }

  const { data: targetBooking, error: targetError } = await supabase
    .from("vehicle_bookings")
    .select("id, company_id")
    .eq("id", reservationId)
    .single();

  if (targetError || !targetBooking) {
    throw new Error("対象の予約が見つかりません。");
  }

  const canDelete =
    profile.role === "admin" || targetBooking.company_id === profile.company_id;

  if (!canDelete) {
    throw new Error("自社予約のみ削除できます。");
  }

  const { error: deleteError } = await supabase
    .from("vehicle_bookings")
    .delete()
    .eq("id", reservationId);

  if (deleteError) {
    throw new Error(`予約削除に失敗しました: ${deleteError.message}`);
  }

  revalidatePath("/reservations");
  revalidatePath("/");
  redirect("/reservations");
}