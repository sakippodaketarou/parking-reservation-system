import Link from "next/link";
import { redirect } from "next/navigation";
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

type SearchParams = Promise<{
  q?: string;
}>;

function companyTypeLabel(value: string | null | undefined) {
  switch (value) {
    case "tenant":
      return "テナント";
    case "contractor":
      return "工事業者";
    case "delivery":
      return "搬入業者";
    case "operator":
      return "テナント";
    case "admin_company":
      return "管理会社";
    default:
      return value || "-";
  }
}

function normalizeSearchText(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[ 　]/g, "");
}

export default async function CompaniesPage(props: {
  searchParams?: SearchParams;
}) {
  const searchParams = (await props.searchParams) ?? {};
  const q = searchParams.q ?? "";

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

  const { data: companies, error } = await supabase
    .from("companies")
    .select(`
      id,
      name,
      contact_name,
      contact_email,
      contact_phone,
      company_type
    `)
    .order("name", { ascending: true });

  const allRows = (companies ?? []) as CompanyRow[];
  const normalizedQuery = normalizeSearchText(q);

  const rows = !normalizedQuery
    ? allRows
    : allRows.filter((company) => {
        const target = normalizeSearchText(
          [
            company.name,
            company.contact_email,
            company.contact_phone,
            companyTypeLabel(company.company_type),
          ].filter(Boolean).join(" ")
        );
        return target.includes(normalizedQuery);
      });

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-[1300px] px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">登録企業一覧</h1>
              <p className="mt-1 text-sm text-slate-500">
                企業検索と企業情報の編集ができます。
              </p>
            </div>

            <div className="flex gap-3">
              <Link
                href="/company-type-rules"
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                企業種別ルール設定
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

        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error.message}
          </div>
        ) : null}

        <section className="mb-4 rounded-2xl bg-white p-5 shadow-sm">
          <form className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="企業名・メール・電話番号・企業種別で検索"
              className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-slate-500"
            />
            <button
              type="submit"
              className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700"
            >
              検索
            </button>
            <Link
              href="/companies"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              クリア
            </Link>
          </form>
        </section>

        <section className="rounded-2xl bg-white p-3 shadow-sm">
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="grid grid-cols-[2fr_2fr_1.4fr_1.2fr] gap-3 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
              <div>企業名</div>
              <div>メール</div>
              <div>電話番号</div>
              <div>企業種別</div>
            </div>

            {rows.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500">
                該当する企業がありません。
              </div>
            ) : (
              rows.map((company) => (
                <Link
                  key={company.id}
                  href={`/companies/${company.id}`}
                  className="grid grid-cols-[2fr_2fr_1.4fr_1.2fr] gap-3 border-t border-slate-100 px-4 py-4 text-sm text-slate-700 transition hover:bg-slate-50"
                >
                  <div className="font-medium text-slate-900">
                    {company.name || "-"}
                  </div>
                  <div className="truncate">{company.contact_email || "-"}</div>
                  <div>{company.contact_phone || "-"}</div>
                  <div>{companyTypeLabel(company.company_type)}</div>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}