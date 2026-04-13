import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import BookingGridClient, {
  type GridBooking,
  type GridSlot,
  type GridVehicle,
} from "@/app/components/vehicle-bookings/BookingGridClient";
import { supabaseServer } from "@/lib/supabaseServer";

type SearchParams = Promise<{
  date?: string;
  vehicle?: string;
  message?: string;
  error?: string;
}>;

type ProfileRow = {
  user_id: string;
  company_id: string | null;
  role: string;
};

type VehicleSlotRow = {
  id: string;
  code: string | null;
  name: string | null;
  sort_order: number | null;
  is_active: boolean;
};

type VehicleRow = {
  id: string;
  company_id: string | null;
  plate_region: string | null;
  plate_class: string | null;
  plate_kana: string | null;
  plate_number: string | null;
  vehicle_type: string | null;
};

type VehicleBookingRow = {
  id: string;
  company_id: string | null;
  slot_id: string;
  vehicle_id: string | null;
  booking_date: string;
  start_time: string;
  end_time: string;
  start_at: string;
  end_at: string;
  status: string;
  created_by: string;
  created_at: string;
};

type CompanyRow = {
  id: string;
  name: string | null;
  contact_name: string | null;
  contact_email: string | null;
  company_type: string | null;
  notes: string | null;
};

type CompanyTypeRuleRow = {
  company_type: string;
  reservation_start_time: string | null;
  reservation_end_time: string | null;
  allowed_slot_codes: string[] | null;
  notes: string | null;
};

type CandidatePayload = {
  slotId: string;
  startTime: string;
  endTime: string;
};

type CompanySimpleRow = {
  id: string;
  name: string | null;
};

function getJstToday() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
  }).format(new Date());
}

function normalizeTime(value: string | null | undefined) {
  if (!value) return "";
  return value.slice(0, 5);
}

function timeToMinutes(value: string) {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

function generateHalfHourTimes(start = "00:00", end = "24:00") {
  const list: string[] = [];
  let current = timeToMinutes(start);
  const endMin = timeToMinutes(end);

  while (current <= endMin) {
    const h = Math.floor(current / 60)
      .toString()
      .padStart(2, "0");
    const m = (current % 60).toString().padStart(2, "0");
    list.push(`${h}:${m}`);
    current += 30;
  }

  return list;
}

function overlaps(
  startA: string,
  endA: string,
  startB: string,
  endB: string
) {
  const a1 = timeToMinutes(normalizeTime(startA));
  const a2 = timeToMinutes(normalizeTime(endA));
  const b1 = timeToMinutes(normalizeTime(startB));
  const b2 = timeToMinutes(normalizeTime(endB));
  return a1 < b2 && b1 < a2;
}

function roleLabel(role: string) {
  switch (role) {
    case "admin":
      return "管理者";
    case "tenant":
      return "テナント";
    case "contractor":
      return "工事業者";
    case "搬入業者":
      return "搬入業者";
    case "delivery":
      return "搬入業者";
    default:
      return role || "-";
  }
}

function vehicleTypeLabel(type: string | null | undefined) {
  switch (type) {
    case "truck":
      return "トラック";
    case "hiace":
      return "ハイエース";
    case "special":
      return "特殊車両";
    case "kei":
      return "軽";
    default:
      return type || "-";
  }
}

function formatPlate(vehicle: {
  plate_region?: string | null;
  plate_class?: string | null;
  plate_kana?: string | null;
  plate_number?: string | null;
}) {
  return [
    vehicle.plate_region ?? "",
    vehicle.plate_class ?? "",
    vehicle.plate_kana ?? "",
    vehicle.plate_number ?? "",
  ]
    .filter(Boolean)
    .join(" ");
}

function buildUrl(
  date: string,
  options?: {
    vehicle?: string | null;
    message?: string | null;
    error?: string | null;
  }
) {
  const params = new URLSearchParams();
  params.set("date", date);

  if (options?.vehicle) params.set("vehicle", options.vehicle);
  if (options?.message) params.set("message", options.message);
  if (options?.error) params.set("error", options.error);

  return `/vehicle-bookings?${params.toString()}`;
}

function slotDisplayName(slot: VehicleSlotRow) {
  return slot.code || slot.name || "";
}

function orderedSlots(slots: VehicleSlotRow[]) {
  const order = [
    "臨時1",
    "臨時2",
    "臨時3",
    "臨時4",
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
    "H",
    "I",
    "J",
    "K",
    "L",
    "M",
    "N",
    "O",
    "P",
    "予備1",
    "予備2",
    "予1",
    "予2",
    "予3",
    "予4",
  ];

  const map = new Map(order.map((name, index) => [name, index]));
  return [...slots].sort((a, b) => {
    const aName = slotDisplayName(a);
    const bName = slotDisplayName(b);
    const aIdx = map.has(aName) ? map.get(aName)! : 999 + (a.sort_order ?? 0);
    const bIdx = map.has(bName) ? map.get(bName)! : 999 + (b.sort_order ?? 0);
    return aIdx - bIdx;
  });
}

function addDays(dateStr: string, days: number) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function assertDateRangeOrRedirect(
  selectedDate: string,
  isAdmin: boolean,
  vehicleId?: string | null
) {
  const today = getJstToday();
  const maxDate = addDays(today, 7);

  if (!isAdmin && (selectedDate < today || selectedDate > maxDate)) {
    redirect(
      buildUrl(today, {
        vehicle: vehicleId || null,
        error: "一般ユーザーは今日から1週間先までのみ予約できます。",
      })
    );
  }
}

export default async function VehicleBookingsPage(props: {
  searchParams?: SearchParams;
}) {
  const searchParams = (await props.searchParams) ?? {};
  const selectedDate = searchParams.date || getJstToday();
  const selectedVehicleId = searchParams.vehicle || "";
  const message = searchParams.message || "";
  const error = searchParams.error || "";

  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id, company_id, role")
    .eq("user_id", user.id)
    .single<ProfileRow>();

  if (!profile) {
    redirect("/login");
  }

  const companyId = profile.company_id ?? null;
  const role = profile.role ?? "";
  const isAdmin = role === "admin";

  assertDateRangeOrRedirect(selectedDate, isAdmin, selectedVehicleId);

  async function createBookingsAction(formData: FormData) {
    "use server";

    const supabase = await supabaseServer();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id, company_id, role")
      .eq("user_id", user.id)
      .single<ProfileRow>();

    if (!profile) {
      redirect("/login");
    }

    const currentUserCompanyId = profile.company_id ?? null;
    const isAdmin = profile.role === "admin";

    const bookingDate = String(formData.get("booking_date") || "");
    const vehicleId = String(formData.get("vehicle_id") || "");
    const payloadRaw = String(formData.get("payload") || "[]");

    assertDateRangeOrRedirect(bookingDate, isAdmin, vehicleId);

    if (!bookingDate || !vehicleId) {
      redirect(
        buildUrl(bookingDate || getJstToday(), {
          vehicle: vehicleId || null,
          error: "予約に必要な情報が不足しています。",
        })
      );
    }

    let payload: CandidatePayload[] = [];
    try {
      payload = JSON.parse(payloadRaw);
    } catch {
      redirect(
        buildUrl(bookingDate, {
          vehicle: vehicleId,
          error: "予約候補の読み込みに失敗しました。",
        })
      );
    }

    if (!Array.isArray(payload) || payload.length === 0) {
      redirect(
        buildUrl(bookingDate, {
          vehicle: vehicleId,
          error: "予約候補がありません。",
        })
      );
    }

    const { data: vehicle } = await supabase
      .from("vehicles")
      .select("id, company_id")
      .eq("id", vehicleId)
      .single<{ id: string; company_id: string | null }>();

    if (!vehicle) {
      redirect(
        buildUrl(bookingDate, {
          vehicle: vehicleId,
          error: "選択した車両が見つかりません。",
        })
      );
    }

    if (!isAdmin && vehicle.company_id !== currentUserCompanyId) {
      redirect(
        buildUrl(bookingDate, {
          vehicle: vehicleId,
          error: "自社車両のみ予約できます。",
        })
      );
    }

    const targetCompanyId = isAdmin
      ? vehicle.company_id ?? null
      : currentUserCompanyId;

    if (!targetCompanyId) {
      redirect(
        buildUrl(bookingDate, {
          vehicle: vehicleId,
          error: "対象企業情報が設定されていません。",
        })
      );
    }

    const { data: targetCompany } = await supabase
      .from("companies")
      .select(`
        id,
        name,
        contact_name,
        contact_email,
        company_type,
        notes
      `)
      .eq("id", targetCompanyId)
      .single<CompanyRow>();

    if (!targetCompany) {
      redirect(
        buildUrl(bookingDate, {
          vehicle: vehicleId,
          error: "対象企業情報の取得に失敗しました。",
        })
      );
    }

    const { data: typeRule } = await supabase
      .from("company_type_reservation_rules")
      .select(`
        company_type,
        reservation_start_time,
        reservation_end_time,
        allowed_slot_codes,
        notes
      `)
      .eq("company_type", targetCompany.company_type)
      .maybeSingle<CompanyTypeRuleRow>();

    const { data: slotRows } = await supabase
      .from("vehicle_slots")
      .select("id, code, name, sort_order, is_active")
      .eq("is_active", true);

    const slotMap = new Map(
      ((slotRows ?? []) as VehicleSlotRow[]).map((slot) => [
        slot.id,
        slot.code || slot.name || "",
      ])
    );

    const insertRows: Record<string, string | null>[] = [];

    for (const item of payload) {
      const slotId = String(item.slotId || "");
      const startTime = normalizeTime(item.startTime || "");
      const endTime = normalizeTime(item.endTime || "");
      const slotCode = slotMap.get(slotId) ?? "";

      if (!slotId || !startTime || !endTime) {
        redirect(
          buildUrl(bookingDate, {
            vehicle: vehicleId,
            error: "予約候補に不正なデータがあります。",
          })
        );
      }

      if (
        typeRule?.reservation_start_time &&
        startTime < typeRule.reservation_start_time
      ) {
        redirect(
          buildUrl(bookingDate, {
            vehicle: vehicleId,
            error: `${targetCompany.company_type || "この企業種別"} は ${typeRule.reservation_start_time} より前の予約はできません。`,
          })
        );
      }

      if (
        typeRule?.reservation_end_time &&
        endTime > typeRule.reservation_end_time
      ) {
        redirect(
          buildUrl(bookingDate, {
            vehicle: vehicleId,
            error: `${targetCompany.company_type || "この企業種別"} は ${typeRule.reservation_end_time} より後の予約はできません。`,
          })
        );
      }

      if (
        typeRule?.allowed_slot_codes?.length &&
        !typeRule.allowed_slot_codes.includes(slotCode)
      ) {
        redirect(
          buildUrl(bookingDate, {
            vehicle: vehicleId,
            error: `${targetCompany.company_type || "この企業種別"} は ${slotCode} バースを予約できません。`,
          })
        );
      }

      const durationMinutes = timeToMinutes(endTime) - timeToMinutes(startTime);
      if (durationMinutes <= 0) {
        redirect(
          buildUrl(bookingDate, {
            vehicle: vehicleId,
            error: "終了時刻は開始時刻より後にしてください。",
          })
        );
      }

      if (!isAdmin && durationMinutes > 60) {
        redirect(
          buildUrl(bookingDate, {
            vehicle: vehicleId,
            error: "一般会社は1時間までしか予約できません。",
          })
        );
      }

      const { data: sameDayBookings } = await supabase
        .from("vehicle_bookings")
        .select("id, slot_id, start_time, end_time")
        .eq("booking_date", bookingDate)
        .eq("slot_id", slotId);

      const conflict = (sameDayBookings ?? []).find((b) =>
        overlaps(startTime, endTime, b.start_time, b.end_time)
      );

      if (conflict) {
        redirect(
          buildUrl(bookingDate, {
            vehicle: vehicleId,
            error: "既存予約と重複しています。",
          })
        );
      }

      const startAt = `${bookingDate}T${startTime}:00+09:00`;
      const endAt = `${bookingDate}T${endTime}:00+09:00`;

      insertRows.push({
        slot_id: slotId,
        company_id: targetCompanyId,
        vehicle_id: vehicleId,
        booking_date: bookingDate,
        start_time: startTime,
        end_time: endTime,
        start_at: startAt,
        end_at: endAt,
        status: "reserved",
        created_by: user.id,
      });
    }

    const { error } = await supabase
      .from("vehicle_bookings")
      .insert(insertRows);

    if (error) {
      redirect(
        buildUrl(bookingDate, {
          vehicle: vehicleId,
          error: `予約作成に失敗しました: ${error.message}`,
        })
      );
    }

    revalidatePath("/vehicle-bookings");
    redirect(
      buildUrl(bookingDate, {
        vehicle: vehicleId,
        message: `${insertRows.length}件の予約を作成しました。`,
      })
    );
  }

  async function deleteBookingAction(formData: FormData) {
    "use server";

    const supabase = await supabaseServer();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id, company_id, role")
      .eq("user_id", user.id)
      .single<ProfileRow>();

    if (!profile) {
      redirect("/login");
    }

    const companyId = profile.company_id ?? null;
    const isAdmin = profile.role === "admin";

    const bookingId = String(formData.get("booking_id") || "");
    const bookingDate = String(formData.get("booking_date") || getJstToday());
    const vehicleId = String(formData.get("vehicle_id") || "");

    assertDateRangeOrRedirect(bookingDate, isAdmin, vehicleId);

    if (!bookingId) {
      redirect(
        buildUrl(bookingDate, {
          vehicle: vehicleId || null,
          error: "削除対象の予約がありません。",
        })
      );
    }

    const { data: booking } = await supabase
      .from("vehicle_bookings")
      .select("id, company_id")
      .eq("id", bookingId)
      .single<{ id: string; company_id: string | null }>();

    if (!booking) {
      redirect(
        buildUrl(bookingDate, {
          vehicle: vehicleId || null,
          error: "削除対象の予約が見つかりません。",
        })
      );
    }

    if (!isAdmin && booking.company_id !== companyId) {
      redirect(
        buildUrl(bookingDate, {
          vehicle: vehicleId || null,
          error: "他社予約は削除できません。",
        })
      );
    }

    const { error } = await supabase
      .from("vehicle_bookings")
      .delete()
      .eq("id", bookingId);

    if (error) {
      redirect(
        buildUrl(bookingDate, {
          vehicle: vehicleId || null,
          error: `削除に失敗しました: ${error.message}`,
        })
      );
    }

    revalidatePath("/vehicle-bookings");
    redirect(
      buildUrl(bookingDate, {
        vehicle: vehicleId || null,
        message: "予約を削除しました。",
      })
    );
  }

  const [slotsRes, vehiclesRes, bookingsRes, companiesRes] = await Promise.all([
    supabase
      .from("vehicle_slots")
      .select("id, code, name, sort_order, is_active")
      .eq("is_active", true),

    isAdmin
      ? supabase
          .from("vehicles")
          .select(
            "id, company_id, plate_region, plate_class, plate_kana, plate_number, vehicle_type"
          )
      : supabase
          .from("vehicles")
          .select(
            "id, company_id, plate_region, plate_class, plate_kana, plate_number, vehicle_type"
          )
          .eq("company_id", companyId),

    supabase
      .from("vehicle_bookings")
      .select(
        "id, company_id, slot_id, vehicle_id, booking_date, start_time, end_time, start_at, end_at, status, created_by, created_at"
      )
      .eq("booking_date", selectedDate)
      .order("start_time", { ascending: true }),

    supabase.from("companies").select("id, name"),
  ]);

  const companies = (companiesRes.data ?? []) as CompanySimpleRow[];
  const companyMap = new Map(
    companies.map((c) => [c.id, c.name ?? "会社名未設定"])
  );

  const slots = orderedSlots((slotsRes.data ?? []) as VehicleSlotRow[]).map<GridSlot>(
    (slot) => ({
      id: slot.id,
      label: slotDisplayName(slot),
    })
  );

  const vehicles = ((vehiclesRes.data ?? []) as VehicleRow[]).map<GridVehicle>(
    (vehicle) => ({
      id: vehicle.id,
      label: formatPlate(vehicle),
      typeLabel: vehicleTypeLabel(vehicle.vehicle_type),
    })
  );

  const allBookings = ((bookingsRes.data ?? []) as VehicleBookingRow[]).map<GridBooking>(
    (booking) => {
      const mine = isAdmin || (!!companyId && booking.company_id === companyId);

      return {
        id: booking.id,
        slotId: booking.slot_id,
        vehicleId: booking.vehicle_id,
        companyId: booking.company_id,
        companyName: booking.company_id
          ? companyMap.get(booking.company_id) ?? "会社名未設定"
          : "会社名未設定",
        startTime: normalizeTime(booking.start_time),
        endTime: normalizeTime(booking.end_time),
        isMine: mine,
      };
    }
  );

  const listBookings = isAdmin
    ? allBookings
    : allBookings.filter((booking) => booking.isMine);

  const selectedVehicle =
    vehicles.find((v) => v.id === selectedVehicleId) ?? null;

  const timeLabels = generateHalfHourTimes("00:00", "24:00");
  const today = getJstToday();
  const maxDate = addDays(today, 7);

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-[1800px] px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">車室予約</h1>
              <p className="mt-1 text-sm text-slate-500">
                権限: <span className="font-medium text-slate-700">{roleLabel(role)}</span>
              </p>
            </div>

            <Link
              href="/"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              ホームへ戻る
            </Link>
          </div>
        </header>

        {message ? (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {message}
          </div>
        ) : null}

        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <BookingGridClient
          selectedDate={selectedDate}
          selectedVehicleId={selectedVehicleId}
          selectedVehicle={selectedVehicle}
          vehicles={vehicles}
          slots={slots}
          bookings={allBookings}
          listBookings={listBookings}
          timeLabels={timeLabels}
          isAdmin={isAdmin}
          today={today}
          maxDate={maxDate}
          createBookingsAction={createBookingsAction}
          deleteBookingAction={deleteBookingAction}
        />
      </div>
    </main>
  );
}