import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabaseServer";

type ProfileRow = {
  user_id: string;
  company_id: string | null;
  role: string | null;
};

type CompanyUserRow = {
  id: string;
  company_id: string | null;
  name: string | null;
  email: string;
  role: string | null;
  is_active: boolean | null;
  created_at: string | null;
};

function roleLabel(role: string | null | undefined) {
  switch (role) {
    case "admin":
      return "管理者";
    case "tenant":
      return "テナント";
    case "contractor":
      return "工事業者";
    case "搬入業者":
      return "搬入業者";
    case "user":
      return "一般";
    default:
      return role || "-";
  }
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleString("ja-JP");
}

export default async function CompanyUsersPage({
  searchParams,
}: {
  searchParams?: Promise<{
    message?: string;
    error?: string;
  }>;
}) {
  const params = (await searchParams) ?? {};
  const message = params.message || "";
  const error = params.error || "";

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

  if (!profile || !profile.company_id) {
    redirect("/");
  }

  async function createCompanyUserAction(formData: FormData) {
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

    if (!profile || !profile.company_id) {
      redirect("/company_users?error=会社情報が取得できませんでした。");
    }

    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const role = String(formData.get("role") || "user").trim();

    if (!name || !email) {
      redirect("/company_users?error=氏名とメールアドレスは必須です。");
    }

    const allowedRoles =
      profile.role === "admin"
        ? ["user", "admin"]
        : ["user"];

    const safeRole = allowedRoles.includes(role) ? role : "user";

    const { error } = await supabase.from("company_users").insert({
      company_id: profile.company_id,
      name,
      email,
      role: safeRole,
      is_active: true,
    });

    if (error) {
      redirect(`/company_users?error=${encodeURIComponent(`登録に失敗しました: ${error.message}`)}`);
    }

    revalidatePath("/company_users");
    redirect("/company_users?message=社内ユーザーを追加しました。");
  }

  async function deleteCompanyUserAction(formData: FormData) {
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

    if (!profile || !profile.company_id) {
      redirect("/company_users?error=会社情報が取得できませんでした。");
    }

    const rowId = String(formData.get("row_id") || "");
    if (!rowId) {
      redirect("/company_users?error=削除対象が見つかりません。");
    }

    const { data: row } = await supabase
      .from("company_users")
      .select("id, company_id")
      .eq("id", rowId)
      .single<{ id: string; company_id: string | null }>();

    if (!row || row.company_id !== profile.company_id) {
      redirect("/company_users?error=他社ユーザーは削除できません。");
    }

    const { error } = await supabase.from("company_users").delete().eq("id", rowId);

    if (error) {
      redirect(`/company_users?error=${encodeURIComponent(`削除に失敗しました: ${error.message}`)}`);
    }

    revalidatePath("/company_users");
    redirect("/company_users?message=社内ユーザーを削除しました。");
  }

  const { data: companyUsers } = await supabase
    .from("company_users")
    .select("id, company_id, name, email, role, is_active, created_at")
    .eq("company_id", profile.company_id)
    .order("created_at", { ascending: false });

  const rows = (companyUsers ?? []) as CompanyUserRow[];

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">社内ユーザー追加</h1>
              <p className="mt-1 text-sm text-slate-500">
                同じ会社に属する社内ユーザーを登録・管理します。
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

        <section className="mb-6 rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-slate-900">新規追加</h2>

          <form action={createCompanyUserAction} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <input
              type="text"
              name="name"
              placeholder="氏名"
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />

            <input
              type="email"
              name="email"
              placeholder="メールアドレス"
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />

            <select
              name="role"
              defaultValue="user"
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            >
              <option value="user">一般</option>
              {profile.role === "admin" ? <option value="admin">管理者</option> : null}
            </select>

            <button
              type="submit"
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              追加する
            </button>
          </form>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">社内ユーザー一覧</h2>
            <span className="text-sm text-slate-500">{rows.length} 件</span>
          </div>

          {rows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
              まだ社内ユーザーは登録されていません。
            </div>
          ) : (
            <div className="space-y-3">
              {rows.map((row) => (
                <div
                  key={row.id}
                  className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      {row.name || "名前未設定"}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">メール: {row.email}</div>
                    <div className="text-xs text-slate-500">権限: {roleLabel(row.role)}</div>
                    <div className="text-xs text-slate-500">登録日時: {formatDate(row.created_at)}</div>
                  </div>

                  <form action={deleteCompanyUserAction}>
                    <input type="hidden" name="row_id" value={row.id} />
                    <button
                      type="submit"
                      className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
                    >
                      削除
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}