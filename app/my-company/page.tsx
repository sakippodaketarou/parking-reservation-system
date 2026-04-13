import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabaseServer";

type ProfileRow = {
  user_id: string;
  company_id: string | null;
  role: string | null;
  email: string | null;
  full_name: string | null;
};

type CompanyRow = {
  id: string;
  name: string | null;
  contact_name: string | null;
  contact_email: string | null;
  company_type: string | null;
  reservation_start_time: string | null;
  reservation_end_time: string | null;
  allowed_slot_codes: string[] | null;
  notes: string | null;
};

type SearchParams = Promise<{
  message?: string;
  error?: string;
}>;

function companyTypeLabel(value: string | null | undefined) {
  switch (value) {
    case "tenant":
      return "テナント";
    case "contractor":
      return "工事業者";
    case "delivery":
      return "搬入業者";
    case "admin_company":
      return "管理会社";
    default:
      return value || "-";
  }
}

async function updateMyCompanyInfo(formData: FormData) {
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
    .single<{ user_id: string; company_id: string | null; role: string | null }>();

  if (!profile?.company_id) {
    redirect("/my-company?error=自社情報の更新対象が見つかりません。");
  }

  const payload = {
    contact_name: String(formData.get("contact_name") || "").trim() || null,
    contact_email: String(formData.get("contact_email") || "").trim() || null,
    notes: String(formData.get("notes") || "").trim() || null,
  };

  const { error } = await supabase
    .from("companies")
    .update(payload)
    .eq("id", profile.company_id);

  if (error) {
    redirect(`/my-company?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/my-company");
  redirect("/my-company?message=自社情報を更新しました。");
}

async function updateLoginEmailAction(formData: FormData) {
  "use server";

  const supabase = await supabaseServer();

  const email = String(formData.get("email") || "").trim();
  if (!email) {
    redirect("/my-company?error=新しいメールアドレスを入力してください。");
  }

  const { error } = await supabase.auth.updateUser({ email });

  if (error) {
    redirect(`/my-company?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/my-company");
  redirect("/my-company?message=メールアドレス変更処理を受け付けました。確認メールを確認してください。");
}

async function updatePasswordAction(formData: FormData) {
  "use server";

  const supabase = await supabaseServer();

  const password = String(formData.get("password") || "");
  const passwordConfirm = String(formData.get("password_confirm") || "");

  if (password.length < 8) {
    redirect("/my-company?error=パスワードは8文字以上で入力してください。");
  }

  if (password !== passwordConfirm) {
    redirect("/my-company?error=確認用パスワードが一致しません。");
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirect(`/my-company?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/my-company");
  redirect("/my-company?message=パスワードを変更しました。");
}

export default async function MyCompanyPage(props: { searchParams?: SearchParams }) {
  const searchParams = (await props.searchParams) ?? {};
  const message = searchParams.message || "";
  const error = searchParams.error || "";

  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("user_id, company_id, role, email, full_name")
    .eq("user_id", user.id)
    .single<ProfileRow>();

  if (!myProfile?.company_id) redirect("/");

  const { data: company } = await supabase
    .from("companies")
    .select(`
      id,
      name,
      contact_name,
      contact_email,
      company_type,
      reservation_start_time,
      reservation_end_time,
      allowed_slot_codes,
      notes
    `)
    .eq("id", myProfile.company_id)
    .single<CompanyRow>();

  const { data: companyUsers } = await supabase
    .from("profiles")
    .select("user_id, company_id, role, email, full_name")
    .eq("company_id", myProfile.company_id)
    .order("full_name", { ascending: true });

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">自社情報</h1>
              <p className="mt-1 text-sm text-slate-500">
                会社情報・社内ユーザー・アカウント設定を確認できます。
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

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">会社情報</h2>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Info label="会社名" value={company?.name} />
              <Info label="企業種別" value={companyTypeLabel(company?.company_type)} />
              <Info
                label="予約可能時間"
                value={
                  company?.reservation_start_time && company?.reservation_end_time
                    ? `${company.reservation_start_time} ～ ${company.reservation_end_time}`
                    : "制限なし"
                }
              />
              <Info
                label="利用可能バース"
                value={
                  company?.allowed_slot_codes?.length
                    ? company.allowed_slot_codes.join(", ")
                    : "制限なし"
                }
              />
            </div>

            <form action={updateMyCompanyInfo} className="mt-6 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  担当者名
                </label>
                <input
                  type="text"
                  name="contact_name"
                  defaultValue={company?.contact_name ?? ""}
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
                  defaultValue={company?.contact_email ?? ""}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  備考
                </label>
                <textarea
                  name="notes"
                  defaultValue={company?.notes ?? ""}
                  rows={4}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                />
              </div>

              <button
                type="submit"
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
              >
                自社情報を更新
              </button>
            </form>
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">ログイン設定</h2>
            <p className="mt-1 text-sm text-slate-500">
              現在のログインメール: {user.email || "-"}
            </p>

            <form action={updateLoginEmailAction} className="mt-5 space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  新しいメールアドレス
                </label>
                <input
                  type="email"
                  name="email"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                  placeholder="example@company.co.jp"
                  required
                />
              </div>

              <button
                type="submit"
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
              >
                メールアドレスを変更
              </button>
            </form>

            <div className="mt-8 border-t border-slate-200 pt-6">
              <h3 className="text-base font-bold text-slate-900">パスワード変更</h3>

              <form action={updatePasswordAction} className="mt-4 space-y-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    新しいパスワード
                  </label>
                  <input
                    type="password"
                    name="password"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    新しいパスワード（確認）
                  </label>
                  <input
                    type="password"
                    name="password_confirm"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
                >
                  パスワードを変更
                </button>
              </form>
            </div>
          </section>
        </div>

        <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">社内ユーザー</h2>
          <p className="mt-1 text-sm text-slate-500">
            自社に所属するユーザー一覧です。
          </p>

          <div className="mt-4 overflow-auto">
            <table className="min-w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-slate-700">
                  <th className="border-b border-slate-200 px-4 py-3">氏名</th>
                  <th className="border-b border-slate-200 px-4 py-3">メール</th>
                  <th className="border-b border-slate-200 px-4 py-3">権限</th>
                </tr>
              </thead>
              <tbody>
                {(companyUsers ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                      社内ユーザーはありません。
                    </td>
                  </tr>
                ) : (
                  (companyUsers ?? []).map((member) => (
                    <tr key={member.user_id}>
                      <td className="border-b border-slate-100 px-4 py-4 text-slate-900">
                        {member.full_name || "-"}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-4 text-slate-600">
                        {member.email || "-"}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-4 text-slate-600">
                        {member.role || "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="text-xs font-medium tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-sm font-semibold text-slate-900">{value || "-"}</div>
    </div>
  );
}