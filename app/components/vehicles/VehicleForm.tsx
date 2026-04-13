import { VehicleFormValues } from "@/types/vehicles";

type Props = {
  title: string;
  submitLabel: string;
  action: (formData: FormData) => Promise<void>;
  companyName: string;
  defaultValues?: VehicleFormValues;
  deleteSection?: React.ReactNode;
};

const VEHICLE_TYPE_OPTIONS = [
  "ハイエース",
  "ミニバン",
  "軽車両",
  "普通車",
  "2t車",
];

export default function VehicleForm({
  title,
  submitLabel,
  action,
  companyName,
  defaultValues,
  deleteSection,
}: Props) {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 md:px-6">
      <div className="mx-auto max-w-3xl rounded-[28px] bg-white p-6 shadow-sm md:p-8">
        <h1 className="text-3xl font-bold text-slate-900">{title}</h1>

        <form action={action} className="mt-8 space-y-6">
          {defaultValues?.id ? (
            <input type="hidden" name="vehicle_id" value={defaultValues.id} />
          ) : null}

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              会社名
            </label>
            <input
              type="text"
              value={companyName}
              readOnly
              className="w-full rounded-2xl border border-slate-300 bg-slate-100 px-4 py-3 text-slate-700 outline-none"
            />
            <p className="mt-2 text-xs text-slate-500">
              ログイン中の会社情報を自動表示しています。
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              車両ナンバー
            </label>

            <div className="space-y-3">
              <div>
                <input
                  type="text"
                  name="plate_region"
                  placeholder="例: 福岡"
                  defaultValue={defaultValues?.plate_region ?? ""}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <input
                  type="text"
                  name="plate_class"
                  placeholder="例: 100"
                  defaultValue={defaultValues?.plate_class ?? ""}
                  className="rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                  required
                />
                <input
                  type="text"
                  name="plate_kana"
                  placeholder="例: あ"
                  defaultValue={defaultValues?.plate_kana ?? ""}
                  className="rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                  required
                />
                <input
                  type="text"
                  name="plate_number"
                  placeholder="例: 1234"
                  defaultValue={defaultValues?.plate_number ?? ""}
                  className="rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <p className="mt-2 text-xs text-slate-500">
              例: 上段「福岡」 / 下段「100・あ・1234」
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              車種
            </label>
            <select
              name="vehicle_type"
              defaultValue={defaultValues?.vehicle_type ?? ""}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
            >
              <option value="">選択してください</option>
              {VEHICLE_TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              備考
            </label>
            <textarea
              name="note"
              placeholder="補足があれば入力"
              defaultValue={defaultValues?.note ?? ""}
              rows={4}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              id="is_active"
              type="checkbox"
              name="is_active"
              defaultChecked={defaultValues?.is_active ?? true}
              className="h-4 w-4"
            />
            <label htmlFor="is_active" className="text-sm font-semibold text-slate-700">
              使用可能
            </label>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="submit"
              className="rounded-full bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 active:translate-y-[1px] active:scale-[0.99]"
            >
              {submitLabel}
            </button>

            <a
              href="/vehicles"
              className="rounded-full bg-slate-200 px-6 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-300 active:translate-y-[1px] active:scale-[0.99]"
            >
              一覧へ戻る
            </a>
          </div>
        </form>

        {deleteSection ? <div className="mt-8">{deleteSection}</div> : null}
      </div>
    </main>
  );
}