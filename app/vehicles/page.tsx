import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabaseServer";

type SearchParams = Promise<{
  edit?: string;
  message?: string;
  error?: string;
}>;

type ProfileRow = {
  user_id: string;
  company_id: string | null;
  role: string;
};

type VehicleRow = {
  id: string;
  company_id: string | null;
  plate_region: string;
  plate_class: string;
  plate_kana: string;
  plate_number: string;
  vehicle_name: string | null;
  vehicle_type: string | null;
};

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
    default:
      return role || "-";
  }
}

function buildUrl(options?: {
  edit?: string | null;
  message?: string | null;
  error?: string | null;
}) {
  const params = new URLSearchParams();

  if (options?.edit) params.set("edit", options.edit);
  if (options?.message) params.set("message", options.message);
  if (options?.error) params.set("error", options.error);

  const qs = params.toString();
  return qs ? `/vehicles?${qs}` : "/vehicles";
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

export default async function VehiclesPage(props: {
  searchParams?: SearchParams;
}) {
  const searchParams = (await props.searchParams) ?? {};
  const editId = searchParams.edit || "";
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

  async function saveVehicle(formData: FormData) {
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

    const vehicleId = String(formData.get("vehicle_id") || "");
    const region = String(formData.get("region") || "").trim();
    const plateClass = String(formData.get("plate_class") || "").trim();
    const kana = String(formData.get("kana") || "").trim();
    const plateNumber = String(formData.get("plate_number") || "").trim();
    const vehicleName = String(formData.get("vehicle_name") || "").trim();
    const vehicleType = String(formData.get("vehicle_type") || "").trim();

    if (!region || !plateClass || !kana || !plateNumber || !vehicleType) {
      redirect(
        buildUrl({
          error: "ナンバー4項目と車種は必須です。",
          edit: vehicleId || null,
        })
      );
    }

    if (!/^\d{3}$/.test(plateClass)) {
      redirect(
        buildUrl({
          error: "分類番号は3桁の数字で入力してください。",
          edit: vehicleId || null,
        })
      );
    }

    if (!/^[ぁ-ん]$/.test(kana)) {
      redirect(
        buildUrl({
          error: "ひらがなは1文字で入力してください。",
          edit: vehicleId || null,
        })
      );
    }

    if (!/^\d{4}$/.test(plateNumber)) {
      redirect(
        buildUrl({
          error: "一連指定番号は4桁の数字で入力してください。",
          edit: vehicleId || null,
        })
      );
    }

    const validTypes = ["truck", "hiace", "special", "kei"];
    if (!validTypes.includes(vehicleType)) {
      redirect(
        buildUrl({
          error: "車種が不正です。",
          edit: vehicleId || null,
        })
      );
    }

    if (!companyId && !isAdmin) {
      redirect(
        buildUrl({
          error: "company_id が設定されていないため登録できません。",
          edit: vehicleId || null,
        })
      );
    }

    if (vehicleId) {
      const { data: currentVehicle } = await supabase
        .from("vehicles")
        .select("id, company_id")
        .eq("id", vehicleId)
        .single<{ id: string; company_id: string | null }>();

      if (!currentVehicle) {
        redirect(
          buildUrl({
            error: "編集対象の車両が見つかりません。",
          })
        );
      }

      if (!isAdmin && currentVehicle.company_id !== companyId) {
        redirect(
          buildUrl({
            error: "他社車両は編集できません。",
          })
        );
      }

      const { error } = await supabase
        .from("vehicles")
        .update({
          plate_region: region,
          plate_class: plateClass,
          plate_kana: kana,
          plate_number: plateNumber,
          vehicle_name: vehicleName || null,
          vehicle_type: vehicleType,
        })
        .eq("id", vehicleId);

      if (error) {
        redirect(
          buildUrl({
            error: `更新に失敗しました: ${error.message}`,
            edit: vehicleId,
          })
        );
      }

      revalidatePath("/vehicles");
      revalidatePath("/vehicle-bookings");
      redirect(
        buildUrl({
          message: "車両情報を更新しました。",
        })
      );
    }

    const { error } = await supabase.from("vehicles").insert({
      company_id: companyId,
      plate_region: region,
      plate_class: plateClass,
      plate_kana: kana,
      plate_number: plateNumber,
      vehicle_name: vehicleName || null,
      vehicle_type: vehicleType,
    });

    if (error) {
      redirect(
        buildUrl({
          error: `登録に失敗しました: ${error.message}`,
        })
      );
    }

    revalidatePath("/vehicles");
    revalidatePath("/vehicle-bookings");
    redirect(
      buildUrl({
        message: "車両を登録しました。",
      })
    );
  }

  async function deleteVehicle(formData: FormData) {
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

    const vehicleId = String(formData.get("vehicle_id") || "");

    if (!vehicleId) {
      redirect(
        buildUrl({
          error: "削除対象の車両がありません。",
        })
      );
    }

    const { data: currentVehicle } = await supabase
      .from("vehicles")
      .select("id, company_id")
      .eq("id", vehicleId)
      .single<{ id: string; company_id: string | null }>();

    if (!currentVehicle) {
      redirect(
        buildUrl({
          error: "削除対象の車両が見つかりません。",
        })
      );
    }

    if (!isAdmin && currentVehicle.company_id !== companyId) {
      redirect(
        buildUrl({
          error: "他社車両は削除できません。",
        })
      );
    }

    const { data: bookingUsingVehicle } = await supabase
      .from("vehicle_bookings")
      .select("id")
      .eq("vehicle_id", vehicleId)
      .limit(1);

    if ((bookingUsingVehicle ?? []).length > 0) {
      redirect(
        buildUrl({
          error: "この車両は予約で使用中のため削除できません。",
        })
      );
    }

    const { error } = await supabase
      .from("vehicles")
      .delete()
      .eq("id", vehicleId);

    if (error) {
      redirect(
        buildUrl({
          error: `削除に失敗しました: ${error.message}`,
        })
      );
    }

    revalidatePath("/vehicles");
    revalidatePath("/vehicle-bookings");
    redirect(
      buildUrl({
        message: "車両を削除しました。",
      })
    );
  }

  const vehiclesQuery = isAdmin
    ? supabase
        .from("vehicles")
        .select(
          "id, company_id, plate_region, plate_class, plate_kana, plate_number, vehicle_name, vehicle_type"
        )
        .order("plate_region", { ascending: true })
        .order("plate_class", { ascending: true })
        .order("plate_number", { ascending: true })
    : supabase
        .from("vehicles")
        .select(
          "id, company_id, plate_region, plate_class, plate_kana, plate_number, vehicle_name, vehicle_type"
        )
        .eq("company_id", companyId)
        .order("plate_region", { ascending: true })
        .order("plate_class", { ascending: true })
        .order("plate_number", { ascending: true });

  const { data: vehiclesData } = await vehiclesQuery;
  const vehicles = (vehiclesData ?? []) as VehicleRow[];

  const editingVehicle = vehicles.find((v) => v.id === editId) ?? null;

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">車両登録</h1>
              <p className="mt-1 text-sm text-slate-500">
                権限: <span className="font-medium text-slate-700">{roleLabel(role)}</span>
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/"
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                ホームへ戻る
              </Link>
              <Link
                href="/vehicle-bookings"
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
              >
                予約画面へ
              </Link>
            </div>
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

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="xl:col-span-1 rounded-2xl bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">
                {editingVehicle ? "車両編集" : "新規車両登録"}
              </h2>

              {editingVehicle ? (
                <Link
                  href="/vehicles"
                  className="text-sm font-medium text-slate-600 hover:text-slate-900"
                >
                  編集をキャンセル
                </Link>
              ) : null}
            </div>

            <form action={saveVehicle} className="space-y-4">
              <input
                type="hidden"
                name="vehicle_id"
                defaultValue={editingVehicle?.id ?? ""}
              />

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  ナンバー
                </label>

                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-4">
                    <input
                      type="text"
                      name="region"
                      placeholder="地名"
                      defaultValue={editingVehicle?.plate_region ?? ""}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                    />
                  </div>

                  <div className="col-span-3">
                    <input
                      type="text"
                      name="plate_class"
                      inputMode="numeric"
                      maxLength={3}
                      placeholder="300"
                      defaultValue={editingVehicle?.plate_class ?? ""}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                    />
                  </div>

                  <div className="col-span-2">
                    <input
                      type="text"
                      name="kana"
                      maxLength={1}
                      placeholder="あ"
                      defaultValue={editingVehicle?.plate_kana ?? ""}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-center text-sm outline-none focus:border-slate-500"
                    />
                  </div>

                  <div className="col-span-3">
                    <input
                      type="text"
                      name="plate_number"
                      inputMode="numeric"
                      maxLength={4}
                      placeholder="1234"
                      defaultValue={editingVehicle?.plate_number ?? ""}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  車種
                </label>
                <select
                  name="vehicle_type"
                  defaultValue={editingVehicle?.vehicle_type ?? "truck"}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                >
                  <option value="truck">トラック</option>
                  <option value="hiace">ハイエース</option>
                  <option value="special">特殊車両</option>
                  <option value="kei">軽</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700"
              >
                {editingVehicle ? "車両情報を更新する" : "車両を登録する"}
              </button>
            </form>
          </div>

          <div className="xl:col-span-2 rounded-2xl bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">登録済み車両一覧</h2>
              <span className="text-sm text-slate-500">{vehicles.length} 件</span>
            </div>

            {vehicles.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
                まだ車両が登録されていません。
              </div>
            ) : (
              <div className="space-y-3">
                {vehicles.map((vehicle) => (
                  <div
                    key={vehicle.id}
                    className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div>
                      <div className="text-base font-semibold text-slate-900">
                        {formatPlate(vehicle)}
                      </div>
                      <div className="mt-1 text-sm text-slate-600">
                        {vehicleTypeLabel(vehicle.vehicle_type)}
                        {vehicle.vehicle_name ? ` / ${vehicle.vehicle_name}` : ""}
                      </div>
                      {isAdmin ? (
                        <div className="mt-1 text-xs text-slate-500">
                          company_id: {vehicle.company_id ?? "-"}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={buildUrl({ edit: vehicle.id })}
                        className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        編集
                      </Link>

                      <form action={deleteVehicle}>
                        <input type="hidden" name="vehicle_id" value={vehicle.id} />
                        <button
                          type="submit"
                          className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
                        >
                          削除
                        </button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}