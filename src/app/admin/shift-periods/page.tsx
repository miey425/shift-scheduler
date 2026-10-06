import Link from "next/link";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { StatusMessage } from "@/components/admin/StatusMessage";
import { listShiftPeriods } from "@/repositories/shiftPeriodRepository";
import {
  closeShiftPeriodAction,
  createShiftPeriodAction,
  deleteShiftPeriodAction,
} from "./actions";

type ShiftPeriodsPageProps = {
  searchParams?: Promise<{
    closed?: string;
    deleted?: string;
    error?: string;
  }>;
};

const statusLabels = {
  draft: "下書き",
  open: "受付中",
  closed: "締切",
  published: "公開済み",
};

export default async function ShiftPeriodsPage({
  searchParams,
}: ShiftPeriodsPageProps) {
  const [periods, params] = await Promise.all([
    listShiftPeriods(),
    searchParams,
  ]);

  return (
    <main className="min-h-screen bg-slate-50">
      <AdminHeader currentPath="/admin/shift-periods" title="シフト期間管理" />

      <div className="mx-auto grid max-w-6xl gap-5 px-6 py-6 lg:grid-cols-[340px_1fr]">
        <section className="rounded-md border border-slate-200 bg-white p-5">
          <h2 className="text-base font-semibold text-slate-950">
            シフト期間を作成
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            シフト期間は1週間から2週間で作成してください。
          </p>
          <form action={createShiftPeriodAction} className="mt-5 space-y-4">
            <input name="status" type="hidden" value="open" />
            <label className="block">
              <span className="text-sm font-medium text-slate-700">期間名</span>
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                name="name"
                placeholder="2026年9月前半"
                required
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">開始日</span>
                <input
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                  name="startDate"
                  required
                  type="date"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">終了日</span>
                <input
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                  name="endDate"
                  required
                  type="date"
                />
              </label>
            </div>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">提出期限</span>
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                name="submissionDeadline"
                type="datetime-local"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">メモ</span>
              <textarea
                className="mt-1 min-h-20 w-full rounded-md border border-slate-300 px-3 py-2"
                name="memo"
              />
            </label>
            <button
              className="w-full rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700"
              type="submit"
            >
              作成
            </button>
          </form>
        </section>

        <section className="space-y-4">
          {params?.closed ? (
            <StatusMessage>シフト期間を締切にしました。</StatusMessage>
          ) : null}
          {params?.deleted ? (
            <StatusMessage>シフト期間を削除しました。</StatusMessage>
          ) : null}
          {params?.error ? (
            <StatusMessage tone="error">
              入力内容、期間の日数、またはDB接続を確認してください。
            </StatusMessage>
          ) : null}

          <div className="rounded-md border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-base font-semibold text-slate-950">
                シフト期間一覧
              </h2>
            </div>
            <div className="divide-y divide-slate-200">
              {periods.length === 0 ? (
                <p className="px-5 py-6 text-sm text-slate-600">
                  まだシフト期間がありません。
                </p>
              ) : null}
              {periods.map((period) => (
                <div
                  className="grid gap-3 px-5 py-3 transition hover:bg-slate-50 md:grid-cols-[1fr_auto]"
                  key={period.id}
                >
                  <div>
                    <h3 className="font-medium text-slate-950">{period.name}</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      {period.startDate} から {period.endDate}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 md:justify-end">
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                      {statusLabels[period.status]}
                    </span>
                    <Link
                      className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                      href={`/admin/shift-periods/${period.id}`}
                    >
                      詳細へ
                    </Link>
                    {period.status === "open" ? (
                      <form action={closeShiftPeriodAction}>
                        <input
                          name="shiftPeriodId"
                          type="hidden"
                          value={period.id}
                        />
                        <button
                          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                          type="submit"
                        >
                          締切
                        </button>
                      </form>
                    ) : null}
                    <form action={deleteShiftPeriodAction}>
                      <input
                        name="shiftPeriodId"
                        type="hidden"
                        value={period.id}
                      />
                      <button
                        className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
                        type="submit"
                      >
                        削除
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
