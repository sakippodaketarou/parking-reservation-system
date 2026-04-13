import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  deleteReservation,
  updateReservation,
} from "@/app/actions/reservationActions";
import ReservationComposer from "@/app/components/reservations/ReservationComposer";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

function toJstDate(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function toJstTime(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export default async function EditReservationPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("user_id, company_id, role")
    .eq("user_id", user.id)
    .single();

  if (profileError || !profile?.company_id) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-3xl rounded-[28px] bg-white p-8 shadow-sm">
          <p className="text-red-600">プロフィール情報の取得に失敗しました。</p>
        </div>
      </main>
    );
  }

  const { data: booking, error: bookingError } = await supabase
    .from("vehicle_bookings")
    .select("id, vehicle_id, slot_id, company_id, start_at, end_at")
    .eq("id", id)
    .single();

  if (bookingError || !booking) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-3xl rounded-[28px] bg-white p-8 shadow-sm">
          <p className="text-red-600">対象の予約が見つかりません。</p>
        </div>
      </main>
    );
  }

  const canEdit =
    profile.role === "admin" || booking.company_id === profile.company_id;

  if (!canEdit) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-3xl rounded-[28px] bg-white p-8 shadow-sm">
          <p className="text-red-600">自社予約のみ編集できます。</p>
        </div>
      </main>
    );
  }

  const vehicleQuery = supabase
    .from("vehicles")
    .select("id, company_id, plate_region, plate_class, plate_kana, plate_number, vehicle_type, is_active, created_at")
    .eq("is_active", true);

  const [vehiclesRes, slotsRes] = await Promise.all([
    profile.role === "admin"
      ? vehicleQuery.order("created_at", { ascending: false })
      : vehicleQuery.eq("company_id", profile.company_id).order("created_at", { ascending: false }),

    supabase
      .from("parking_slots")
      .select("id, slot_name, slot_number")
      .eq("is_active", true)
      .order("slot_number", { ascending: true }),
  ]);

  if (vehiclesRes.error || slotsRes.error) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-3xl rounded-[28px] bg-white p-8 shadow-sm">
          <p className="text-red-600">編集画面の初期データ取得に失敗しました。</p>
        </div>
      </main>
    );
  }

  const vehicles = vehiclesRes.data ?? [];
  const slots = slotsRes.data ?? [];

  return (
    <ReservationComposer
      title="予約編集"
      submitLabel="更新する"
      action={updateReservation}
      vehicles={vehicles}
      slots={slots}
      defaultValues={{
        reservation_id: booking.id,
        vehicle_id: booking.vehicle_id ?? "",
        slot_id: booking.slot_id,
        reservation_date: toJstDate(booking.start_at),
        start_time: toJstTime(booking.start_at),
        end_time: toJstTime(booking.end_at),
      }}
      deleteSection={
        <form action={deleteReservation}>
          <input type="hidden" name="reservation_id" value={booking.id} />
          <button
            type="submit"
            className="rounded-full bg-red-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 active:translate-y-[1px] active:scale-[0.99]"
          >
            この予約を削除
          </button>
        </form>
      }
    />
  );
}