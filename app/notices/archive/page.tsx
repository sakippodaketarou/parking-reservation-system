import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type NoticeRow = {
  id: string;
  category: "facility" | "tenant";
  title: string;
  body: string;
  file_name: string | null;
  file_url: string | null;
  published_from: string | null;
  published_until: string | null;
  created_at: string;
};

async function getArchiveNotices() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const nowIso = new Date().toISOString();

  const { data } = await supabase
    .from("notices")
    .select("id, category, title, body, file_name, file_url, published_from, published_until, created_at")
    .is("deleted_at", null)
    .not("published_until", "is", null)
    .lt("published_until", nowIso)
    .order("published_until", { ascending: false })
    .returns<NoticeRow[]>();

  return data ?? [];
}

export default async function NoticeArchivePage() {
  const notices = await getArchiveNotices();

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef3f8_45%,#e9eff6_100%)] px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-[1100px]">
        <div className="rounded-[28px] border border-white/80 bg-white/55 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Archive
              </p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
                お知らせアーカイブ
              </h1>
            </div>

            <div className="flex gap-3">
              <Link
                href="/notices"
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                管理画面へ戻る
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

        <div className="mt-5 space-y-4">
          {notices.length === 0 ? (
            <div className="rounded-[24px] border border-white/80 bg-white/60 p-5 text-sm text-slate-500 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl">
              アーカイブはありません。
            </div>
          ) : (
            notices.map((notice) => (
              <div
                key={notice.id}
                className="rounded-[24px] border border-white/80 bg-white/60 p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-xs text-slate-500">
                      投稿日: {formatDate(notice.created_at)}
                    </div>
                    <h2 className="mt-1 text-xl font-bold text-slate-900">{notice.title}</h2>
                  </div>

                  <div className="flex gap-2">
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                      {notice.category === "facility" ? "施設側" : "テナント・搬入企業"}
                    </span>
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                      期限切れ
                    </span>
                  </div>
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
              </div>
            ))
          )}
        </div>
      </div>
    </main>
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