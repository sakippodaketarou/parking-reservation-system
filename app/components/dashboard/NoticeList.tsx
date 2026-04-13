import { Announcement } from "@/types/dashboard";

type Props = {
  title: string;
  badge: string;
  notices: Announcement[];
  emptyText?: string;
};

function formatDate(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function NoticeList({
  title,
  badge,
  notices,
  emptyText = "現在お知らせはありません。",
}: Props) {
  return (
    <section className="rounded-[28px] bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">
          {title}
        </h2>
        <span className="rounded-full bg-slate-100 px-4 py-1.5 text-sm font-semibold text-slate-600">
          {badge}
        </span>
      </div>

      <div className="space-y-4">
        {notices.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
            {emptyText}
          </div>
        ) : (
          notices.map((notice) => (
            <article
              key={notice.id}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
            >
              <div className="mb-2 text-sm font-bold text-slate-700">
                {notice.category === "admin"
                  ? "管理会社"
                  : notice.company_name || "登録企業"}
              </div>

              <h3 className="text-xl font-bold text-slate-900">{notice.title}</h3>

              <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                {notice.content}
              </p>

              <div className="mt-4 text-xs text-slate-400">
                {formatDate(notice.published_at)}
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}