import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabaseServer";

type ProfileRow = {
  user_id: string;
  company_id: string | null;
  role: string | null;
};

type CompanyRow = {
  id: string;
  name: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  company_type: string | null;
};

const COMPANY_TYPE_OPTIONS = [
  { value: "tenant", label: "テナント" },
  { value: "contractor", label: "工事業者" },
  { value: "delivery", label: "搬入業者" },
  { value: "operator", label: "テナント" },
  { value: "admin_company", label: "管理会社" },
];

function normalizeText(value: FormDataEntryValue | null) {
  const text = String(value || "").trim();
  return text.length ? text : null;
}

async function updateCompanyDetailAction(formData: FormData) {
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

  const companyId = String(formData.get("company_id") || "").trim();
  if (!companyId) {
    redirect("/companies");
  }

  const payload = {
    name: normalizeText(formData.get("name")),
    contact_name: normalizeText(formData.get("contact_name")),
    contact_email: normalizeText(formData.get("contact_email")),
    contact_phone: normalizeText(formData.get("contact_phone")),
    company_type: normalizeText(formData.get("company_type")),
  };

  const { error } = await supabase
    .from("companies")
    .update(payload)
    .eq("id", companyId);

  if (error) {
    redirect(`/companies/${companyId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/companies");
  revalidatePath(`/companies/${companyId}`);
  revalidatePath("/vehicle-bookings");
  revalidatePath("/my-company");
  redirect(`/companies/${companyId}?message=企業情報を保存しました。`);
}

type SearchParams = Promise<{
  message?: string;
  error?: string;
}>;

export default async function CompanyDetailPage(props: {
  params: Promise<{ id: string }>;
  searchParams?: SearchParams;
}) {
  const params = await props.params;
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

  const { data: company } = await supabase
    .from("companies")
    .select(`
      id,
      name,
      contact_name,
      contact_email,
      contact_phone,
      company_type
    `)
    .eq("id", params.id)
    .single<CompanyRow>();

  if (!company) {
    redirect("/companies");
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-[900px] px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">企業情報編集</h1>
              <p className="mt-1 text-sm text-slate-500">
                企業名をクリックした先で編集し、保存できます。
              </p>
            </div>

            <Link
              href="/companies"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              一覧へ戻る
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

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <form action={updateCompanyDetailAction} className="space-y-4">
            <input type="hidden" name="company_id" value={company.id} />

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                企業名
              </label>
              <input
                type="text"
                name="name"
                defaultValue={company.name ?? ""}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                担当者名
              </label>
              <input
                type="text"
                name="contact_name"
                defaultValue={company.contact_name ?? ""}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                連絡先メール
              </label>
              <input
                type="email"
                name="contact_email"
                defaultValue={company.contact_email ?? ""}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                電話番号
              </label>
              <input
                type="text"
                name="contact_phone"
                defaultValue={company.contact_phone ?? ""}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                企業種別
              </label>
              <select
                name="company_type"
                defaultValue={company.company_type ?? ""}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
              >
                <option value="">未設定</option>
                {COMPANY_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
              >
                保存
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}