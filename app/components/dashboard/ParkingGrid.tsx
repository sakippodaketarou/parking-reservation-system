import Image from "next/image";
import { toggleParkingSlotStatus } from "@/app/actions/parkingStatusActions";
import { ParkingSlotView } from "@/types/dashboard";

type Props = {
  slots: ParkingSlotView[];
  isAdmin: boolean;
};

type SlotPosition = {
  left: string;
  top: string;
};

const SLOT_POSITIONS: Record<string, SlotPosition> = {
  // A〜N
  A: { left: "22.7%", top: "25.2%" },
  B: { left: "26.0%", top: "25.2%" },
  C: { left: "30.5%", top: "18.2%" },
  D: { left: "33.8%", top: "18.2%" },
  E: { left: "38.5%", top: "18.2%" },
  F: { left: "41.8%", top: "18.2%" },
  G: { left: "46.4%", top: "18.2%" },
  H: { left: "49.8%", top: "18.2%" },
  I: { left: "54.4%", top: "18.2%" },
  J: { left: "57.8%", top: "18.2%" },
  K: { left: "62.3%", top: "18.2%" },
  L: { left: "65.7%", top: "18.2%" },
  M: { left: "69.9%", top: "18.2%" },
  N: { left: "73.3%", top: "18.2%" },

  // O〜P
  O: { left: "77.8%", top: "18.2%" },
  P: { left: "81.6%", top: "18.2%" },

  // 臨時
  臨時1: { left: "19.3%", top: "72.3%" },
  臨時2: { left: "19.3%", top: "65.5%" },
  臨時3: { left: "19.3%", top: "58.5%" },
  臨時4: { left: "19.3%", top: "51.5%" },

  // 予備
  予備1: { left: "27.7%", top: "88.7%" },
  予備2: { left: "39.8%", top: "88.7%" },
};

function getCountStatus(slots: ParkingSlotView[]) {
  return {
    emptyCount: slots.filter((slot) => slot.current_status === "empty").length,
    occupiedCount: slots.filter((slot) => slot.current_status === "occupied").length,
  };
}

function getBadgeStyle(status: ParkingSlotView["current_status"]) {
  switch (status) {
    case "occupied":
      return "bg-slate-500 text-white border border-slate-600";
    case "empty":
    default:
      return "bg-emerald-600 text-white border border-emerald-700";
  }
}

function getLegendLabel(status: ParkingSlotView["current_status"]) {
  switch (status) {
    case "occupied":
      return "駐車中";
    case "empty":
    default:
      return "空き";
  }
}

function sortSlots(slots: ParkingSlotView[]) {
  const order = [
    "臨時1",
    "臨時2",
    "臨時3",
    "臨時4",
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
    "予備1",
    "予備2",
  ];

  return order
    .map((name) => slots.find((slot) => slot.slot_name === name))
    .filter((slot): slot is ParkingSlotView => Boolean(slot));
}

export default function ParkingGrid({ slots, isAdmin }: Props) {
  const { emptyCount, occupiedCount } = getCountStatus(slots);
  const sortedSlots = sortSlots(slots);

  return (
    <section className="rounded-[28px] bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">
          車室の現在状況
        </h2>
        <span className="rounded-full bg-slate-100 px-4 py-1.5 text-sm font-semibold text-slate-600">
          リアルタイム
        </span>
      </div>

      <div className="mb-5 flex flex-wrap gap-3 text-sm">
        <div className="rounded-full bg-slate-100 px-4 py-2 font-semibold text-slate-700">
          空き {emptyCount}
        </div>
        <div className="rounded-full bg-slate-300 px-4 py-2 font-semibold text-slate-700">
          駐車中 {occupiedCount}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 text-xs">
        <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-slate-700">
          <span className="inline-block h-3 w-3 rounded-full bg-emerald-600" />
          空き
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-slate-700">
          <span className="inline-block h-3 w-3 rounded-full bg-slate-500" />
          駐車中
        </div>
      </div>

      <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">駐車場マップ</h3>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
            {isAdmin ? "管理者更新可" : "閲覧専用"}
          </span>
        </div>

        <div className="relative overflow-hidden rounded-[18px] border border-slate-200 bg-white">
          <Image
            src="/images/parking-map.jpg"
            alt="駐車場レイアウト図"
            width={1200}
            height={800}
            className="h-auto w-full object-contain"
            priority
          />

          {sortedSlots.map((slot) => {
            const position = SLOT_POSITIONS[slot.slot_name];
            if (!position) return null;

            const isVerticalSlot = [
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
            ].includes(slot.slot_name);

            const commonClassName = `flex items-center justify-center rounded-lg font-bold shadow-md transition ${getBadgeStyle(
              slot.current_status
            )} ${
              isAdmin
                ? "cursor-pointer hover:brightness-95 active:translate-y-[1px] active:scale-[0.99]"
                : ""
            } ${
              isVerticalSlot
                ? "h-[68px] w-[22px] text-[10px] md:h-[76px] md:w-[24px] md:text-[11px]"
                : "min-w-[54px] px-2.5 py-1.5 text-xs"
            }`;

            const commonStyle = isVerticalSlot
              ? {
                  writingMode: "vertical-rl" as const,
                  textOrientation: "upright" as const,
                  letterSpacing: "0.02em",
                }
              : {};

            return (
              <div
                key={slot.id}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: position.left,
                  top: position.top,
                }}
              >
                {isAdmin ? (
                  <form action={toggleParkingSlotStatus}>
                    <input type="hidden" name="slot_id" value={slot.id} />
                    <button
                      type="submit"
                      className={commonClassName}
                      style={commonStyle}
                      title={`${slot.slot_name}：${getLegendLabel(
                        slot.current_status
                      )}（クリックで切替）`}
                    >
                      {slot.slot_name}
                    </button>
                  </form>
                ) : (
                  <div
                    className={commonClassName}
                    style={commonStyle}
                    title={`${slot.slot_name}：${getLegendLabel(slot.current_status)}`}
                  >
                    {slot.slot_name}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p className="mt-4 text-sm leading-6 text-slate-500">
          {isAdmin
            ? "管理者はマップ上のバースをクリックして、空き / 駐車中 を更新できます。"
            : "このエリアは状況確認専用です。"}
        </p>
      </div>
    </section>
  );
}