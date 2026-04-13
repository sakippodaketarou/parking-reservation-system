import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createVehicle } from "@/app/actions/vehicleActions";
import VehicleForm from "@/app/components/vehicles/VehicleForm";

export default async function NewVehiclePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("user_id, company_name")
    .eq("user_id", user.id)
    .single();

  if (profileError || !profile) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-3xl rounded-[28px] bg-white p-8 shadow-sm">
          <p className="text-red-600">プロフィール情報の取得に失敗しました。</p>
        </div>
      </main>
    );
  }

  return (
    <VehicleForm
      title="車両新規登録"
      submitLabel="登録する"
      action={createVehicle}
      companyName={profile.company_name ?? "会社名未設定"}
      defaultValues={{
        is_active: true,
      }}
    />
  );
}