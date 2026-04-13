import Link from "next/link";
import { logout } from "@/app/actions/authActions";

const menus = [
  {
    title: "予約画面",
    description: "車室予約の作成・確認を行います",
    href: "/reservations",
    icon: "🚚",
  },
  {
    title: "車両登録",
    description: "車両情報を登録・管理します",
    href: "/vehicles",
    icon: "🚙",
  },
  {
    title: "予約スケジュールCSV出力",
    description: "予約スケジュールをCSVで出力します",
    href: "/export",
    icon: "📊",
  },
  {
    title: "各種申請書",
    description: "申請書や関連資料を確認します",
    href: "/documents",
    icon: "📄",
  },
];

export default function DashboardMenu() {
  return (
    <section className="rounded-[28px] bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">メニュー</h2>

        <form action={logout}>
          <button
            type="submit"
            className="rounded-full bg-slate-200 px-5 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition active:translate-y-[1px] active:scale-[0.99] hover:bg-slate-300"
          >
            ログアウト
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {menus.map((menu) => (
          <Link
            key={menu.title}
            href={menu.href}
            className="group rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm transition duration-150 hover:-translate-y-0.5 hover:shadow-md active:translate-y-[1px] active:scale-[0.995]"
          >
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl transition group-hover:scale-105 group-active:scale-95">
              {menu.icon}
            </div>

            <h3 className="text-2xl font-bold tracking-tight text-slate-900">
              {menu.title}
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              {menu.description}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}