import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deleteVehicle, updateVehicle } from "@/app/actions/vehicleActions";
import VehicleForm from "@/app/components/vehicles/VehicleForm";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditVehiclePage({ params }: PageProps) {
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
    .select("user_id, company_id, company_name, role")
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

  const { data: vehicle, error: vehicleError } = await supabase
    .from("vehicles")
    .select("id, company_id, plate_region, plate_class, plate_kana, plate_number, vehicle_type, note, is_active")
    .eq("id", id)
    .single();

  if (vehicleError || !vehicle) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-3xl rounded-[28px] bg-white p-8 shadow-sm">
          <p className="text-red-600">対象車両が見つかりません。</p>
        </div>
      </main>
    );
  }

  const canEdit =
    profile.role === "admin" || vehicle.company_id === profile.company_id;

  if (!canEdit) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-3xl rounded-[28px] bg-white p-8 shadow-sm">
          <p className="text-red-600">自社車両のみ編集できます。</p>
        </div>
      </main>
    );
  }

  return (
    <VehicleForm
      title="車両編集"
      submitLabel="更新する"
      action={updateVehicle}
      companyName={profile.company_name ?? "会社名未設定"}
      defaultValues={{
        id: vehicle.id,
        plate_region: vehicle.plate_region,
        plate_class: vehicle.plate_class,
        plate_kana: vehicle.plate_kana,
        plate_number: vehicle.plate_number,
        vehicle_type: vehicle.vehicle_type ?? "",
        note: vehicle.note ?? "",
        is_active: vehicle.is_active,
      }}
      deleteSection={
        <form action={deleteVehicle}>
          <input type="hidden" name="vehicle_id" value={vehicle.id} />
          <button
            type="submit"
            className="rounded-full bg-red-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 active:translate-y-[1px] active:scale-[0.99]"
          >
            この車両を削除
          </button>
        </form>
      }
    />
  );
}