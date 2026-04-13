import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabaseServer";

type SearchParams = Promise<{
  form_name_id?: string;
  status?: string;
  submitted_date?: string;
  message?: string;
  error?: string;
}>;

type ProfileRow = {
  user_id: string;
  company_id: string | null;
  role: string;
};

type CompanyRow = {
  id: string;
  name: string | null;
};

type FormNameRow = {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
};

type TemplateRow = {
  id: string;
  title: string;
  description: string | null;
  company_id: string | null;
  form_name_id: string | null;
  bucket_name: string;
  file_path: string;
  file_name: string;
  file_type: string | null;
  created_by: string;
  created_at: string;
};

type SubmissionRow = {
  id: string;
  template_id: string | null;
  company_id: string;
  bucket_name: string;
  file_path: string;
  file_name: string;
  file_type: string | null;
  note: string | null;
  status: "pending" | "approved" | "rejected";
  submitted_by: string;
  submitted_at: string;
  approved_at: string | null;
  approved_by: string | null;
};

function isAdminRole(role: string) {
  return role === "admin";
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleString("ja-JP");
}

function sanitizeFileName(name: string) {
  return name.replace(/[^\w.\-ぁ-んァ-ヶ一-龠]/g, "_");
}

function buildPageUrl(options?: {
  form_name_id?: string | null;
  status?: string | null;
  submitted_date?: string | null;
  message?: string | null;
  error?: string | null;
}) {
  const params = new URLSearchParams();
  if (options?.form_name_id) params.set("form_name_id", options.form_name_id);
  if (options?.status) params.set("status", options.status);
  if (options?.submitted_date) params.set("submitted_date", options.submitted_date);
  if (options?.message) params.set("message", options.message);
  if (options?.error) params.set("error", options.error);

  const qs = params.toString();
  return qs ? `/forms?${qs}` : "/forms";
}

export default async function FormsPage(props: {
  searchParams?: SearchParams;
}) {
  const searchParams = (await props.searchParams) ?? {};
  const formNameFilter = (searchParams.form_name_id || "").trim();
  const statusFilter = (searchParams.status || "").trim();
  const submittedDateFilter = (searchParams.submitted_date || "").trim();
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

  if (!profile) redirect("/login");

  const isAdmin = isAdminRole(profile.role);
  const myCompanyId = profile.company_id;

  async function createFormNameAction(formData: FormData) {
    "use server";

    const supabase = await supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single<{ role: string }>();

    if (!profile || profile.role !== "admin") {
      redirect(buildPageUrl({ error: "フォーマット名追加は管理者のみ可能です。" }));
    }

    const name = String(formData.get("name") || "").trim();
    if (!name) {
      redirect(buildPageUrl({ error: "フォーマット名を入力してください。" }));
    }

    const { error } = await supabase.from("application_form_names").insert({
      name,
      created_by: user.id,
    });

    if (error) {
      redirect(buildPageUrl({ error: `フォーマット名追加に失敗しました: ${error.message}` }));
    }

    revalidatePath("/forms");
    redirect(buildPageUrl({ message: "フォーマット名を追加しました。" }));
  }

  async function uploadTemplateAction(formData: FormData) {
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
      redirect(buildPageUrl({ error: "フォーマット投稿は管理者のみ可能です。" }));
    }

    const title = String(formData.get("title") || "").trim();
    const description = String(formData.get("description") || "").trim();
    const formNameId = String(formData.get("form_name_id") || "").trim();
    const file = formData.get("file") as File | null;

    if (!title || !formNameId || !file || file.size === 0) {
      redirect(buildPageUrl({ error: "フォーマット名・タイトル・ファイルは必須です。" }));
    }

    const fileName = sanitizeFileName(file.name);
    const filePath = `templates/${Date.now()}-${fileName}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from("application-templates")
      .upload(filePath, buffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      redirect(buildPageUrl({ error: `フォーマットアップロードに失敗しました: ${uploadError.message}` }));
    }

    const { error: insertError } = await supabase
      .from("application_form_templates")
      .insert({
        title,
        description: description || null,
        company_id: profile.company_id,
        form_name_id: formNameId,
        bucket_name: "application-templates",
        file_path: filePath,
        file_name: file.name,
        file_type: file.type || null,
        created_by: user.id,
      });

    if (insertError) {
      redirect(buildPageUrl({ error: `フォーマット登録に失敗しました: ${insertError.message}` }));
    }

    revalidatePath("/forms");
    redirect(buildPageUrl({ message: "フォーマットを投稿しました。" }));
  }

  async function submitApplicationAction(formData: FormData) {
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
      redirect(buildPageUrl({ error: "会社情報が見つからないため申請できません。" }));
    }

    const templateId = String(formData.get("template_id") || "").trim();
    const note = String(formData.get("note") || "").trim();
    const file = formData.get("file") as File | null;

    if (!templateId || !file || file.size === 0) {
      redirect(buildPageUrl({ error: "申請にはフォーマット選択とファイル添付が必要です。" }));
    }

    const fileName = sanitizeFileName(file.name);
    const filePath = `${profile.company_id}/${Date.now()}-${fileName}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from("application-submissions")
      .upload(filePath, buffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      redirect(buildPageUrl({ error: `申請ファイルのアップロードに失敗しました: ${uploadError.message}` }));
    }

    const { error: insertError } = await supabase
      .from("application_submissions")
      .insert({
        template_id: templateId,
        company_id: profile.company_id,
        bucket_name: "application-submissions",
        file_path: filePath,
        file_name: file.name,
        file_type: file.type || null,
        note: note || null,
        status: "pending",
        submitted_by: user.id,
      });

    if (insertError) {
      redirect(buildPageUrl({ error: `申請に失敗しました: ${insertError.message}` }));
    }

    revalidatePath("/forms");
    redirect(buildPageUrl({ message: "申請を送信しました。" }));
  }

  async function approveSubmissionAction(formData: FormData) {
    "use server";

    const supabase = await supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single<{ role: string }>();

    if (!profile || profile.role !== "admin") {
      redirect(buildPageUrl({ error: "承認は管理者のみ可能です。" }));
    }

    const submissionId = String(formData.get("submission_id") || "");
    if (!submissionId) {
      redirect(buildPageUrl({ error: "承認対象が見つかりません。" }));
    }

    const { error } = await supabase
      .from("application_submissions")
      .update({
        status: "approved",
        approved_at: new Date().toISOString(),
        approved_by: user.id,
      })
      .eq("id", submissionId);

    if (error) {
      redirect(buildPageUrl({ error: `承認に失敗しました: ${error.message}` }));
    }

    revalidatePath("/forms");
    redirect(buildPageUrl({ message: "申請を承認しました。" }));
  }

  async function rejectSubmissionAction(formData: FormData) {
    "use server";

    const supabase = await supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single<{ role: string }>();

    if (!profile || profile.role !== "admin") {
      redirect(buildPageUrl({ error: "拒否は管理者のみ可能です。" }));
    }

    const submissionId = String(formData.get("submission_id") || "");
    if (!submissionId) {
      redirect(buildPageUrl({ error: "拒否対象が見つかりません。" }));
    }

    const { error } = await supabase
      .from("application_submissions")
      .update({
        status: "rejected",
        approved_at: null,
        approved_by: null,
      })
      .eq("id", submissionId);

    if (error) {
      redirect(buildPageUrl({ error: `拒否に失敗しました: ${error.message}` }));
    }

    revalidatePath("/forms");
    redirect(buildPageUrl({ message: "申請を拒否しました。" }));
  }

  async function deleteTemplateAction(formData: FormData) {
    "use server";

    const supabase = await supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single<{ role: string }>();

    if (!profile || profile.role !== "admin") {
      redirect(buildPageUrl({ error: "フォーマット削除は管理者のみ可能です。" }));
    }

    const templateId = String(formData.get("template_id") || "");
    const bucketName = String(formData.get("bucket_name") || "");
    const filePath = String(formData.get("file_path") || "");

    if (!templateId) {
      redirect(buildPageUrl({ error: "削除対象のフォーマットが見つかりません。" }));
    }

    if (bucketName && filePath) {
      await supabase.storage.from(bucketName).remove([filePath]);
    }

    const { error } = await supabase
      .from("application_form_templates")
      .delete()
      .eq("id", templateId);

    if (error) {
      redirect(buildPageUrl({ error: `フォーマット削除に失敗しました: ${error.message}` }));
    }

    revalidatePath("/forms");
    redirect(buildPageUrl({ message: "フォーマットを削除しました。" }));
  }

  async function deleteSubmissionAction(formData: FormData) {
    "use server";

    const supabase = await supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id, role")
      .eq("user_id", user.id)
      .single<{ company_id: string | null; role: string }>();

    if (!profile) {
      redirect(buildPageUrl({ error: "プロフィール取得に失敗しました。" }));
    }

    const submissionId = String(formData.get("submission_id") || "");
    const bucketName = String(formData.get("bucket_name") || "");
    const filePath = String(formData.get("file_path") || "");

    if (!submissionId) {
      redirect(buildPageUrl({ error: "削除対象の申請が見つかりません。" }));
    }

    const { data: row } = await supabase
      .from("application_submissions")
      .select("id, company_id, status")
      .eq("id", submissionId)
      .single<{ id: string; company_id: string; status: "pending" | "approved" | "rejected" }>();

    if (!row) {
      redirect(buildPageUrl({ error: "削除対象の申請が見つかりません。" }));
    }

    if (profile.role !== "admin" && row.company_id !== profile.company_id) {
      redirect(buildPageUrl({ error: "他社の申請は削除できません。" }));
    }

    if (bucketName && filePath) {
      await supabase.storage.from(bucketName).remove([filePath]);
    }

    const { error } = await supabase
      .from("application_submissions")
      .delete()
      .eq("id", submissionId);

    if (error) {
      redirect(buildPageUrl({ error: `申請削除に失敗しました: ${error.message}` }));
    }

    revalidatePath("/forms");
    redirect(buildPageUrl({ message: "申請を削除しました。" }));
  }

  const [templatesRes, submissionsRes, companiesRes, formNamesRes] = await Promise.all([
    supabase.from("application_form_templates").select("*").order("created_at", { ascending: false }),
    isAdmin
      ? supabase.from("application_submissions").select("*").order("submitted_at", { ascending: false })
      : supabase.from("application_submissions").select("*").eq("company_id", myCompanyId).order("submitted_at", { ascending: false }),
    supabase.from("companies").select("id, name"),
    supabase.from("application_form_names").select("*").order("name", { ascending: true }),
  ]);

  const templates = (templatesRes.data ?? []) as TemplateRow[];
  const submissions = (submissionsRes.data ?? []) as SubmissionRow[];
  const companies = (companiesRes.data ?? []) as CompanyRow[];
  const formNames = (formNamesRes.data ?? []) as FormNameRow[];

  const companyMap = new Map(companies.map((c) => [c.id, c.name ?? "会社名未設定"]));
  const formNameMap = new Map(formNames.map((f) => [f.id, f.name]));

  const templatesWithUrl = await Promise.all(
    templates.map(async (template) => {
      const { data } = await supabase.storage
        .from(template.bucket_name)
        .createSignedUrl(template.file_path, 60 * 60);

      return {
        ...template,
        formName: template.form_name_id ? formNameMap.get(template.form_name_id) ?? "未設定" : "未設定",
        companyName: template.company_id ? companyMap.get(template.company_id) ?? "管理者" : "管理者",
        downloadUrl: data?.signedUrl ?? "#",
      };
    })
  );

  const templateMap = new Map(
    templatesWithUrl.map((t) => [
      t.id,
      { title: t.title, formName: t.formName, formNameId: t.form_name_id ?? "" },
    ])
  );

  const submissionsWithUrl = await Promise.all(
    submissions.map(async (submission) => {
      const { data } = await supabase.storage
        .from(submission.bucket_name)
        .createSignedUrl(submission.file_path, 60 * 60);

      const templateInfo = submission.template_id ? templateMap.get(submission.template_id) : null;

      return {
        ...submission,
        companyName: companyMap.get(submission.company_id) ?? "会社名未設定",
        formName: templateInfo?.formName ?? "未設定",
        formNameId: templateInfo?.formNameId ?? "",
        templateTitle: templateInfo?.title ?? "未設定",
        downloadUrl: data?.signedUrl ?? "#",
      };
    })
  );

  const filtered = submissionsWithUrl.filter((row) => {
    const matchesFormName = !formNameFilter || row.formNameId === formNameFilter;
    const matchesStatus = !statusFilter || row.status === statusFilter;

    const submittedDate = row.submitted_at
      ? new Date(row.submitted_at).toISOString().slice(0, 10)
      : "";

    const matchesDate = !submittedDateFilter || submittedDate === submittedDateFilter;

    return matchesFormName && matchesStatus && matchesDate;
  });

  const pendingRows = filtered.filter((r) => r.status === "pending");
  const approvedRows = filtered.filter((r) => r.status === "approved");
  const rejectedRows = filtered.filter((r) => r.status === "rejected");

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">各種申請書</h1>
              <p className="mt-1 text-sm text-slate-500">
                権限: {isAdmin ? "管理者" : "企業ユーザー"}
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

        {isAdmin ? (
          <section className="mb-6 rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-slate-900">フォーマット名管理</h2>
            <form action={createFormNameAction} className="grid gap-3 lg:grid-cols-[1fr_auto]">
              <input
                type="text"
                name="name"
                placeholder="新しいフォーマット名を追加"
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
              />
              <button
                type="submit"
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
              >
                追加
              </button>
            </form>
          </section>
        ) : null}

        <section className="mb-6 rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">申請書フォーマット</h2>
            <span className="text-sm text-slate-500">{templatesWithUrl.length} 件</span>
          </div>

          {isAdmin ? (
            <form action={uploadTemplateAction} className="mb-6 grid gap-4 rounded-2xl border border-slate-200 p-4 lg:grid-cols-[220px_1fr_1fr_1fr_auto]">
              <select
                name="form_name_id"
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                defaultValue=""
              >
                <option value="" disabled>フォーマット名を選択</option>
                {formNames.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </select>

              <input
                type="text"
                name="title"
                placeholder="タイトル"
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
              />

              <input
                type="text"
                name="description"
                placeholder="説明文"
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
              />

              <label className="flex cursor-pointer items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                ファイルを選択
                <input type="file" name="file" className="hidden" />
              </label>

              <button
                type="submit"
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
              >
                フォーマット投稿
              </button>
            </form>
          ) : null}

          <div className="space-y-4">
            {templatesWithUrl.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                まだフォーマットは登録されていません。
              </div>
            ) : (
              templatesWithUrl.map((template) => (
                <div key={template.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                      <div className="text-base font-semibold text-slate-900">{template.formName}</div>
                      <div className="mt-1 text-sm text-slate-700">タイトル: {template.title}</div>
                      <div className="mt-1 text-sm text-slate-600">{template.description || "説明なし"}</div>
                      <div className="mt-2 text-xs text-slate-500">格納元会社名: {template.companyName}</div>
                      <div className="text-xs text-slate-500">ファイル: {template.file_name}</div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <a
                        href={template.downloadUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        ダウンロード
                      </a>

                      {isAdmin ? (
                        <form action={deleteTemplateAction}>
                          <input type="hidden" name="template_id" value={template.id} />
                          <input type="hidden" name="bucket_name" value={template.bucket_name} />
                          <input type="hidden" name="file_path" value={template.file_path} />
                          <button
                            type="submit"
                            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
                          >
                            削除
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="mb-6 rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">申請</h2>
          </div>

          <div className="space-y-4">
            {templatesWithUrl.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                利用可能なフォーマットがありません。
              </div>
            ) : (
              templatesWithUrl.map((template) => (
                <form
                  key={template.id}
                  action={submitApplicationAction}
                  className="grid gap-3 rounded-2xl border border-slate-200 p-4 lg:grid-cols-[220px_1fr_220px_auto]"
                >
                  <input type="hidden" name="template_id" value={template.id} />

                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    {template.formName}
                  </div>

                  <input
                    type="text"
                    name="note"
                    placeholder="補足メモ"
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                  />

                  <label className="flex cursor-pointer items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                    ファイルを選択
                    <input type="file" name="file" className="hidden" />
                  </label>

                  <button
                    type="submit"
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
                  >
                    申請する
                  </button>
                </form>
              ))
            )}
          </div>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <h2 className="text-lg font-bold text-slate-900">申請一覧</h2>

            <form className="grid gap-3 lg:grid-cols-[220px_180px_180px_auto_auto]">
              <select
                name="form_name_id"
                defaultValue={formNameFilter}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
              >
                <option value="">フォーマット名</option>
                {formNames.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </select>

              <select
                name="status"
                defaultValue={statusFilter}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
              >
                <option value="">全ステータス</option>
                <option value="pending">申請中</option>
                <option value="approved">承認済み</option>
                <option value="rejected">拒否済み</option>
              </select>

              <input
                type="date"
                name="submitted_date"
                defaultValue={submittedDateFilter}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
              />

              <button
                type="submit"
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
              >
                検索
              </button>

              <Link
                href="/forms"
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                クリア
              </Link>
            </form>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900">申請中のファイル</h3>
                <span className="text-sm text-slate-500">{pendingRows.length} 件</span>
              </div>

              <div className="max-h-[480px] overflow-y-auto space-y-3 pr-2">
                {pendingRows.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                    該当する申請中ファイルはありません。
                  </div>
                ) : (
                  pendingRows.map((row) => (
                    <div key={row.id} className="rounded-xl border border-slate-200 p-4">
                      <div className="text-sm font-semibold text-slate-900">{row.formName}</div>
                      <div className="mt-1 text-xs text-slate-500">会社名: {row.companyName}</div>
                      <div className="text-xs text-slate-500">申請時間: {formatDateTime(row.submitted_at)}</div>
                      <div className="text-xs text-slate-500">承認時間: -</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <a
                          href={row.downloadUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                          ファイルを見る
                        </a>

                        {isAdmin ? (
                          <>
                            <form action={approveSubmissionAction}>
                              <input type="hidden" name="submission_id" value={row.id} />
                              <button
                                type="submit"
                                className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500"
                              >
                                承認
                              </button>
                            </form>

                            <form action={rejectSubmissionAction}>
                              <input type="hidden" name="submission_id" value={row.id} />
                              <button
                                type="submit"
                                className="rounded-xl bg-amber-500 px-3 py-2 text-sm font-medium text-white hover:bg-amber-400"
                              >
                                拒否
                              </button>
                            </form>
                          </>
                        ) : null}

                        {(isAdmin || row.company_id === myCompanyId) ? (
                          <form action={deleteSubmissionAction}>
                            <input type="hidden" name="submission_id" value={row.id} />
                            <input type="hidden" name="bucket_name" value={row.bucket_name} />
                            <input type="hidden" name="file_path" value={row.file_path} />
                            <button
                              type="submit"
                              className="rounded-xl bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-500"
                            >
                              取り下げ / 削除
                            </button>
                          </form>
                        ) : null}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900">承認済みのファイル</h3>
                <span className="text-sm text-slate-500">{approvedRows.length} 件</span>
              </div>

              <div className="max-h-[480px] overflow-y-auto space-y-3 pr-2">
                {approvedRows.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                    該当する承認済みファイルはありません。
                  </div>
                ) : (
                  approvedRows.map((row) => (
                    <div key={row.id} className="rounded-xl border border-slate-200 p-4">
                      <div className="text-sm font-semibold text-slate-900">{row.formName}</div>
                      <div className="mt-1 text-xs text-slate-500">会社名: {row.companyName}</div>
                      <div className="text-xs text-slate-500">申請時間: {formatDateTime(row.submitted_at)}</div>
                      <div className="text-xs text-slate-500">承認時間: {formatDateTime(row.approved_at)}</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <a
                          href={row.downloadUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                          ファイルを見る
                        </a>

                        {(isAdmin || row.company_id === myCompanyId) ? (
                          <form action={deleteSubmissionAction}>
                            <input type="hidden" name="submission_id" value={row.id} />
                            <input type="hidden" name="bucket_name" value={row.bucket_name} />
                            <input type="hidden" name="file_path" value={row.file_path} />
                            <button
                              type="submit"
                              className="rounded-xl bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-500"
                            >
                              削除
                            </button>
                          </form>
                        ) : null}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {rejectedRows.length > 0 ? (
            <div className="mt-6 rounded-2xl border border-slate-200 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900">拒否済みのファイル</h3>
                <span className="text-sm text-slate-500">{rejectedRows.length} 件</span>
              </div>

              <div className="max-h-[280px] overflow-y-auto space-y-3 pr-2">
                {rejectedRows.map((row) => (
                  <div key={row.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="text-sm font-semibold text-slate-900">{row.formName}</div>
                    <div className="mt-1 text-xs text-slate-500">会社名: {row.companyName}</div>
                    <div className="text-xs text-slate-500">申請時間: {formatDateTime(row.submitted_at)}</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <a
                        href={row.downloadUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        ファイルを見る
                      </a>

                      {(isAdmin || row.company_id === myCompanyId) ? (
                        <form action={deleteSubmissionAction}>
                          <input type="hidden" name="submission_id" value={row.id} />
                          <input type="hidden" name="bucket_name" value={row.bucket_name} />
                          <input type="hidden" name="file_path" value={row.file_path} />
                          <button
                            type="submit"
                            className="rounded-xl bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-500"
                          >
                            削除
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}