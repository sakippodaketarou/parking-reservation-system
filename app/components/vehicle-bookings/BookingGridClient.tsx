"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type GridSlot = {
  id: string;
  label: string;
};

export type GridVehicle = {
  id: string;
  label: string;
  typeLabel: string;
};

export type GridBooking = {
  id: string;
  slotId: string;
  vehicleId: string | null;
  companyId: string | null;
  companyName: string;
  startTime: string;
  endTime: string;
  isMine: boolean;
};

type Candidate = {
  id: string;
  slotId: string;
  startTime: string;
  endTime: string;
};

type Props = {
  selectedDate: string;
  selectedVehicleId: string;
  selectedVehicle: GridVehicle | null;
  vehicles: GridVehicle[];
  slots: GridSlot[];
  bookings: GridBooking[];
  listBookings: GridBooking[];
  timeLabels: string[];
  isAdmin: boolean;
  today: string;
  maxDate: string;
  createBookingsAction: (formData: FormData) => void | Promise<void>;
  deleteBookingAction: (formData: FormData) => void | Promise<void>;
};

type SlotMapPosition = {
  top: string;
  left: string;
  width: string;
  height: string;
  fontSize?: string;
};

const GUIDE_SESSION_KEY = "vehicle-booking-guide-hidden-in-session";

const SLOT_MAP_POSITIONS: Record<string, SlotMapPosition> = {
  A: { top: "16.5%", left: "23.5%", width: "3.4%", height: "10.5%" },
  B: { top: "16.5%", left: "27.2%", width: "3.4%", height: "10.5%" },
  C: { top: "16.5%", left: "30.9%", width: "3.4%", height: "10.5%" },
  D: { top: "16.5%", left: "34.6%", width: "3.4%", height: "10.5%" },
  E: { top: "16.5%", left: "38.3%", width: "3.4%", height: "10.5%" },
  F: { top: "16.5%", left: "42.0%", width: "3.4%", height: "10.5%" },
  G: { top: "16.5%", left: "45.7%", width: "3.4%", height: "10.5%" },
  H: { top: "16.5%", left: "49.4%", width: "3.4%", height: "10.5%" },
  I: { top: "16.5%", left: "53.1%", width: "3.4%", height: "10.5%" },
  J: { top: "16.5%", left: "56.8%", width: "3.4%", height: "10.5%" },
  K: { top: "16.5%", left: "60.5%", width: "3.4%", height: "10.5%" },
  L: { top: "16.5%", left: "64.2%", width: "3.4%", height: "10.5%" },
  M: { top: "16.5%", left: "67.9%", width: "3.4%", height: "10.5%" },
  N: { top: "16.5%", left: "71.6%", width: "3.4%", height: "10.5%" },
  O: { top: "16.5%", left: "78.4%", width: "3.4%", height: "10.5%" },
  P: { top: "16.5%", left: "82.1%", width: "3.4%", height: "10.5%" },

  臨時1: { top: "58.5%", left: "17.5%", width: "7.6%", height: "8.2%", fontSize: "11px" },
  臨時2: { top: "50.3%", left: "17.5%", width: "7.6%", height: "8.2%", fontSize: "11px" },
  臨時3: { top: "42.1%", left: "17.5%", width: "7.6%", height: "8.2%", fontSize: "11px" },
  臨時4: { top: "33.9%", left: "17.5%", width: "7.6%", height: "8.2%", fontSize: "11px" },

  予備1: { top: "74.8%", left: "28.0%", width: "8.8%", height: "7.8%", fontSize: "11px" },
  予備2: { top: "74.8%", left: "39.0%", width: "8.8%", height: "7.8%", fontSize: "11px" },
};

function timeToMinutes(value: string) {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

function overlaps(
  startA: string,
  endA: string,
  startB: string,
  endB: string
) {
  const a1 = timeToMinutes(startA);
  const a2 = timeToMinutes(endA);
  const b1 = timeToMinutes(startB);
  const b2 = timeToMinutes(endB);
  return a1 < b2 && b1 < a2;
}

function buildUrl(date: string, vehicle?: string) {
  const params = new URLSearchParams();
  params.set("date", date);
  if (vehicle) params.set("vehicle", vehicle);
  return `/vehicle-bookings?${params.toString()}`;
}

function addDays(dateStr: string, days: number) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function FakeScrollbar() {
  return (
    <div className="pointer-events-none absolute bottom-3 right-3 top-3 flex w-4 flex-col items-center justify-between rounded-full bg-slate-100 py-1">
      <div className="h-0 w-0 border-x-[5px] border-b-[7px] border-x-transparent border-b-slate-500" />
      <div className="h-16 w-2 rounded-full bg-slate-400" />
      <div className="h-0 w-0 border-x-[5px] border-t-[7px] border-x-transparent border-t-slate-500" />
    </div>
  );
}

function MapOverlay({
  slots,
  activeSlotId,
  onSlotClick,
  enlarged = false,
}: {
  slots: GridSlot[];
  activeSlotId: string | null;
  onSlotClick?: (slotId: string) => void;
  enlarged?: boolean;
}) {
  const activeLabel = activeSlotId
    ? slots.find((s) => s.id === activeSlotId)?.label
    : null;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-slate-200 bg-white ${
        enlarged ? "max-h-none" : ""
      }`}
    >
      <img
        src="/images/parking-map.jpg"
        alt="駐車場マップ"
        className="h-auto w-full"
      />

      {slots.map((slot) => {
        const pos = SLOT_MAP_POSITIONS[slot.label];
        if (!pos) return null;

        const isActive = activeLabel === slot.label;

        return (
          <button
            key={slot.id}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSlotClick?.(slot.id);
            }}
            className={`absolute flex items-center justify-center rounded-lg border-2 px-1 text-center font-bold shadow transition ${
              isActive
                ? "border-sky-500 bg-sky-500 text-white"
                : "border-white/70 bg-white/15 text-transparent hover:bg-sky-200/40"
            }`}
            style={{
              top: pos.top,
              left: pos.left,
              width: pos.width,
              height: pos.height,
              fontSize: enlarged ? "14px" : pos.fontSize ?? "12px",
            }}
            title={slot.label}
          >
            {isActive ? slot.label : ""}
          </button>
        );
      })}
    </div>
  );
}

export default function BookingGridClient({
  selectedDate,
  selectedVehicleId,
  selectedVehicle,
  vehicles,
  slots,
  bookings,
  listBookings,
  timeLabels,
  isAdmin,
  today,
  maxDate,
  createBookingsAction,
  deleteBookingAction,
}: Props) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragSlotId, setDragSlotId] = useState<string | null>(null);
  const [anchorIndex, setAnchorIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [searchText, setSearchText] = useState("");
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [dontShowGuideAgain, setDontShowGuideAgain] = useState(false);
  const [focusedSlotId, setFocusedSlotId] = useState<string | null>(null);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);

  const gridScrollRef = useRef<HTMLDivElement | null>(null);
  const slotHeaderRefs = useRef<Record<string, HTMLTableCellElement | null>>({});

  const maxSelectableCells = isAdmin ? Number.POSITIVE_INFINITY : 2;
  const activeSlotId = isDragging ? dragSlotId : focusedSlotId;

  useEffect(() => {
    function onMouseUp() {
      if (isDragging) {
        finalizeDrag();
      }
    }
    window.addEventListener("mouseup", onMouseUp);
    return () => window.removeEventListener("mouseup", onMouseUp);
  });

  useEffect(() => {
    const hidden = window.sessionStorage.getItem(GUIDE_SESSION_KEY);
    if (hidden !== "true") {
      setShowGuideModal(true);
    }
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsMapModalOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const bookingMap = useMemo(() => {
    const map = new Map<string, GridBooking>();
    for (const booking of bookings) {
      for (let i = 0; i < timeLabels.length - 1; i += 1) {
        const cellStart = timeLabels[i];
        const cellEnd = timeLabels[i + 1];
        if (overlaps(booking.startTime, booking.endTime, cellStart, cellEnd)) {
          map.set(`${booking.slotId}-${cellStart}`, booking);
        }
      }
    }
    return map;
  }, [bookings, timeLabels]);

  const candidateMap = useMemo(() => {
    const map = new Map<string, Candidate>();
    for (const candidate of candidates) {
      for (let i = 0; i < timeLabels.length - 1; i += 1) {
        const cellStart = timeLabels[i];
        const cellEnd = timeLabels[i + 1];
        if (overlaps(candidate.startTime, candidate.endTime, cellStart, cellEnd)) {
          map.set(`${candidate.slotId}-${cellStart}`, candidate);
        }
      }
    }
    return map;
  }, [candidates, timeLabels]);

  const dragPreviewKeys = useMemo(() => {
    const result = new Set<string>();
    if (!isDragging || !dragSlotId || anchorIndex === null || hoverIndex === null) {
      return result;
    }

    const min = Math.min(anchorIndex, hoverIndex);
    const max = Math.max(anchorIndex, hoverIndex);
    const limitedMax = Math.min(max, min + maxSelectableCells - 1);

    for (let i = min; i <= limitedMax; i += 1) {
      const cellStart = timeLabels[i];
      result.add(`${dragSlotId}-${cellStart}`);
    }
    return result;
  }, [anchorIndex, dragSlotId, hoverIndex, isDragging, maxSelectableCells, timeLabels]);

  const searchableBookings = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return listBookings;
    return listBookings.filter((booking) => {
      const slot = slotLabel(booking.slotId).toLowerCase();
      const company = (booking.companyName || "").toLowerCase();
      const time = `${booking.startTime} ${booking.endTime}`.toLowerCase();
      return slot.includes(q) || company.includes(q) || time.includes(q);
    });
  }, [listBookings, searchText]);

  function closeGuideModal() {
    if (dontShowGuideAgain) {
      window.sessionStorage.setItem(GUIDE_SESSION_KEY, "true");
    }
    setShowGuideModal(false);
  }

  function canUseCell(slotId: string, timeIndex: number) {
    const key = `${slotId}-${timeLabels[timeIndex]}`;
    if (bookingMap.has(key)) return false;
    if (candidateMap.has(key)) return false;
    return true;
  }

  function startDrag(slotId: string, timeIndex: number) {
    if (!selectedVehicleId) return;
    if (!canUseCell(slotId, timeIndex)) return;

    setFocusedSlotId(slotId);
    setIsDragging(true);
    setDragSlotId(slotId);
    setAnchorIndex(timeIndex);
    setHoverIndex(timeIndex);
  }

  function moveDrag(slotId: string, timeIndex: number) {
    if (!isDragging || !dragSlotId || anchorIndex === null) return;
    if (dragSlotId !== slotId) return;

    const min = Math.min(anchorIndex, timeIndex);
    const max = Math.max(anchorIndex, timeIndex);
    const limitedMax = Math.min(max, min + maxSelectableCells - 1);

    for (let i = min; i <= limitedMax; i += 1) {
      if (!canUseCell(slotId, i)) {
        return;
      }
    }

    setHoverIndex(limitedMax);
  }

  function finalizeDrag() {
    if (!isDragging || !dragSlotId || anchorIndex === null || hoverIndex === null) {
      setIsDragging(false);
      setDragSlotId(null);
      setAnchorIndex(null);
      setHoverIndex(null);
      return;
    }

    const min = Math.min(anchorIndex, hoverIndex);
    const max = Math.max(anchorIndex, hoverIndex);

    const candidate: Candidate = {
      id: `${dragSlotId}-${timeLabels[min]}-${timeLabels[max + 1]}`,
      slotId: dragSlotId,
      startTime: timeLabels[min],
      endTime: timeLabels[max + 1],
    };

    setCandidates((prev) => {
      const exists = prev.some(
        (item) =>
          item.slotId === candidate.slotId &&
          item.startTime === candidate.startTime &&
          item.endTime === candidate.endTime
      );
      if (exists) return prev;
      return [...prev, candidate];
    });

    setIsDragging(false);
    setDragSlotId(null);
    setAnchorIndex(null);
    setHoverIndex(null);
    setFocusedSlotId(null);
  }

  function clearCandidates() {
    setCandidates([]);
  }

  function removeCandidate(id: string) {
    setCandidates((prev) => prev.filter((item) => item.id !== id));
  }

  function slotLabel(slotId: string) {
    return slots.find((slot) => slot.id === slotId)?.label ?? "-";
  }

  function candidatePayload() {
    return JSON.stringify(
      candidates.map((item) => ({
        slotId: item.slotId,
        startTime: item.startTime,
        endTime: item.endTime,
      }))
    );
  }

  function moveDate(days: number) {
    const nextDate = addDays(selectedDate, days);
    if (!isAdmin) {
      if (nextDate < today || nextDate > maxDate) return;
    }
    window.location.href = buildUrl(nextDate, selectedVehicleId);
  }

  function handleDateChange(value: string) {
    if (!value) return;
    if (!isAdmin && (value < today || value > maxDate)) return;
    window.location.href = buildUrl(value, selectedVehicleId);
  }

  function focusSlot(slotId: string) {
    setFocusedSlotId(slotId);
    const el = slotHeaderRefs.current[slotId];
    const scroller = gridScrollRef.current;
    if (!el || !scroller) return;

    const targetLeft = el.offsetLeft - 120;
    scroller.scrollTo({
      left: Math.max(0, targetLeft),
      behavior: "smooth",
    });
  }

  const hasVehicle = !!selectedVehicleId;

  return (
    <>
      {showGuideModal ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-6xl rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-xl font-bold text-slate-900">予約画面の使い方</h2>
              <button
                type="button"
                onClick={closeGuideModal}
                className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
              >
                閉じる
              </button>
            </div>

            <div className="space-y-6 px-6 py-6">
              <div className="grid gap-6 lg:grid-cols-[420px_minmax(0,1fr)]">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <h3 className="mb-3 text-base font-bold text-slate-900">
                    ドラッグ操作イメージ
                  </h3>

                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                    <img
                      src="/images/booking-guide-drag.jpg"
                      alt="グリッドをクリックしながらドラッグする操作イメージ"
                      className="h-auto w-full"
                    />
                  </div>

                  <p className="mt-3 text-xs text-slate-500">
                    同じバース列を、開始時間から終了時間まで縦方向にドラッグしてください。
                  </p>
                </div>

                <div className="space-y-6">
                  <div className="rounded-2xl border border-slate-200 p-5">
                    <h3 className="mb-3 text-base font-bold text-slate-900">手順</h3>
                    <div className="space-y-2 text-sm text-slate-700">
                      <p>1. 左の「登録済み車両」から車両を選択</p>
                      <p>2. 予約したいバース列をクリックしたまま縦にドラッグ</p>
                      <p>3. 下の「選択中車室」に追加</p>
                      <p>4. 内容を確認して確定</p>
                      <p>5. 予約一覧から削除可能</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-5">
                    <h3 className="mb-3 text-base font-bold text-slate-900">色の見方</h3>
                    <div className="space-y-3 text-sm text-slate-700">
                      <div className="flex items-center gap-3">
                        <span className="inline-block h-5 w-10 rounded bg-blue-600" />
                        <span>自社予約</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="inline-block h-5 w-10 rounded bg-slate-400" />
                        <span>他社予約</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="inline-block h-5 w-10 rounded bg-sky-100 ring-1 ring-sky-300" />
                        <span>ドラッグ中</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4 border-t border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <label className="flex cursor-pointer items-center gap-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={dontShowGuideAgain}
                  onChange={(e) => setDontShowGuideAgain(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                今後は表示しない
              </label>

              <button
                type="button"
                onClick={closeGuideModal}
                className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-700"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isMapModalOpen ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-6xl rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">駐車場マップ拡大表示</h2>
                <p className="mt-1 text-sm text-slate-500">
                  バースをクリックすると該当列へ移動します。
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsMapModalOpen(false)}
                className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
              >
                閉じる
              </button>
            </div>

            <div className="p-6">
              <MapOverlay
                slots={slots}
                activeSlotId={activeSlotId}
                onSlotClick={(slotId) => {
                  focusSlot(slotId);
                  setIsMapModalOpen(false);
                }}
                enlarged
              />
            </div>
          </div>
        </div>
      ) : null}

      <div className="space-y-6">
        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="space-y-6">
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-lg font-bold text-slate-900">予約日</h2>

              <div className="mb-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => moveDate(-1)}
                  disabled={!isAdmin && selectedDate <= today}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                >
                  {"<"}
                </button>

                <input
                  type="date"
                  value={selectedDate}
                  min={!isAdmin ? today : undefined}
                  max={!isAdmin ? maxDate : undefined}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                />

                <button
                  type="button"
                  onClick={() => moveDate(1)}
                  disabled={!isAdmin && selectedDate >= maxDate}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                >
                  {">"}
                </button>
              </div>

              {!isAdmin ? (
                <p className="text-xs text-slate-500">
                  一般ユーザーは {today} 〜 {maxDate} の範囲で選択できます。
                </p>
              ) : null}
            </div>

            <div className="relative rounded-2xl bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">登録済み車両</h2>
                <span className="text-sm text-slate-500">{vehicles.length} 件</span>
              </div>

              <div className="max-h-[260px] overflow-y-auto pr-4">
                {vehicles.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                    先に車両登録をしてください。
                  </div>
                ) : (
                  <div className="space-y-3">
                    {vehicles.map((vehicle) => {
                      const isSelected = vehicle.id === selectedVehicleId;
                      return (
                        <button
                          key={vehicle.id}
                          type="button"
                          onClick={() => {
                            window.location.href = buildUrl(selectedDate, vehicle.id);
                          }}
                          className={`w-full rounded-2xl border p-4 text-left shadow-sm transition active:translate-y-[1px] active:scale-[0.99] ${
                            isSelected
                              ? "border-slate-900 bg-slate-900 text-white shadow-md"
                              : "border-slate-200 bg-white text-slate-900 hover:border-slate-400 hover:shadow-md"
                          }`}
                        >
                          <div className="text-sm font-semibold">{vehicle.label}</div>
                          <div
                            className={`mt-1 text-xs ${
                              isSelected ? "text-slate-200" : "text-slate-500"
                            }`}
                          >
                            {vehicle.typeLabel}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <FakeScrollbar />
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-lg font-bold text-slate-900">予約方法</h2>
              <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                <p>1. 左で車両を選択</p>
                <p>2. 同じバース列をクリックしたまま縦にドラッグ</p>
                <p>3. 下の「選択中車室」に追加</p>
                <p>4. 内容を確認して確定</p>
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 p-4">
                <div className="text-sm font-medium text-slate-700">選択中の車両</div>
                <div className="mt-2 text-sm text-slate-900">
                  {selectedVehicle ? (
                    <>
                      <div className="font-semibold">{selectedVehicle.label}</div>
                      <div className="text-xs text-slate-500">{selectedVehicle.typeLabel}</div>
                    </>
                  ) : (
                    <span className="text-slate-500">まだ選択されていません</span>
                  )}
                </div>
              </div>

              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-sm font-semibold text-slate-800">
                    選択中バース
                  </div>
                </div>

                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setIsMapModalOpen(true)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setIsMapModalOpen(true);
                    }
                  }}
                  className="block w-full cursor-pointer text-left"
                >
                  <MapOverlay
                    slots={slots}
                    activeSlotId={activeSlotId}
                    onSlotClick={focusSlot}
                  />
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                {isAdmin
                  ? "管理者は複数時間帯を制限なくドラッグできます。"
                  : "一般会社は最大1時間までしかドラッグできません。"}
              </div>
            </div>
          </aside>

          <section className="relative rounded-2xl bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">日別予約グリッド</h2>
                <p className="text-sm text-slate-500">対象日: {selectedDate}</p>
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-white px-3 py-1 text-slate-700 ring-1 ring-slate-300">
                  空き
                </span>
                <span className="rounded-full bg-blue-600 px-3 py-1 text-white">
                  自社予約
                </span>
                <span className="rounded-full bg-slate-400 px-3 py-1 text-white">
                  他社予約
                </span>
                <span className="rounded-full bg-sky-100 px-3 py-1 text-sky-700">
                  ドラッグ中
                </span>
              </div>
            </div>

            {!hasVehicle ? (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                左の「登録済み車両」から予約したい車両を選んでください。
              </div>
            ) : null}

            <div
              ref={gridScrollRef}
              className="max-h-[820px] overflow-auto rounded-2xl border border-slate-200"
            >
              <table className="w-max min-w-full border-separate border-spacing-0 select-none">
                <thead className="sticky top-0 z-30 bg-slate-50">
                  <tr>
                    <th className="sticky left-0 z-40 min-w-[84px] border-b border-r border-slate-200 bg-slate-50 px-3 py-3 text-left text-sm font-bold text-slate-800">
                      時刻
                    </th>
                    {slots.map((slot) => {
                      const isFocused = activeSlotId === slot.id;
                      return (
                        <th
                          key={slot.id}
                          ref={(el) => {
                            slotHeaderRefs.current[slot.id] = el;
                          }}
                          className={`min-w-[110px] border-b border-r border-slate-200 px-3 py-3 text-center text-sm font-bold ${
                            isFocused ? "bg-sky-100 text-sky-800" : "bg-slate-50 text-slate-800"
                          }`}
                        >
                          {slot.label}
                        </th>
                      );
                    })}
                  </tr>
                </thead>

                <tbody>
                  {timeLabels.slice(0, -1).map((time, timeIndex) => (
                    <tr key={time}>
                      <td className="sticky left-0 z-20 border-b border-r border-slate-200 bg-white px-3 py-0 text-sm font-medium text-slate-700">
                        <div className="h-12 leading-[48px]">{time}</div>
                      </td>

                      {slots.map((slot) => {
                        const key = `${slot.id}-${time}`;
                        const booking = bookingMap.get(key);
                        const candidate = candidateMap.get(key);
                        const previewing = dragPreviewKeys.has(key);
                        const isFocused = activeSlotId === slot.id;

                        let className =
                          "h-12 w-[110px] border-b border-r border-slate-200 transition";
                        let content: React.ReactNode = null;
                        let title = `${slot.label} ${time}`;

                        if (booking) {
                          className += booking.isMine
                            ? " bg-blue-600 text-white"
                            : " bg-slate-400 text-white";
                          title = `${slot.label} ${booking.startTime}〜${booking.endTime} / ${booking.companyName}`;
                          content = (
                            <div className="px-1 text-center text-[10px] font-semibold leading-tight">
                              {isAdmin ? booking.companyName : booking.isMine ? booking.companyName : ""}
                            </div>
                          );
                        } else if (candidate) {
                          className += " bg-sky-200 text-slate-900";
                          title = `${slot.label} ${candidate.startTime}〜${candidate.endTime}`;
                          content = (
                            <div className="px-2 text-center text-[11px] font-semibold leading-tight">
                              候補
                            </div>
                          );
                        } else if (previewing) {
                          className += " bg-sky-100";
                        } else {
                          className += hasVehicle
                            ? " bg-white hover:bg-sky-50"
                            : " bg-slate-50";
                        }

                        if (isFocused && !booking && !candidate && !previewing) {
                          className += " bg-sky-50";
                        }

                        return (
                          <td
                            key={key}
                            className={className}
                            title={title}
                            onMouseDown={() => startDrag(slot.id, timeIndex)}
                            onMouseEnter={() => moveDrag(slot.id, timeIndex)}
                          >
                            <div className="flex h-12 items-center justify-center">
                              {content}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <FakeScrollbar />
          </section>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="relative rounded-2xl bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">選択中車室</h2>
              <button
                type="button"
                onClick={clearCandidates}
                className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
              >
                候補をすべてクリア
              </button>
            </div>

            <div className="max-h-[380px] overflow-y-auto pr-4">
              {candidates.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                  まだ選択中の車室はありません。
                </div>
              ) : (
                <div className="space-y-3">
                  {candidates.map((candidate) => (
                    <div
                      key={candidate.id}
                      className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between"
                    >
                      <div>
                        <div className="text-sm font-semibold text-slate-900">
                          {slotLabel(candidate.slotId)} / {candidate.startTime} 〜 {candidate.endTime}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {selectedVehicle ? `${selectedVehicle.label} / ${selectedVehicle.typeLabel}` : "-"}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeCandidate(candidate.id)}
                        className="rounded-xl bg-red-50 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100"
                      >
                        削除
                      </button>
                    </div>
                  ))}

                  <form action={createBookingsAction} className="pt-2">
                    <input type="hidden" name="booking_date" value={selectedDate} />
                    <input type="hidden" name="vehicle_id" value={selectedVehicleId} />
                    <input
                      type="hidden"
                      name="payload"
                      value={candidatePayload()}
                    />
                    <button
                      type="submit"
                      disabled={!hasVehicle || candidates.length === 0}
                      className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      選択中車室を確定する
                    </button>
                  </form>
                </div>
              )}
            </div>

            <FakeScrollbar />
          </div>

          <div className="relative rounded-2xl bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">予約一覧</h2>
              <span className="text-sm text-slate-500">{searchableBookings.length} 件</span>
            </div>

            <div className="mb-4">
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="会社名・バース名・時間で検索"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
              />
            </div>

            <div className="max-h-[420px] overflow-y-auto pr-4">
              {searchableBookings.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                  条件に一致する予約はありません。
                </div>
              ) : (
                <div className="space-y-3">
                  {searchableBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between"
                    >
                      <div>
                        <div className="text-sm font-semibold text-slate-900">
                          {slotLabel(booking.slotId)} / {booking.startTime} 〜 {booking.endTime}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {booking.isMine ? `会社名: ${booking.companyName}` : booking.companyName}
                        </div>
                      </div>

                      {booking.isMine || isAdmin ? (
                        <form action={deleteBookingAction}>
                          <input type="hidden" name="booking_id" value={booking.id} />
                          <input type="hidden" name="booking_date" value={selectedDate} />
                          <input type="hidden" name="vehicle_id" value={selectedVehicleId} />
                          <button
                            type="submit"
                            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
                          >
                            削除
                          </button>
                        </form>
                      ) : (
                        <span className="rounded-xl bg-slate-100 px-4 py-2 text-sm text-slate-500">
                          他社予約
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <FakeScrollbar />
          </div>
        </section>
      </div>
    </>
  );
}