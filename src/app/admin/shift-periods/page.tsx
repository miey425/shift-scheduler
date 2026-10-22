import Link from "next/link";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { StatusMessage } from "@/components/admin/StatusMessage";
import { ShiftPeriodCreateForm } from "@/components/admin/ShiftPeriodCreateForm";
import { listShiftPeriods } from "@/repositories/shiftPeriodRepository";
import {
  closeShiftPeriodAction,
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

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(500px,1.1fr)_minmax(0,1fr)] lg:gap-8">
        <section className="rounded-md border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="text-base font-semibold text-slate-950">
            シフト期間を作成
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            開始日と終了日を選択してください。1日だけの期間も作成できます。
          </p>
          <ShiftPeriodCreateForm />
        </section>

        <section className="space-y-4">
          {params?.closed ? (
            <StatusMessage>シフト期間を締切にしました。</StatusMessage>
          ) : null}
          {params?.deleted ? (
            <StatusMessage>シフト期間を削除しました。</StatusMessage>
          ) : null}
          {params?.error === "validation" ? <StatusMessage tone="error">期間名と日付を確認してください。終了日は開始日以降にしてください。</StatusMessage> : null}
          {params?.error === "database" ? (
            <StatusMessage tone="error">
              シフト期間を保存できませんでした。DB接続と入力値を確認してください。
            </StatusMessage>
          ) : null}
          {params?.error && !["validation", "database"].includes(params.error) ? (
            <StatusMessage tone="error">シフト期間を作成できませんでした。入力内容を確認してください。</StatusMessage>
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
                  className="relative grid gap-3 px-5 py-3 transition hover:bg-slate-50 md:grid-cols-[1fr_auto]"
                  key={period.id}
                >
                  <Link
                    aria-label={`${period.name}の詳細へ`}
                    className="absolute inset-0 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-slate-900"
                    href={`/admin/shift-periods/${period.id}`}
                  />
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
                    <span className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700">
                      詳細へ
                    </span>
                    {period.status === "open" ? (
                      <form action={closeShiftPeriodAction} className="relative z-10">
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
                    <form action={deleteShiftPeriodAction} className="relative z-10">
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
