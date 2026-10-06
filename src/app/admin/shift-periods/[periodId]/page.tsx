import { notFound } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { StatusMessage } from "@/components/admin/StatusMessage";
import { BusinessDaySettingSelect } from "@/components/admin/BusinessDaySettingSelect";
import {
  findShiftPeriodById,
  listShiftSlotsByPeriodId,
} from "@/repositories/shiftPeriodRepository";
import { listActiveEmployees } from "@/repositories/employeeRepository";
import { listAssignmentsByShiftPeriodId } from "@/repositories/assignmentRepository";
import {
  listAvailabilitySubmissionsByPeriodId,
  listSubmittedAvailabilitiesByPeriodId,
} from "@/repositories/availabilityRepository";
import { compareShiftSlots } from "@/lib/shifts/shiftSlotSorting";
import { requiresPositionSkill } from "@/lib/shifts/shiftTemplates";
import { getDateKeysInRange } from "@/lib/shifts/shiftTemplates";
import { getBusinessDayLabel, isWithinBusinessHours, resolveBusinessDay } from "@/lib/shifts/businessHours";
import { listBusinessDayOverrides } from "@/repositories/businessDayRepository";
import {
  assignEmployeeAction,
  autoAssignShiftPeriodAction,
  closeShiftPeriodAction,
  createFixedShiftSlotsAction,
  deleteShiftPeriodAction,
  deleteShiftAssignmentAction,
  deleteShiftSlotAction,
  updateBusinessDayAction,
} from "../actions";

type ShiftPeriodDetailPageProps = {
  params: Promise<{
    periodId: string;
  }>;
  searchParams?: Promise<{
    created?: string;
    error?: string;
    assigned?: string;
    assignError?: string;
    autoAssigned?: string;
    autoRemaining?: string;
    closed?: string;
    date?: string;
    fixedCreated?: string;
    slotDeleted?: string;
    unassigned?: string;
    businessDayUpdated?: string;
  }>;
};

const statusLabels = {
  draft: "下書き",
  open: "受付中",
  closed: "締切",
  published: "公開済み",
};

const presetGroupLabels: Record<string, string> = {
  weekday_lunch: "平日ランチ",
  weekday_dinner: "平日ディナー",
  holiday_lunch: "土日祝ランチ",
  holiday_dinner: "土日祝ディナー",
  manual: "手入力",
};

const assignErrorMessages: Record<string, string> = {
  employee_not_found: "有効な従業員を選択してください。",
  requires_open: "この固定シフトには開店作業経験が必要です。",
  requires_close: "この固定シフトには閉店作業経験が必要です。",
  slot_full: "この固定シフトにはこれ以上割り当てできません。",
  slot_not_found: "固定シフトが見つかりません。",
  outside_business_hours: "定休日または営業時間外の固定シフトには割り当てできません。",
  position_skill: "この従業員は対象ポジションに対応可能として登録されていません。",
  availability_unavailable:
    "この従業員は希望シフトで入れないと回答しています。",
  late_night_restricted:
    "18歳未満・高校生の従業員は22時以降にかかる固定シフトへ割り当てできません。",
};

const weekdayLabels = ["日", "月", "火", "水", "木", "金", "土"];
const lateNightStartMinutes = 22 * 60;

function formatTime(time?: string | null) {
  return time ? time.slice(0, 5) : null;
}

function parseTimeToMinutes(time: string) {
  const [hours, minutes] = time.slice(0, 5).split(":").map(Number);

  return hours * 60 + minutes;
}

function endsAfterLateNightStart(endTime: string) {
  return parseTimeToMinutes(endTime) > lateNightStartMinutes;
}

function slotsOverlap(
  first: { workDate: string; startTime: string; endTime: string },
  second: { workDate: string; startTime: string; endTime: string },
) {
  if (first.workDate !== second.workDate) {
    return false;
  }

  return (
    parseTimeToMinutes(first.startTime) < parseTimeToMinutes(second.endTime) &&
    parseTimeToMinutes(second.startTime) < parseTimeToMinutes(first.endTime)
  );
}

function formatDateTabLabel(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  const dayOfWeek = new Date(Date.UTC(year, month - 1, day)).getUTCDay();

  return `${Number(month)}/${Number(day)}(${weekdayLabels[dayOfWeek]})`;
}

export default async function ShiftPeriodDetailPage({
  params,
  searchParams,
}: ShiftPeriodDetailPageProps) {
  const { periodId } = await params;
  const [
    period,
    slots,
    employees,
    assignments,
    availabilitySubmissions,
    submittedAvailabilities,
    businessDayOverrides,
    query,
  ] =
    await Promise.all([
    findShiftPeriodById(periodId),
    listShiftSlotsByPeriodId(periodId),
    listActiveEmployees(),
    listAssignmentsByShiftPeriodId(periodId),
    listAvailabilitySubmissionsByPeriodId(periodId),
    listSubmittedAvailabilitiesByPeriodId(periodId),
    listBusinessDayOverrides(periodId),
    searchParams,
  ]);

  if (!period) {
    notFound();
  }

  const overridesByDate = new Map(
    businessDayOverrides.map((override) => [override.workDate, override]),
  );
  const businessDates = getDateKeysInRange(period.startDate, period.endDate);
  const invalidExistingSlotCount = slots.filter(
    (slot) =>
      !isWithinBusinessHours(
        slot.startTime,
        slot.endTime,
        resolveBusinessDay(slot.workDate, overridesByDate.get(slot.workDate)),
      ),
  ).length;

  const assignmentsBySlotId = new Map<string, typeof assignments>();

  for (const assignment of assignments) {
    const slotAssignments = assignmentsBySlotId.get(assignment.shiftSlotId) ?? [];
    slotAssignments.push(assignment);
    assignmentsBySlotId.set(assignment.shiftSlotId, slotAssignments);
  }

  const slotsById = new Map(slots.map((slot) => [slot.id, slot]));
  const assignedSlotsByEmployeeId = new Map<
    string,
    { assignmentId: string; slot: typeof slots[number] }[]
  >();

  for (const assignment of assignments) {
    if (assignment.status !== "assigned") {
      continue;
    }

    const slot = slotsById.get(assignment.shiftSlotId);

    if (!slot) {
      continue;
    }

    const employeeSlots =
      assignedSlotsByEmployeeId.get(assignment.employeeId) ?? [];
    employeeSlots.push({ assignmentId: assignment.id, slot });
    assignedSlotsByEmployeeId.set(assignment.employeeId, employeeSlots);
  }

  const overlappedAssignmentIds = new Set<string>();

  for (const employeeSlots of assignedSlotsByEmployeeId.values()) {
    for (let index = 0; index < employeeSlots.length; index += 1) {
      const current = employeeSlots[index];

      for (
        let comparisonIndex = index + 1;
        comparisonIndex < employeeSlots.length;
        comparisonIndex += 1
      ) {
        const comparison = employeeSlots[comparisonIndex];

        if (slotsOverlap(current.slot, comparison.slot)) {
          overlappedAssignmentIds.add(current.assignmentId);
          overlappedAssignmentIds.add(comparison.assignmentId);
        }
      }
    }
  }

  const slotDates = Array.from(new Set(slots.map((slot) => slot.workDate)));
  const selectedDate =
    query?.date && slotDates.includes(query.date)
      ? query.date
      : (slotDates[0] ?? null);
  const visibleSlots = selectedDate
    ? [...slots.filter((slot) => slot.workDate === selectedDate)].sort(compareShiftSlots)
    : [];
  const requestHeaders = await headers();
  const host = requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  const origin = host ? `${protocol}://${host}` : "";
  const commonAvailabilityUrl = origin
    ? `${origin}/availability/periods/${period.id}`
    : `/availability/periods/${period.id}`;
  const availabilitySubmissionByEmployeeId = new Map(
    availabilitySubmissions.map((submission) => [
      submission.employeeId,
      submission,
    ]),
  );
  const unavailableEmployeeIdsBySlotId = new Map<string, Set<string>>();

  for (const availability of submittedAvailabilities) {
    if (availability.status !== "unavailable") {
      continue;
    }

    const employeeIds =
      unavailableEmployeeIdsBySlotId.get(availability.shiftSlotId) ?? new Set();
    employeeIds.add(availability.employeeId);
    unavailableEmployeeIdsBySlotId.set(availability.shiftSlotId, employeeIds);
  }
  return (
    <main className="min-h-screen bg-slate-50">
      <AdminHeader currentPath="/admin/shift-periods" title={period.name} />

      <div className="mx-auto grid max-w-6xl gap-5 px-6 py-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <section className="min-w-0 space-y-4">
          <Link
            className="inline-flex rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            href="/admin/shift-periods"
          >
            期間一覧へ戻る
          </Link>

          <div className="rounded-md border border-slate-200 bg-white p-5">
            <h2 className="text-base font-semibold text-slate-950">期間情報</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-slate-500">日付</dt>
                <dd className="mt-1 font-medium text-slate-900">
                  {period.startDate} から {period.endDate}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">状態</dt>
                <dd className="mt-1 font-medium text-slate-900">
                  {statusLabels[period.status]}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">提出期限</dt>
                <dd className="mt-1 font-medium text-slate-900">
                  {period.submissionDeadline
                    ? period.submissionDeadline.toLocaleString("ja-JP")
                    : "未設定"}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-5">
            <h2 className="text-base font-semibold text-slate-950">期間操作</h2>
            <div className="mt-4 space-y-3">
              {period.status === "open" ? (
                <form action={closeShiftPeriodAction}>
                  <input name="shiftPeriodId" type="hidden" value={period.id} />
                  <input name="returnTo" type="hidden" value="detail" />
                  <button
                    className="w-full rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                    type="submit"
                  >
                    受付を締め切る
                  </button>
                </form>
              ) : (
                <p className="text-sm text-slate-600">
                  受付中の期間だけ、この画面から締切に変更できます。
                </p>
              )}
              <form action={deleteShiftPeriodAction}>
                <input name="shiftPeriodId" type="hidden" value={period.id} />
                <button
                  className="w-full rounded-md border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                  type="submit"
                >
                  このシフト期間を削除
                </button>
              </form>
              <p className="text-xs leading-5 text-slate-500">
                削除すると、この期間の固定シフト、希望、割当も一緒に削除されます。
              </p>
            </div>
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-5">
            <h2 className="text-base font-semibold text-slate-950">
              固定シフトを作成
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              期間内の各日に、平日ランチ・平日ディナー、または土日祝ランチ・土日祝ディナーを固定で作成します。
              既に同じ固定シフトがある場合は追加しません。
            </p>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              祝日も土日祝用の枠を使い、各日の閉店時刻に合わせて終了時刻を調整します。定休日には作成しません。
            </p>
            <form action={createFixedShiftSlotsAction} className="mt-5">
              <input name="shiftPeriodId" type="hidden" value={period.id} />
              <button
                className="w-full rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700"
                type="submit"
              >
                期間全体の固定シフトを作成
              </button>
            </form>
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-5">
            <h2 className="text-base font-semibold text-slate-950">
              希望提出URL
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              このURLを全員に共有してください。従業員は画面で自分の名前を選んで希望を提出します。
            </p>
            <code className="mt-3 block break-all rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900">
              {commonAvailabilityUrl}
            </code>
            <div className="mt-4 space-y-2">
              {employees.length === 0 ? (
                <p className="text-sm text-slate-600">
                  有効な従業員がいません。
                </p>
              ) : null}
              {employees.map((employee) => {
                const submission = availabilitySubmissionByEmployeeId.get(employee.id);

                return (
                  <div
                    className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2"
                    key={employee.id}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {employee.displayName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {submission?.submittedAt
                          ? `提出済み / ${submission.submittedAt.toLocaleString("ja-JP")}`
                          : "未提出"}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-md px-2 py-1 text-xs font-medium ${
                        submission?.submittedAt
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {submission?.submittedAt ? "提出済み" : "未提出"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="min-w-0 space-y-4">
          {query?.created ? <StatusMessage>シフト期間を作成しました。</StatusMessage> : null}
          {query?.fixedCreated ? (
            <StatusMessage>
              固定シフトを{query.fixedCreated}件作成しました。
            </StatusMessage>
          ) : null}
          {query?.slotDeleted ? <StatusMessage>固定シフトを削除しました。</StatusMessage> : null}
          {query?.assigned ? <StatusMessage>従業員を割り当てました。</StatusMessage> : null}
          {query?.autoAssigned ? (
            <StatusMessage>
              自動割当で{query.autoAssigned}件を追加しました。
              {query.autoRemaining && Number(query.autoRemaining) > 0
                ? ` 未割当の必要人数が${query.autoRemaining}件残っています。`
                : ""}
            </StatusMessage>
          ) : null}
          {query?.unassigned ? <StatusMessage>割当を解除しました。</StatusMessage> : null}
          {query?.closed ? <StatusMessage>シフト期間を締切にしました。</StatusMessage> : null}
          {query?.businessDayUpdated ? <StatusMessage>営業時間を保存しました。</StatusMessage> : null}
          {query?.error === "conflicting_slots" ? (
            <StatusMessage tone="error">
              この日の既存シフトが新しい営業時間と重なります。対象のシフトを削除してから変更してください。
            </StatusMessage>
          ) : null}
          {query?.error === "businessHours" || query?.error === "invalid_date" ? (
            <StatusMessage tone="error">
              定休日または営業時間外のため、シフトを作成・変更できません。
            </StatusMessage>
          ) : null}
          {query?.error === "token" ? (
            <StatusMessage tone="error">
              希望提出URLを発行できませんでした。
            </StatusMessage>
          ) : null}
          {query?.error === "periodLength" ? (
            <StatusMessage tone="error">
              固定シフトは1週間から2週間の期間で作成してください。
            </StatusMessage>
          ) : null}
          {query?.assignError ? (
            <StatusMessage tone="error">
              {assignErrorMessages[query.assignError] ??
                "割当できませんでした。条件と人数を確認してください。"}
            </StatusMessage>
          ) : null}
          {invalidExistingSlotCount > 0 ? (
            <StatusMessage tone="error">
              現在の営業時間に合わない既存シフトが{invalidExistingSlotCount}件あります。
              対象の枠を確認してください。これらは新しい割当と勤務希望の対象から除外されます。
            </StatusMessage>
          ) : null}

          <div className="rounded-md border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-base font-semibold text-slate-950">日ごとの営業時間</h2>
              <p className="mt-1 text-sm text-slate-600">
                自動では火曜日を定休日とし、ほかの日は翌日が土日祝なら22:00、それ以外は21:00まで営業します。
              </p>
            </div>
            <div className="divide-y divide-slate-200">
              {businessDates.map((date) => {
                const override = overridesByDate.get(date);
                const businessDay = resolveBusinessDay(date, override);
                const selectedSetting = override
                  ? override.isClosed
                    ? "closed"
                    : override.closingTime?.slice(0, 5) ?? "auto"
                  : "auto";

                return (
                  <form
                    action={updateBusinessDayAction}
                    className="flex flex-wrap items-center gap-3 px-5 py-3"
                    key={date}
                  >
                    <input name="shiftPeriodId" type="hidden" value={period.id} />
                    <input name="workDate" type="hidden" value={date} />
                    <div className="min-w-[120px] flex-1">
                      <p className="text-sm font-medium text-slate-950">{formatDateTabLabel(date)}</p>
                      <p className="text-xs text-slate-600">
                        {getBusinessDayLabel(businessDay)} / {businessDay.isManualOverride ? "手動" : "自動"}
                      </p>
                    </div>
                    <label className="sr-only" htmlFor={`business-day-${date}`}>
                      {formatDateTabLabel(date)}の営業設定
                    </label>
                    <BusinessDaySettingSelect
                      defaultValue={selectedSetting}
                      id={`business-day-${date}`}
                    />
                  </form>
                );
              })}
            </div>
          </div>

          <div className="rounded-md border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-5 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-950">
                    固定シフト一覧
                  </h2>
                  {selectedDate ? (
                    <p className="mt-1 text-sm text-slate-600">
                      {formatDateTabLabel(selectedDate)} の固定シフトを表示しています。
                    </p>
                  ) : null}
                </div>
                {slots.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    <form action={autoAssignShiftPeriodAction}>
                      <input name="shiftPeriodId" type="hidden" value={period.id} />
                      <button
                        className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
                        type="submit"
                      >
                        自動割当
                      </button>
                    </form>
                    <Link
                      className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
                      href={`/admin/shift-periods/${period.id}/export.xlsx`}
                    >
                      罫線つきExcel
                    </Link>
                  </div>
                ) : (
                  <span className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-400">
                    出力
                  </span>
                )}
              </div>
            </div>
            {slotDates.length > 0 ? (
              <div className="flex gap-2 overflow-x-auto border-b border-slate-200 px-5 py-3">
                {slotDates.map((date) => (
                  <Link
                    className={`shrink-0 rounded-md px-3 py-2 text-sm font-medium transition ${
                      selectedDate === date
                        ? "bg-slate-900 text-white"
                        : "border border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                    href={`/admin/shift-periods/${period.id}?date=${date}`}
                    key={date}
                  >
                    {formatDateTabLabel(date)}
                  </Link>
                ))}
              </div>
            ) : null}
            <div className="overflow-x-auto">
              {slots.length === 0 ? (
                <p className="px-5 py-6 text-sm text-slate-600">
                  まだ固定シフトがありません。
                </p>
              ) : null}
              {slots.length > 0 && visibleSlots.length === 0 ? (
                <p className="px-5 py-6 text-sm text-slate-600">
                  この日付の固定シフトはありません。
                </p>
              ) : null}
              {visibleSlots.length > 0 ? (
                <div className="min-w-[780px] divide-y divide-slate-200">
                  <div className="grid grid-cols-[110px_120px_160px_minmax(280px,1fr)_72px] items-center gap-3 bg-slate-50 px-5 py-2 text-xs font-medium text-slate-500">
                    <span>ポジション</span>
                    <span>時間</span>
                    <span>条件</span>
                    <span>割当</span>
                    <span className="text-right">削除</span>
                  </div>
                  {visibleSlots.map((slot) => (
                    <div
                      className="grid grid-cols-[110px_120px_160px_minmax(280px,1fr)_72px] items-start gap-3 px-5 py-3"
                      key={slot.id}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-950">
                          {slot.roleLabel ?? "手入力"}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {slot.presetGroup
                            ? presetGroupLabels[slot.presetGroup] ?? slot.presetGroup
                            : "手入力"}
                          {slot.isBackup ? " / 予備" : ""}
                        </p>
                      </div>
                      <div className="text-sm text-slate-900">
                        <p>
                          {formatTime(slot.startTime)}-{formatTime(slot.endTime)}
                        </p>
                        {slot.breakStartTime ? (
                          <p className="mt-0.5 text-xs text-slate-500">
                            休憩 {formatTime(slot.breakStartTime)}-
                            {formatTime(slot.breakEndTime)}
                          </p>
                        ) : null}
                        {!isWithinBusinessHours(
                          slot.startTime,
                          slot.endTime,
                          resolveBusinessDay(slot.workDate, overridesByDate.get(slot.workDate)),
                        ) ? (
                          <p className="mt-1 text-xs font-medium text-red-700">営業時間外の既存枠</p>
                        ) : null}
                      </div>
                      <div className="space-y-1 text-xs text-slate-500">
                        <p>
                          {slot.requiresOpen ? "開店経験" : ""}
                          {slot.requiresOpen && slot.requiresClose ? " / " : ""}
                          {slot.requiresClose ? "閉店経験" : ""}
                          {!slot.requiresOpen && !slot.requiresClose ? "条件なし" : ""}
                        </p>
                        {slot.memo ? <p className="truncate">{slot.memo}</p> : null}
                      </div>
                      <div>
                        {(() => {
                          const slotAssignments =
                            assignmentsBySlotId.get(slot.id) ?? [];
                          const assignedEmployeeIds = new Set(
                            slotAssignments.map((assignment) => assignment.employeeId),
                          );
                          const unavailableEmployeeIds =
                            unavailableEmployeeIdsBySlotId.get(slot.id) ?? new Set();
                          const isValidBusinessSlot = isWithinBusinessHours(
                            slot.startTime,
                            slot.endTime,
                            resolveBusinessDay(slot.workDate, overridesByDate.get(slot.workDate)),
                          );
                          const assignableEmployees = isValidBusinessSlot ? employees.filter((employee) => {
                            if (assignedEmployeeIds.has(employee.id)) {
                              return false;
                            }

                            if (unavailableEmployeeIds.has(employee.id)) {
                              return false;
                            }

                            if (
                              slot.roleLabel &&
                              requiresPositionSkill(slot.roleLabel) &&
                              !employee.positionSkills.includes(slot.roleLabel)
                            ) {
                              return false;
                            }

                            if (slot.requiresOpen && !employee.canOpen) {
                              return false;
                            }

                            if (slot.requiresClose && !employee.canClose) {
                              return false;
                            }

                            if (
                              employee.isHighSchoolStudent &&
                              endsAfterLateNightStart(slot.endTime)
                            ) {
                              return false;
                            }

                            return true;
                          }) : [];
                          const remainingCount =
                            slot.requiredEmployees - slotAssignments.length;

                          return (
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-2 text-xs">
                                {slotAssignments.length === 0 ? (
                                  <span className="text-slate-400">未割当</span>
                                ) : null}
                                {slotAssignments.map((assignment) => (
                                  <form
                                    action={deleteShiftAssignmentAction}
                                    className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 ${
                                      overlappedAssignmentIds.has(assignment.id)
                                        ? "border-red-300 bg-red-50"
                                        : "border-slate-200 bg-slate-50"
                                    }`}
                                    key={assignment.id}
                                  >
                                    <input
                                      name="shiftPeriodId"
                                      type="hidden"
                                      value={period.id}
                                    />
                                    {selectedDate ? (
                                      <input
                                        name="selectedDate"
                                        type="hidden"
                                        value={selectedDate}
                                      />
                                    ) : null}
                                    <input
                                      name="assignmentId"
                                      type="hidden"
                                      value={assignment.id}
                                    />
                                    <span
                                      className={`max-w-24 truncate font-medium ${
                                        overlappedAssignmentIds.has(assignment.id)
                                          ? "text-red-700"
                                          : "text-slate-900"
                                      }`}
                                    >
                                      {assignment.employeeDisplayName}
                                    </span>
                                    {overlappedAssignmentIds.has(assignment.id) ? (
                                      <span className="text-red-600">重複</span>
                                    ) : null}
                                    <button
                                      className="text-slate-500 hover:text-red-700"
                                      type="submit"
                                    >
                                      解除
                                    </button>
                                  </form>
                                ))}
                              </div>
                              {slotAssignments.some((assignment) =>
                                overlappedAssignmentIds.has(assignment.id),
                              ) ? (
                                <p className="text-xs font-medium text-red-600">
                                  同じ従業員が重なる時間帯に割り当てられています。
                                </p>
                              ) : null}

                              {remainingCount > 0 ? (
                                <div className="space-y-1">
                                  {assignableEmployees.length === 0 ? (
                                    <p className="text-xs font-medium text-red-600">
                                      割当可能な従業員がいません。
                                    </p>
                                  ) : null}
                                  <form
                                    action={assignEmployeeAction}
                                    className="flex items-center gap-2"
                                  >
                                    <input
                                      name="shiftPeriodId"
                                      type="hidden"
                                      value={period.id}
                                    />
                                    {selectedDate ? (
                                      <input
                                        name="selectedDate"
                                        type="hidden"
                                        value={selectedDate}
                                      />
                                    ) : null}
                                    <input
                                      name="shiftSlotId"
                                      type="hidden"
                                      value={slot.id}
                                    />
                                    <select
                                      className="h-8 min-w-0 flex-1 rounded-md border border-slate-300 px-2 text-xs disabled:border-red-200 disabled:bg-red-50 disabled:text-red-500"
                                      disabled={assignableEmployees.length === 0}
                                      name="employeeId"
                                      required
                                    >
                                      <option value="">従業員を選択</option>
                                      {assignableEmployees.map((employee) => (
                                        <option key={employee.id} value={employee.id}>
                                          {employee.displayName}
                                        </option>
                                      ))}
                                    </select>
                                    <button
                                      className="h-8 shrink-0 rounded-md bg-slate-900 px-3 text-xs font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-red-200 disabled:text-red-700"
                                      disabled={assignableEmployees.length === 0}
                                      type="submit"
                                    >
                                      割当
                                    </button>
                                  </form>
                                </div>
                              ) : null}
                            </div>
                          );
                        })()}
                      </div>
                      <form action={deleteShiftSlotAction} className="text-right">
                        <input
                          name="shiftPeriodId"
                          type="hidden"
                          value={period.id}
                        />
                        {selectedDate ? (
                          <input
                            name="selectedDate"
                            type="hidden"
                            value={selectedDate}
                          />
                        ) : null}
                        <input name="shiftSlotId" type="hidden" value={slot.id} />
                        <button
                          className="rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                          type="submit"
                        >
                          削除
                        </button>
                      </form>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
