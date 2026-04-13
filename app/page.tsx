import Link from "next/link";
import { logout } from "@/app/actions/authActions";
import { updateParkingLiveStatus } from "@/app/actions/parkingStatusActions";
import { createClient } from "@/lib/supabase/server";

type MenuCard = {
  id: string;
  label: string;
  sub: string;
  href: string;
};

type NoticeRow = {
  id: string;
  category: "facility" | "tenant";
  title: string;
  body: string;
  file_url: string | null;
  file_name: string | null;
  published_from: string | null;
  published_until: string | null;
  created_at: string;
};

type ProfileRow = {
  user_id: string;
  role: string | null;
  company_id: string | null;
};

type SlotLayout = {
  left?: string;
  right?: string;
  top?: string;
  bottom?: string;
  width: string;
  height: string;
  fontSize?: string;
  rotate?: string;
};

type ParkingLiveStatusRow = {
  slot_code: string;
  status: "empty" | "occupied" | "mine";
  updated_at: string;
};

const baseMenuCards: MenuCard[] = [
  { id: "01", label: "予約", sub: "MENU 01", href: "/vehicle-bookings" },
  { id: "02", label: "車両登録", sub: "MENU 02", href: "/vehicles" },
  { id: "03", label: "自社情報", sub: "MENU 03", href: "/my-company" },
  { id: "04", label: "申請書", sub: "MENU 04", href: "/forms" },
];

const adminOnlyMenuCards: MenuCard[] = [
  { id: "05", label: "企業一覧", sub: "ADMIN 01", href: "/companies" },
];

const SLOT_LAYOUTS: Record<string, SlotLayout> = {
  A: { left: "21.2%", top: "10%", width: "3.5%", height: "20%" },
  B: { left: "24.8%", top: "10%", width: "3.5%", height: "20%" },
  C: { left: "28.6%", top: "8%", width: "3.5%", height: "20%" },
  D: { left: "32.5%", top: "8%", width: "3.5%", height: "20%" },
  E: { left: "36.5%", top: "8%", width: "3.5%", height: "20%" },
  F: { left: "40.5%", top: "8%", width: "3.5%", height: "20%" },
  G: { left: "44.6%", top: "8%", width: "3.5%", height: "20%" },
  H: { left: "48.5%", top: "8%", width: "3.5%", height: "20%" },
  I: { left: "52.4%", top: "8%", width: "3.5%", height: "20%" },
  J: { left: "56.3%", top: "8%", width: "3.5%", height: "20%" },
  K: { left: "60.2%", top: "8%", width: "3.5%", height: "20%" },
  L: { left: "64.0%", top: "8%", width: "3.5%", height: "20%" },
  M: { left: "68.2%", top: "8%", width: "3.5%", height: "20%" },
  N: { left: "71.8%", top: "8%", width: "3.5%", height: "20%" },
  O: { left: "76.0%", top: "8%", width: "3.5%", height: "20%" },
  P: { left: "79.7%", top: "8%", width: "3.5%", height: "20%" },

  臨時4: { left: "15%", top: "48%", width: "9.0%", height: "6.5%", fontSize: "1.2vw" },
  臨時3: { left: "15%", top: "55%", width: "9.0%", height: "6.5%", fontSize: "1.2vw" },
  臨時2: { left: "15%", top: "61.5%", width: "9.0%", height: "6.5%", fontSize: "1.2vw" },
  臨時1: { left: "15%", top: "68%", width: "9.0%", height: "6.5%", fontSize: "1.2vw" },

  予1: { left: "23.5%", bottom: "8%", width: "9%", height: "6.5%", fontSize: "1.5vw" },
  予2: { left: "35%", bottom: "8%", width: "9%", height: "6.5%", fontSize: "1.5vw" },

  予3: { right: "28.7%", bottom: "1%", width: "3.5%", height: "13.0%", fontSize: "1.5vw" },
  予4: { right: "25%", bottom: "1%", width: "3.5%", height: "13.0%", fontSize: "1.5vw" },
};

const slotNames = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
  "臨時4",
  "臨時3",
  "臨時2",
  "臨時1",
  "予1",
  "予2",
  "予3",
  "予4",
];

function getJstDateTime() {
  const now = new Date();
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(now);
}

function formatRoleLabel(role: string | null | undefined) {
  switch (role) {
    case "admin":
      return "admin";
    case "tenant":
      return "tenant";
    case "carrier":
      return "carrier";
    case "contractor":
      return "contractor";
    default:
      return "user";
  }
}

function getNextStatus(current: "empty" | "occupied" | "mine") {
  if (current === "empty") return "occupied";
  if (current === "occupied") return "mine";
  return "empty";
}

function getSlotClass(status: "empty" | "occupied" | "mine") {
  if (status === "mine") {
    return "border-blue-500 bg-white/92 text-slate-900 ring-2 ring-blue-100";
  }
  if (status === "occupied") {
    return "border-slate-300 bg-slate-400 text-white";
  }
  return "border-white/70 bg-white/58 text-slate-900";
}

async function getHomeData() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: ProfileRow | null = null;

  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("user_id, role, company_id")
      .eq("user_id", user.id)
      .maybeSingle<ProfileRow>();

    profile = data;
  }

  const nowIso = new Date().toISOString();

  const { data: notices } = await supabase
    .from("notices")
    .select(
      "id, category, title, body, file_url, file_name, published_from, published_until, created_at"
    )
    .is("deleted_at", null)
    .or(`published_until.is.null,published_until.gte.${nowIso}`)
    .order("created_at", { ascending: false })
    .limit(20);

  const { data: parkingStatuses } = await supabase
    .from("parking_live_status")
    .select("slot_code, status, updated_at")
    .returns<ParkingLiveStatusRow[]>();

  const statusMap = new Map<string, "empty" | "occupied" | "mine">();
  for (const row of parkingStatuses ?? []) {
    statusMap.set(row.slot_code, row.status);
  }

  const rows = (notices ?? []) as NoticeRow[];
  const isAdminCompanyUser = profile?.role === "admin";

  return {
    roleLabel: formatRoleLabel(profile?.role),
    isAdminCompanyUser,
    facility: rows.filter((n) => n.category === "facility").slice(0, 5),
    tenant: rows.filter((n) => n.category === "tenant").slice(0, 5),
    statusMap,
  };
}

export default async function HomePage() {
  const currentDateTime = getJstDateTime();
  const homeData = await getHomeData();

  const visibleMenuCards = homeData.isAdminCompanyUser
    ? [...baseMenuCards, ...adminOnlyMenuCards]
    : baseMenuCards;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef3f8_45%,#e9eff6_100%)] text-slate-900">
      <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-10">
        <Header currentDateTime={currentDateTime} roleLabel={homeData.roleLabel} />

        <section className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {visibleMenuCards.map((card) => (
            <Link
              key={card.id}
              href={card.href}
              className="group rounded-[24px] border border-white/80 bg-white/45 p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl transition duration-200 hover:-translate-y-1 hover:bg-white/68 hover:shadow-[0_16px_40px_rgba(15,23,42,0.10)]"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                {card.sub}
              </p>

              <div className="mt-3 flex items-end justify-between gap-3">
                <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                  {card.label}
                </h2>
                <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-medium text-slate-600 transition group-hover:border-blue-200 group-hover:text-blue-600">
                  Open
                </span>
              </div>
            </Link>
          ))}
        </section>

        <section className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
          <NoticePanel
            title="施設側からのお知らせ"
            items={homeData.facility}
            accent="blue"
            manageHref="/notices"
            manageLabel="お知らせ管理"
          />
          <NoticePanel
            title="テナント・搬入企業からのお知らせ"
            items={homeData.tenant}
            accent="slate"
            manageHref="/notices"
            manageLabel="投稿管理"
          />
        </section>

        <section className="mt-5 rounded-[28px] border border-white/80 bg-white/42 p-4 shadow-[0_12px_40px_rgba(15,23,42,0.07)] backdrop-blur-xl sm:p-5 lg:p-6">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                Floor map
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                フロアマップ
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                現場共有用リアルタイム状況ボタン
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
              <Legend label="空き" className="border border-slate-300 bg-white" />
              <Legend label="使用中" className="border border-slate-400 bg-slate-400" />
              <Legend label="自社利用中" className="border-2 border-blue-500 bg-white" />
            </div>
          </div>

          <div className="overflow-hidden rounded-[24px] border border-white/80 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.82),rgba(255,255,255,0.5)_55%,rgba(255,255,255,0.34)_100%)] p-3 shadow-inner sm:p-4 lg:p-5">
            <div className="relative mx-auto aspect-[16/9] w-full overflow-hidden rounded-[24px] border border-slate-200/80 bg-[url('/images/parking-map.jpg')] bg-contain bg-center bg-no-repeat">
              <div className="pointer-events-none absolute inset-0 bg-white/18 backdrop-blur-[1px]" />

              {slotNames.map((slotName) => {
                const layout = SLOT_LAYOUTS[slotName];
                if (!layout) return null;

                const currentStatus = homeData.statusMap.get(slotName) ?? "empty";
                const nextStatus = getNextStatus(currentStatus);
                const isVertical = slotName === "予3" || slotName === "予4";

                if (homeData.isAdminCompanyUser) {
                  return (
                    <form
                      key={slotName}
                      action={updateParkingLiveStatus}
                      className="absolute z-10"
                      style={{
                        left: layout.left,
                        right: layout.right,
                        top: layout.top,
                        bottom: layout.bottom,
                        width: layout.width,
                        height: layout.height,
                        transform: layout.rotate ? `rotate(${layout.rotate})` : undefined,
                      }}
                    >
                      <input type="hidden" name="slot_code" value={slotName} />
                      <input type="hidden" name="next_status" value={nextStatus} />
                      <button
                        type="submit"
                        title={`${slotName}: ${currentStatus} → ${nextStatus}`}
                        className={`flex h-full w-full items-center justify-center rounded-[10px] border font-bold shadow-[0_8px_18px_rgba(15,23,42,0.10)] backdrop-blur-md transition hover:-translate-y-0.5 hover:shadow-[0_12px_26px_rgba(15,23,42,0.13)] ${getSlotClass(
                          currentStatus
                        )}`}
                        style={{
                          fontSize: layout.fontSize ?? "1.7vw",
                        }}
                      >
                        {isVertical ? (
                          <span className="text-center leading-tight">
                            {slotName.slice(0, 1)}
                            <br />
                            {slotName.slice(1)}
                          </span>
                        ) : (
                          slotName
                        )}
                      </button>
                    </form>
                  );
                }

                return (
                  <div
                    key={slotName}
                    className={`absolute z-10 flex items-center justify-center rounded-[10px] border font-bold shadow-[0_8px_18px_rgba(15,23,42,0.10)] backdrop-blur-md ${getSlotClass(
                      currentStatus
                    )}`}
                    style={{
                      left: layout.left,
                      right: layout.right,
                      top: layout.top,
                      bottom: layout.bottom,
                      width: layout.width,
                      height: layout.height,
                      fontSize: layout.fontSize ?? "1.7vw",
                      transform: layout.rotate ? `rotate(${layout.rotate})` : undefined,
                    }}
                  >
                    {isVertical ? (
                      <span className="text-center leading-tight">
                        {slotName.slice(0, 1)}
                        <br />
                        {slotName.slice(1)}
                      </span>
                    ) : (
                      slotName
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Header({
  currentDateTime,
  roleLabel,
}: {
  currentDateTime: string;
  roleLabel: string;
}) {
  return (
    <section className="rounded-[28px] border border-white/80 bg-white/50 px-5 py-6 shadow-[0_12px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            ONE FUKUOKA BLDG
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            車室予約システム
          </h1>
          <div className="mt-3 space-y-1 text-sm text-slate-500">
            <p>権限：{roleLabel}</p>
            <p>本日: {currentDateTime}</p>
          </div>
        </div>

        <form action={logout}>
          <button
            type="submit"
            className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 hover:bg-slate-800"
          >
            ログアウト
          </button>
        </form>
      </div>
    </section>
  );
}

function NoticePanel({
  title,
  items,
  accent,
  manageHref,
  manageLabel,
}: {
  title: string;
  items: NoticeRow[];
  accent: "blue" | "slate";
  manageHref: string;
  manageLabel: string;
}) {
  const lineClass = accent === "blue" ? "bg-blue-500" : "bg-slate-400";

  return (
    <div className="rounded-[24px] border border-white/80 bg-white/45 p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-lg font-bold tracking-tight text-slate-900">{title}</h3>

        <Link
          href={manageHref}
          className="rounded-full border border-slate-200 bg-white/85 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-white hover:text-slate-900"
        >
          {manageLabel}
        </Link>
      </div>

      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="rounded-[18px] border border-white/80 bg-white/68 px-4 py-4 text-sm text-slate-500">
            現在表示中のお知らせはありません。
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="rounded-[18px] border border-white/80 bg-white/68 px-4 py-3 shadow-sm backdrop-blur-md"
            >
              <div className="flex items-start gap-3">
                <span className={`mt-1 h-8 w-1 rounded-full ${lineClass}`} />
                <div className="flex-1">
                  <div className="text-xs font-medium text-slate-500">
                    {formatDate(item.created_at)}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-800">{item.title}</div>
                  <div className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{item.body}</div>

                  {item.file_url && item.file_name ? (
                    <a
                      href={item.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      添付: {item.file_name}
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Legend({
  label,
  className,
}: {
  label: string;
  className: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-4 w-4 rounded-[5px] ${className}`} />
      <span>{label}</span>
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
