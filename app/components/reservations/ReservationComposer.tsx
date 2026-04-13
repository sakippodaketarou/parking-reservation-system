"use client";

import { useMemo, useState } from "react";

type VehicleItem = {
  id: string;
  plate_region: string;
  plate_class: string;
  plate_kana: string;
  plate_number: string;
  vehicle_type: string | null;
  is_active: boolean;
};

type SlotItem = {
  id: string;
  slot_name: string;
};

type Props = {
  title: string;
  submitLabel: string;
  action: (formData: FormData) => Promise<void>;
  vehicles: VehicleItem[];
  slots: SlotItem[];
  defaultValues?: {
    reservation_id?: string;
    vehicle_id?: string;
    slot_id?: string;
    reservation_date?: string;
    start_time?: string;
    end_time?: string;
  };
  deleteSection?: React.ReactNode;
};

function formatVehicle(vehicle: VehicleItem) {
  return `${vehicle.plate_region} ${vehicle.plate_class} ${vehicle.plate_kana} ${vehicle.plate_number}`;
}

const SLOT_ORDER = [
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

export default function ReservationComposer({
  title,
  submitLabel,
  action,
  vehicles,
  slots,
  defaultValues,
  deleteSection,
}: Props) {
  const [selectedVehicleId, setSelectedVehicleId] = useState(
    defaultValues?.vehicle_id ?? ""
  );
  const [selectedSlotId, setSelectedSlotId] = useState(
    defaultValues?.slot_id ?? ""
  );

  const sortedSlots = useMemo(() => {
    return SLOT_ORDER.map((name) =>
      slots.find((slot) => slot.slot_name === name)
    ).filter((slot): slot is SlotItem => Boolean(slot));
  }, [slots]);

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);
  const selectedSlot = slots.find((s) => s.id === selectedSlotId);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 md:px-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-[28px] bg-white p-6 shadow-sm md:p-8">
          <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            まず車両を1台選択し、そのあと予約するバースを選んでください。
          </p>
        </section>

        <form action={action} className="space-y-6">
          {defaultValues?.reservation_id ? (
            <input
              type="hidden"
              name="reservation_id"
              value={defaultValues.reservation_id}
            />
          ) : null}

          <input type="hidden" name="vehicle_id" value={selectedVehicleId} />
          <input type="hidden" name="slot_id" value={selectedSlotId} />

          <section className="rounded-[28px] bg-white p-6 shadow-sm md:p-8">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">① 車両を選択</h2>
              <span className="rounded-full bg-slate-100 px-4 py-1.5 text-sm font-semibold text-slate-600">
                1台選択
              </span>
            </div>

            {vehicles.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                使用可能な車両がありません。先に車両登録を行ってください。
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {vehicles.map((vehicle) => {
                  const selected = vehicle.id === selectedVehicleId;

                  return (
                    <button
                      key={vehicle.id}
                      type="button"
                      onClick={() => setSelectedVehicleId(vehicle.id)}
                      className={`rounded-[24px] border p-5 text-left shadow-sm transition ${
                        selected
                          ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                          : "border-slate-200 bg-white hover:shadow-md"
                      } active:translate-y-[1px] active:scale-[0.995]`}
                    >
                      <div className="text-lg font-bold text-slate-900">
                        {formatVehicle(vehicle)}
                      </div>
                      <div className="mt-2 text-sm text-slate-600">
                        {vehicle.vehicle_type || "車種未設定"}
                      </div>
                      <div className="mt-3">
                        {selected ? (
                          <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white">
                            選択中
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                            選択する
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rounded-[28px] bg-white p-6 shadow-sm md:p-8">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">② バースを選択</h2>
              <span className="rounded-full bg-slate-100 px-4 py-1.5 text-sm font-semibold text-slate-600">
                1枠選択
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
              {sortedSlots.map((slot) => {
                const selected = slot.id === selectedSlotId;

                return (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => setSelectedSlotId(slot.id)}
                    className={`rounded-[20px] border px-4 py-4 text-left shadow-sm transition ${
                      selected
                        ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                        : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                    } active:translate-y-[1px] active:scale-[0.995]`}
                  >
                    <div className="text-xl font-extrabold text-slate-900">
                      {slot.slot_name}
                    </div>
                    <div className="mt-3">
                      {selected ? (
                        <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white">
                          選択中
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-bold text-slate-700">
                          選択する
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-[28px] bg-white p-6 shadow-sm md:p-8">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">③ 日時を入力</h2>
              <span className="rounded-full bg-slate-100 px-4 py-1.5 text-sm font-semibold text-slate-600">
                予約確定
              </span>
            </div>

            <div className="mb-6 rounded-[20px] bg-slate-50 p-4">
              <div className="text-sm text-slate-500">選択中の内容</div>
              <div className="mt-2 text-base font-semibold text-slate-900">
                車両: {selectedVehicle ? formatVehicle(selectedVehicle) : "未選択"}
              </div>
              <div className="mt-1 text-base font-semibold text-slate-900">
                バース: {selectedSlot ? selectedSlot.slot_name : "未選択"}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  予約日
                </label>
                <input
                  type="date"
                  name="reservation_date"
                  defaultValue={defaultValues?.reservation_date ?? ""}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    開始時刻
                  </label>
                  <input
                    type="time"
                    name="start_time"
                    defaultValue={defaultValues?.start_time ?? ""}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    終了時刻
                  </label>
                  <input
                    type="time"
                    name="end_time"
                    defaultValue={defaultValues?.end_time ?? ""}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={!selectedVehicleId || !selectedSlotId}
                className="rounded-full bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 active:translate-y-[1px] active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {submitLabel}
              </button>

              <a
                href="/"
                className="rounded-full bg-slate-200 px-6 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-300 active:translate-y-[1px] active:scale-[0.99]"
              >
                トップへ戻る
              </a>
            </div>
          </section>
        </form>

        {deleteSection ? (
          <section className="rounded-[28px] bg-white p-6 shadow-sm md:p-8">
            {deleteSection}
          </section>
        ) : null}
      </div>
    </main>
  );
}