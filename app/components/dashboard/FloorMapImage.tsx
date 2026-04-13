"use client";

import { useMemo, useState } from "react";

type SlotItem = {
  id: string;
  label: string;
};

type SlotPosition = {
  top: string;
  left: string;
  width: string;
  height: string;
  fontSize?: string;
};

const SLOT_POSITIONS: Record<string, SlotPosition> = {
  A: { top: "14.8%", left: "20.5%", width: "3.1%", height: "12%" },
  B: { top: "14.8%", left: "23.9%", width: "3.1%", height: "12%" },
  C: { top: "14.8%", left: "27.3%", width: "3.1%", height: "12%" },
  D: { top: "14.8%", left: "30.7%", width: "3.1%", height: "12%" },
  E: { top: "14.8%", left: "34.1%", width: "3.1%", height: "12%" },
  F: { top: "14.8%", left: "37.5%", width: "3.1%", height: "12%" },
  G: { top: "14.8%", left: "40.9%", width: "3.1%", height: "12%" },
  H: { top: "14.8%", left: "44.3%", width: "3.1%", height: "12%" },
  I: { top: "14.8%", left: "47.7%", width: "3.1%", height: "12%" },
  J: { top: "14.8%", left: "51.1%", width: "3.1%", height: "12%" },
  K: { top: "14.8%", left: "54.5%", width: "3.1%", height: "12%" },
  L: { top: "14.8%", left: "57.9%", width: "3.1%", height: "12%" },
  M: { top: "14.8%", left: "61.3%", width: "3.1%", height: "12%" },
  N: { top: "14.8%", left: "64.7%", width: "3.1%", height: "12%" },
  O: { top: "14.8%", left: "72.7%", width: "3.5%", height: "12%" },
  P: { top: "14.8%", left: "76.5%", width: "3.5%", height: "12%" },

  臨時4: { top: "39.8%", left: "9.1%", width: "8.5%", height: "7.2%" },
  臨時3: { top: "47.7%", left: "9.1%", width: "8.5%", height: "7.2%" },
  臨時2: { top: "55.6%", left: "9.1%", width: "8.5%", height: "7.2%" },
  臨時1: { top: "63.5%", left: "9.1%", width: "8.5%", height: "7.2%" },

  予備1: { top: "84.2%", left: "23.0%", width: "10.5%", height: "6.8%" },
  予備2: { top: "84.2%", left: "35.2%", width: "10.5%", height: "6.8%" },
};

function normalizeSlotLabel(label: string) {
  return label
    .trim()
    .replaceAll("１", "1")
    .replaceAll("２", "2")
    .replaceAll("３", "3")
    .replaceAll("４", "4")
    .replace(/\s+/g, "")
    .replace("予1", "予備1")
    .replace("予2", "予備2");
}

function getSlotPosition(label: string): SlotPosition | null {
  const normalized = normalizeSlotLabel(label);
  return SLOT_POSITIONS[normalized] ?? null;
}

export default function FloorMapImage({
  slots,
  isAdmin,
}: {
  slots: SlotItem[];
  isAdmin: boolean;
}) {
  const [parkedSlotIds, setParkedSlotIds] = useState<string[]>([]);

  const missingLabels = useMemo(() => {
    return slots
      .filter((slot) => !getSlotPosition(slot.label))
      .map((slot) => slot.label);
  }, [slots]);

  function toggleSlot(slotId: string) {
    if (!isAdmin) return;

    setParkedSlotIds((prev) =>
      prev.includes(slotId)
        ? prev.filter((id) => id !== slotId)
        : [...prev, slotId]
    );
  }

  if (typeof window !== "undefined" && missingLabels.length > 0) {
    console.log("FloorMapImage: position not found for labels =", missingLabels);
  }

  return (
    <div className="relative mx-auto w-full max-w-[980px] overflow-hidden rounded-[20px] border border-white/10 bg-[#0d1016] shadow-[0_18px_48px_rgba(0,0,0,0.32)]">
      <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_top,rgba(214,168,95,0.08),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01))]" />

      <img
        src="/images/parking-map.jpg"
        alt="フロアマップ"
        className="relative z-0 block w-full h-auto grayscale contrast-[0.92] brightness-[0.82] opacity-[0.88] mix-blend-screen"
      />

      <div className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(180deg,rgba(0,0,0,0.03),rgba(0,0,0,0.12))]" />

      {slots.map((slot) => {
        const normalizedLabel = normalizeSlotLabel(slot.label);
        const pos = getSlotPosition(slot.label);

        if (!pos) {
          return null;
        }

        const isParked = parkedSlotIds.includes(slot.id);

        return (
          <button
            key={slot.id}
            type="button"
            disabled={!isAdmin}
            onClick={() => toggleSlot(slot.id)}
            className={[
              "absolute z-20 flex items-center justify-center",
              "rounded-xl border text-[13px] font-semibold leading-none",
              "backdrop-blur-sm transition duration-200",
              "shadow-[0_10px_28px_rgba(0,0,0,0.20)]",
              isParked
                ? [
                    "border-slate-500/80",
                    "bg-slate-600/85",
                    "text-slate-50",
                    "shadow-[0_8px_24px_rgba(71,85,105,0.30)]",
                  ].join(" ")
                : [
                    "border-white/55",
                    "bg-white/88",
                    "text-slate-900",
                    "shadow-[0_10px_26px_rgba(255,255,255,0.10)]",
                  ].join(" "),
              isAdmin
                ? "cursor-pointer hover:-translate-y-0.5 hover:scale-[1.02] hover:border-amber-300/70 hover:shadow-[0_0_22px_rgba(214,168,95,0.22)]"
                : "cursor-default",
            ].join(" ")}
            style={{
              top: pos.top,
              left: pos.left,
              width: pos.width,
              height: pos.height,
              fontSize: pos.fontSize ?? "13px",
            }}
            title={normalizedLabel}
          >
            <span className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.18)]">
              {normalizedLabel}
            </span>
          </button>
        );
      })}
    </div>
  );
}