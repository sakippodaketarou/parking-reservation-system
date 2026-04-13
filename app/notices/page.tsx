import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createNotice, updateNotice, deleteNotice } from "./actions";

type NoticeRow = {
  id: string;
  category: "facility" | "tenant";
  title: string;
  body: string;
  file_name: string | null;
  file_url: string | null;
  published_from: string | null;
  published_until: string | null;
  created_by: string;
  created_at: string;
};

type ProfileRow = {
  user_id: string;
  role: string | null;
  company_id: string | null;
};

const TENANT_POST_ROLES = ["admin", "tenant", "carrier", "contractor"];

async function getPageData() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id, role, company_id")
    .eq("user_id", user.id)
    .single<ProfileRow>();

  if (!profile) {
    redirect("/login");
  }

  const nowIso = new Date().toISOString();

  const { data: notices } = await supabase
    .from("notices")
    .select(
      "id, category, title, body, file_name, file_url, published_from, published_until, created_by, created_at"
    )
    .is("deleted_at", null)
    .or(`published_until.is.null,published_until.gte.${nowIso}`)
    .order("created_at", { ascending: false })
    .returns<NoticeRow[]>();

  return {
    user,
    profile,
    facilityNotices: (notices ?? []).filter((n) => n.category === "facility"),
    tenantNotices: (notices ?? []).filter((n) => n.category === "tenant"),
  };
}

export default async function NoticesPage() {
  const { user, profile, facilityNotices, tenantNotices } = await getPageData();

  const canPostFacility = profile.role === "admin";
  const canPostTenant = TENANT_POST_ROLES.includes(profile.role ?? "");

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef3f8_45%,#e9eff6_100%)] px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-[1280px]">
        <div className="rounded-[28px] border border-white/80 bg-white/55 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Notices
              </p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
                お知らせ管理
              </h1>
            </div>

            <div className="flex gap-3">
              <Link
                href="/notices/archive"
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                アーカイブを見る
              </Link>
              <Link
                href="/"
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                ホームへ戻る
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
          <section className="rounded-[24px] border border-white/80 bg-white/45 p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl">
            <h2 className="text-xl font-bold text-slate-900">施設側からのお知らせ</h2>
            <p className="mt-1 text-sm text-slate-500">施設管理者向け投稿エリア</p>

            {canPostFacility ? (
              <div className="mt-5">
                <CreateNoticeForm
                  category="facility"
                  titleLabel="施設側のお知らせを新規投稿"
                />
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                施設側からのお知らせは管理者のみ投稿できます。
              </div>
            )}

            <div className="mt-5 space-y-4">
              {facilityNotices.length === 0 ? (
                <EmptyBox text="表示中のお知らせはありません。" />
              ) : (
                facilityNotices.map((notice) => (
                  <NoticeManageCard
                    key={notice.id}
                    notice={notice}
                    canEdit={profile.role === "admin"}
                    currentUserId={user.id}
                  />
                ))
              )}
            </div>
          </section>

          <section className="rounded-[24px] border border-white/80 bg-white/45 p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl">
            <h2 className="text-xl font-bold text-slate-900">テナント・搬入企業からのお知らせ</h2>
            <p className="mt-1 text-sm text-slate-500">テナント・搬入企業向け投稿エリア</p>

            {canPostTenant ? (
              <div className="mt-5">
                <CreateNoticeForm
                  category="tenant"
                  titleLabel="テナント・搬入企業のお知らせを新規投稿"
                />
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                この権限では投稿できません。
              </div>
            )}

            <div className="mt-5 space-y-4">
              {tenantNotices.length === 0 ? (
                <EmptyBox text="表示中のお知らせはありません。" />
              ) : (
                tenantNotices.map((notice) => (
                  <NoticeManageCard
                    key={notice.id}
                    notice={notice}
                    canEdit={profile.role === "admin" || notice.created_by === user.id}
                    currentUserId={user.id}
                  />
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function CreateNoticeForm({
  category,
  titleLabel,
}: {
  category: "facility" | "tenant";
  titleLabel: string;
}) {
  return (
    <form action={createNotice} className="space-y-4 rounded-[20px] border border-slate-200 bg-white/80 p-4">
      <input type="hidden" name="category" value={category} />

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">{titleLabel}</label>
        <input
          name="title"
          type="text"
          required
          placeholder="タイトルを入力"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none ring-0 placeholder:text-slate-400 focus:border-blue-400"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">本文</label>
        <textarea
          name="body"
          required
          rows={5}
          placeholder="本文を入力"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-blue-400"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">掲載開始日時</label>
          <input
            name="published_from"
            type="datetime-local"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm focus:border-blue-400"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">掲載終了日時</label>
          <input
            name="published_until"
            type="datetime-local"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm focus:border-blue-400"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">添付ファイル</label>
        <input
          name="file"
          type="file"
          className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"
        />
      </div>

      <button
        type="submit"
        className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
      >
        投稿する
      </button>
    </form>
  );
}

function NoticeManageCard({
  notice,
  canEdit,
}: {
  notice: NoticeRow;
  canEdit: boolean;
  currentUserId: string;
}) {
  return (
    <div className="rounded-[20px] border border-slate-200 bg-white/80 p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs text-slate-500">{formatDate(notice.created_at)}</div>
          <h3 className="mt-1 text-lg font-bold text-slate-900">{notice.title}</h3>
        </div>

        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
          {notice.category === "facility" ? "施設側" : "テナント・搬入企業"}
        </span>
      </div>

      <div className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{notice.body}</div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
        <span className="rounded-full bg-slate-100 px-3 py-1">
          開始: {formatDateTime(notice.published_from) || "未設定"}
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-1">
          終了: {formatDateTime(notice.published_until) || "未設定"}
        </span>
      </div>

      {notice.file_url && notice.file_name ? (
        <a
          href={notice.file_url}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          添付: {notice.file_name}
        </a>
      ) : null}

      {canEdit ? (
        <details className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <summary className="cursor-pointer text-sm font-semibold text-slate-700">
            編集 / 削除
          </summary>

          <form action={updateNotice} className="mt-4 space-y-4">
            <input type="hidden" name="id" value={notice.id} />
            <input type="hidden" name="category" value={notice.category} />

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">タイトル</label>
              <input
                name="title"
                type="text"
                required
                defaultValue={notice.title}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm focus:border-blue-400"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">本文</label>
              <textarea
                name="body"
                required
                rows={5}
                defaultValue={notice.body}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm focus:border-blue-400"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">掲載開始日時</label>
                <input
                  name="published_from"
                  type="datetime-local"
                  defaultValue={toLocalInputValue(notice.published_from)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm focus:border-blue-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">掲載終了日時</label>
                <input
                  name="published_until"
                  type="datetime-local"
                  defaultValue={toLocalInputValue(notice.published_until)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm focus:border-blue-400"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                添付ファイル差し替え
              </label>
              <input
                name="file"
                type="file"
                className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500"
              >
                更新する
              </button>
            </div>
          </form>

          <form action={deleteNotice} className="mt-3">
            <input type="hidden" name="id" value={notice.id} />
            <button
              type="submit"
              className="rounded-full border border-red-200 bg-red-50 px-5 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-100"
            >
              削除する
            </button>
          </form>
        </details>
      ) : null}
    </div>
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 text-sm text-slate-500">
      {text}
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatDateTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function toLocalInputValue(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}