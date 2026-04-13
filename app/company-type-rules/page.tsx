import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabaseServer";

type ProfileRow = {
  user_id: string;
  company_id: string | null;
  role: string | null;
};

type RuleRow = {
  company_type: string;
  reservation_start_time: string | null;
  reservation_end_time: string | null;
  allowed_slot_codes: string[] | null;
  notes: string | null;
};

type SearchParams = Promise<{
  message?: string;
  error?: string;
}>;

const COMPANY_TYPE_OPTIONS = [
  { value: "tenant", label: "テナント" },
  { value: "contractor", label: "工事業者" },
  { value: "delivery", label: "搬入業者" },
  { value: "operator", label: "運営" },
  { value: "admin_company", label: "管理会社" },
];

function companyTypeLabel(value: string | null | undefined) {
  switch (value) {
    case "tenant":
      return "テナント";
    case "contractor":
      return "工事業者";
    case "delivery":
      return "搬入業者";
    case "operator":
      return "運営";
    case "admin_company":
      return "管理会社";
    default:
      return value || "-";
  }
}

function normalizeText(value: FormDataEntryValue | null) {
  const text = String(value || "").trim();
  return text.length ? text : null;
}

function normalizeSlotCodes(value: FormDataEntryValue | null) {
  const text = String(value || "").trim();
  if (!text) return null;

  const codes = text
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

  return codes.length ? codes : null;
}

async function saveRuleAction(formData: FormData) {
  "use server";

  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id, company_id, role")
    .eq("user_id", user.id)
    .single<ProfileRow>();

  if (!profile || profile.role !== "admin") {
    redirect("/");
  }

  const companyType = String(formData.get("company_type") || "").trim();

  if (!companyType) {
    redirect("/company-type-rules?error=企業種別を指定してください。");
  }

  const payload = {
    company_type: companyType,
    reservation_start_time: normalizeText(formData.get("reservation_start_time")),
    reservation_end_time: normalizeText(formData.get("reservation_end_time")),
    allowed_slot_codes: normalizeSlotCodes(formData.get("allowed_slot_codes")),
    notes: normalizeText(formData.get("notes")),
  };

  const { error } = await supabase
    .from("company_type_reservation_rules")
    .upsert(payload, { onConflict: "company_type" });

  if (error) {
    redirect(`/company-type-rules?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/company-type-rules");
  revalidatePath("/companies");
  revalidatePath("/vehicle-bookings");
  redirect("/company-type-rules?message=企業種別ルールを保存しました。");
}

export default async function CompanyTypeRulesPage(props: {
  searchParams?: SearchParams;
}) {
  const searchParams = (await props.searchParams) ?? {};
  const message = searchParams.message || "";
  const error = searchParams.error || "";

  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id, company_id, role")
    .eq("user_id", user.id)
    .single<ProfileRow>();

  if (!profile || profile.role !== "admin") {
    redirect("/");
  }

  const { data: rules } = await supabase
    .from("company_type_reservation_rules")
    .select(`
      company_type,
      reservation_start_time,
      reservation_end_time,
      allowed_slot_codes,
      notes
    `)
    .order("company_type", { ascending: true });

  const ruleMap = new Map(
    ((rules ?? []) as RuleRow[]).map((rule) => [rule.company_type, rule])
  );

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">企業種別ルール設定</h1>
              <p className="mt-1 text-sm text-slate-500">
                企業種別ごとの予約可能時間帯・利用可能バースを設定できます。
              </p>
            </div>

            <div className="flex gap-3">
              <Link
                href="/companies"
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                企業一覧へ
              </Link>
              <Link
                href="/"
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                ホームへ戻る
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

        <div className="space-y-6">
          {COMPANY_TYPE_OPTIONS.map((option) => {
            const rule = ruleMap.get(option.value);

            return (
              <section
                key={option.value}
                className="rounded-2xl bg-white p-5 shadow-sm"
              >
                <div className="mb-4">
                  <h2 className="text-lg font-bold text-slate-900">
                    {option.label}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    企業種別コード: {option.value}
                  </p>
                </div>

                <form action={saveRuleAction} className="grid gap-4 md:grid-cols-2">
                  <input type="hidden" name="company_type" value={option.value} />

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      予約可能開始時刻
                    </label>
                    <input
                      type="text"
                      name="reservation_start_time"
                      defaultValue={rule?.reservation_start_time ?? ""}
                      placeholder="例: 09:00"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      予約可能終了時刻
                    </label>
                    <input
                      type="text"
                      name="reservation_end_time"
                      defaultValue={rule?.reservation_end_time ?? ""}
                      placeholder="例: 18:00"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      利用可能バース
                    </label>
                    <input
                      type="text"
                      name="allowed_slot_codes"
                      defaultValue={rule?.allowed_slot_codes?.join(", ") ?? ""}
                      placeholder="例: A, B, C, D, E, F, G"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      カンマ区切りで入力。空欄なら制限なし。
                    </p>
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      備考
                    </label>
                    <textarea
                      name="notes"
                      defaultValue={rule?.notes ?? ""}
                      rows={3}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                    />
                  </div>

                  <div className="md:col-span-2 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    <span>
                      現在の設定:
                      {" "}
                      {rule?.reservation_start_time && rule?.reservation_end_time
                        ? `${rule.reservation_start_time} ～ ${rule.reservation_end_time}`
                        : "時間制限なし"}
                      {" / "}
                      {rule?.allowed_slot_codes?.length
                        ? rule.allowed_slot_codes.join(", ")
                        : "バース制限なし"}
                    </span>

                    <button
                      type="submit"
                      className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
                    >
                      保存
                    </button>
                  </div>
                </form>
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}