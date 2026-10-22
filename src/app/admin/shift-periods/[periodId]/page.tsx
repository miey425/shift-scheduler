import { notFound } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { StatusMessage } from "@/components/admin/StatusMessage";
import { BusinessDaySettingSelect } from "@/components/admin/BusinessDaySettingSelect";
import { ShiftAssignmentPicker } from "@/components/admin/ShiftAssignmentPicker";
import {
  findShiftPeriodById,
  listShiftSlotsByPeriodId,
} from "@/repositories/shiftPeriodRepository";
import { listActiveEmployees, listEmployees } from "@/repositories/employeeRepository";
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
import { calculateEstimatedPay, formatWorkingTime, formatYen } from "@/lib/shifts/estimatedPay";
import { encodeShiftPeriodId } from "@/lib/availability/shortUrl";
import {
  autoAssignShiftPeriodAction,
  closeShiftPeriodAction,
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
    fixedError?: string;
    selectorCount?: string;
    slotDeleted?: string;
    unassigned?: string;
    businessDayUpdated?: string;
    tab?: string;
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
  requires_open: "このシフトには開店作業経験が必要です。",
  requires_close: "このシフトには閉店作業経験が必要です。",
  slot_not_found: "シフトが見つかりません。",
  outside_business_hours: "定休日または営業時間外のシフトには割り当てできません。",
  position_skill: "この従業員は対象ポジションに対応可能として登録されていません。",
  availability_unavailable:
    "この従業員は希望シフトで入れないと回答しています。",
  late_night_restricted:
    "18歳未満・高校生の従業員は22時以降にかかるシフトへ割り当てできません。",
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
    wageEmployees,
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
    listEmployees(),
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
  const payableShiftsByEmployeeId = new Map<string, typeof slots>();
  for (const assignment of assignments) {
    if (assignment.status === "cancelled") continue;
    const slot = slotsById.get(assignment.shiftSlotId);
    if (!slot) continue;
    const employeeShifts = payableShiftsByEmployeeId.get(assignment.employeeId) ?? [];
    employeeShifts.push(slot);
    payableShiftsByEmployeeId.set(assignment.employeeId, employeeShifts);
  }
  const estimatedPayByEmployeeId = new Map(
    wageEmployees.map((employee) => [
      employee.id,
      calculateEstimatedPay(
        payableShiftsByEmployeeId.get(employee.id) ?? [],
        employee.hourlyWage,
      ),
    ]),
  );
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
  const selectorCountValue = Number(query?.selectorCount);
  const initialSelectCount = Number.isInteger(selectorCountValue)
    ? Math.max(1, Math.min(20, selectorCountValue))
    : 1;
  const activeTab = ["shift", "availability", "pay", "settings"].includes(query?.tab ?? "")
    ? query?.tab
    : "shift";
  const visibleSlots = selectedDate
    ? [...slots.filter((slot) => slot.workDate === selectedDate)].sort(compareShiftSlots)
    : [];
  const slotGroups = [
    {
      label: "ランチ",
      slots: visibleSlots.filter((slot) =>
        slot.presetGroup
          ? slot.presetGroup.endsWith("lunch")
          : slot.startTime < "15:00",
      ),
    },
    {
      label: "ディナー",
      slots: visibleSlots.filter((slot) =>
        slot.presetGroup
          ? slot.presetGroup.endsWith("dinner")
          : slot.startTime >= "15:00",
      ),
    },
  ];
  const requestHeaders = await headers();
  const host = requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  const origin = host ? `${protocol}://${host}` : "";
  const shortAvailabilityPath = `/s/${encodeShiftPeriodId(period.id)}`;
  const commonAvailabilityUrl = origin
    ? `${origin}${shortAvailabilityPath}`
    : shortAvailabilityPath;
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
      <div className="mx-auto max-w-[1440px] space-y-3 px-3 py-3 sm:px-5 lg:px-6">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1">
            <Link className="text-sm text-slate-500 hover:text-slate-900" href="/admin/shift-periods">期間一覧</Link>
            <h1 className="text-lg font-semibold text-slate-950">{period.startDate} 〜 {period.endDate}</h1>
            <span className={`rounded px-2 py-1 text-xs font-semibold ${period.status === "open" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>{statusLabels[period.status]}</span>
            <span className="text-xs text-slate-500">提出期限 {period.submissionDeadline ? period.submissionDeadline.toLocaleString("ja-JP") : "未設定"}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {slots.length > 0 ? <>
              <form action={autoAssignShiftPeriodAction}>
                <input name="shiftPeriodId" type="hidden" value={period.id} />
                <button className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700" type="submit">従業員を自動割当</button>
              </form>
              <span className="text-xs text-slate-500">提出済みの希望をもとに空き枠へ割り当てます</span>
              <Link className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100" href={`/admin/shift-periods/${period.id}/export.xlsx`}>Excel出力</Link>
            </> : null}
            {period.status === "open" ? <form action={closeShiftPeriodAction}>
              <input name="shiftPeriodId" type="hidden" value={period.id} />
              <input name="returnTo" type="hidden" value="detail" />
              <button className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100" type="submit">受付を締切</button>
            </form> : null}
          </div>
        </header>
        {query?.created ? <StatusMessage>シフト期間を作成しました。</StatusMessage> : null}
        {query?.fixedError ? <StatusMessage tone="error">シフト期間は作成されましたが、シフトを自動生成できませんでした。DB接続を確認してください。</StatusMessage> : null}
        {query?.fixedCreated ? <StatusMessage>シフトを{query.fixedCreated}件作成しました。</StatusMessage> : null}
        {query?.slotDeleted ? <StatusMessage>シフトを削除しました。</StatusMessage> : null}
        {query?.assigned ? <StatusMessage>従業員{query.assigned === "1" ? "1名" : `${query.assigned}名`}を割り当てました。</StatusMessage> : null}
        {query?.autoAssigned ? <StatusMessage>自動割当で{query.autoAssigned}件を追加しました。{query.autoRemaining && Number(query.autoRemaining) > 0 ? ` まだ割当できていない人数が${query.autoRemaining}人います。` : ""}</StatusMessage> : null}
        {query?.unassigned ? <StatusMessage>割当を解除しました。</StatusMessage> : null}
        {query?.closed ? <StatusMessage>シフト期間を締切にしました。</StatusMessage> : null}
        {query?.businessDayUpdated ? <StatusMessage>営業時間を保存しました。</StatusMessage> : null}
        {query?.error === "conflicting_slots" ? <StatusMessage tone="error">この日の既存シフトが新しい営業時間と重なります。対象のシフトを削除してから変更してください。</StatusMessage> : null}
        {query?.error === "businessHours" || query?.error === "invalid_date" ? <StatusMessage tone="error">定休日または営業時間外のため、シフトを作成・変更できません。</StatusMessage> : null}
        {query?.error === "token" ? <StatusMessage tone="error">希望提出URLを発行できませんでした。</StatusMessage> : null}
        {query?.assignError ? <StatusMessage tone="error">{assignErrorMessages[query.assignError] ?? "割当できませんでした。条件と人数を確認してください。"}</StatusMessage> : null}
        {invalidExistingSlotCount > 0 ? <StatusMessage tone="error">現在の営業時間に合わない既存シフトが{invalidExistingSlotCount}件あります。対象の枠を確認してください。これらは新しい割当と勤務希望の対象から除外されます。</StatusMessage> : null}
        <nav aria-label="シフト期間メニュー" className="flex overflow-x-auto border-b border-slate-300">
          {([["shift", "シフト"], ["availability", "希望提出"], ["pay", "勤務・給与"], ["settings", "設定"]] as const).map(([tab, label]) => (
            <Link aria-current={activeTab === tab ? "page" : undefined} className={`shrink-0 border-b-2 px-4 py-3 text-sm font-semibold ${activeTab === tab ? "border-slate-900 text-slate-950" : "border-transparent text-slate-500 hover:text-slate-900"}`} href={`/admin/shift-periods/${period.id}?tab=${tab}${selectedDate ? `&date=${selectedDate}` : ""}`} key={tab}>{label}</Link>
          ))}
        </nav>
        {activeTab === "shift" ? <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-4 border-b border-slate-200 pb-2 text-sm">
            <span className="text-slate-600">シフト {slots.length}枠</span>
          </div>
                    <div className="rounded-md border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-5 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-950">
                    シフト一覧
                  </h2>
                  {selectedDate ? (
                    <p className="mt-1 text-sm text-slate-600">
                      {formatDateTabLabel(selectedDate)} のシフトを表示しています。
                    </p>
                  ) : null}
                </div>

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
            <div>
              {slots.length === 0 ? (
                <p className="px-5 py-6 text-sm text-slate-600">
                  まだシフトがありません。
                </p>
              ) : null}
              {slots.length > 0 && visibleSlots.length === 0 ? (
                <p className="px-5 py-6 text-sm text-slate-600">
                  この日付のシフトはありません。
                </p>
              ) : null}
              {visibleSlots.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 p-3 xl:grid-cols-2">
                  {slotGroups.map((group) => (
                    <section className="min-w-0 overflow-hidden rounded-md border border-slate-200" key={group.label}>
                      <h3 className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900">
                        {group.label}
                        <span className="ml-2 text-xs font-normal text-slate-500">{group.slots.length}枠</span>
                      </h3>
                      {group.slots.length === 0 ? (
                        <p className="px-4 py-5 text-sm text-slate-500">この時間帯のシフトはありません。</p>
                      ) : (
                        <div className="divide-y divide-slate-200">
                          {group.slots.map((slot) => {
                            const slotAssignments = assignmentsBySlotId.get(slot.id) ?? [];
                            const assignedEmployeeIds = new Set(slotAssignments.map((assignment) => assignment.employeeId));
                            const unavailableEmployeeIds = unavailableEmployeeIdsBySlotId.get(slot.id) ?? new Set();
                            const businessDay = resolveBusinessDay(slot.workDate, overridesByDate.get(slot.workDate));
                            const isValidBusinessSlot = isWithinBusinessHours(slot.startTime, slot.endTime, businessDay);
                            const assignableEmployees = isValidBusinessSlot ? employees.filter((employee) => {
                              if (assignedEmployeeIds.has(employee.id) || unavailableEmployeeIds.has(employee.id)) return false;
                              if (slot.roleLabel && requiresPositionSkill(slot.roleLabel) && !employee.positionSkills.includes(slot.roleLabel)) return false;
                              if (slot.requiresOpen && !employee.canOpen) return false;
                              if (slot.requiresClose && !employee.canClose) return false;
                              if (employee.isHighSchoolStudent && endsAfterLateNightStart(slot.endTime)) return false;
                              return true;
                            }) : [];

                            return (
                              <article className="space-y-2 p-3" key={slot.id}>
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <h4 className="truncate text-sm font-semibold text-slate-950">{slot.roleLabel ?? "手入力"}</h4>
                                    <p className="text-xs text-slate-500">
                                      {slot.presetGroup ? presetGroupLabels[slot.presetGroup] ?? slot.presetGroup : "手入力"}
                                      {slot.isBackup ? " / 予備" : ""}
                                    </p>
                                  </div>
                                  <form action={deleteShiftSlotAction} className="shrink-0">
                                    <input name="shiftPeriodId" type="hidden" value={period.id} />
                                    {selectedDate ? <input name="selectedDate" type="hidden" value={selectedDate} /> : null}
                                    <input name="shiftSlotId" type="hidden" value={slot.id} />
                                    <button className="rounded border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50" type="submit">削除</button>
                                  </form>
                                </div>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-700">
                                  <span>{formatTime(slot.startTime)}〜{formatTime(slot.endTime)}</span>
                                  {slot.breakStartTime ? <span className="text-xs text-slate-500">休憩 {formatTime(slot.breakStartTime)}〜{formatTime(slot.breakEndTime)}</span> : null}
                                  {slot.requiresOpen ? <span className="text-xs text-slate-500">開店経験</span> : null}
                                  {slot.requiresClose ? <span className="text-xs text-slate-500">閉店経験</span> : null}
                                  {slot.memo ? <span className="text-xs text-slate-500">{slot.memo}</span> : null}
                                </div>
                                {!isValidBusinessSlot ? <p className="text-xs font-medium text-red-700">営業時間外の既存枠</p> : null}
                                {slotAssignments.length > 0 ? (
                                  <div className="flex flex-wrap gap-1.5">
                                    {slotAssignments.map((assignment) => (
                                      <form action={deleteShiftAssignmentAction} className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs ${overlappedAssignmentIds.has(assignment.id) ? "border-red-300 bg-red-50" : "border-slate-200 bg-slate-50"}`} key={assignment.id}>
                                        <input name="shiftPeriodId" type="hidden" value={period.id} />
                                        {selectedDate ? <input name="selectedDate" type="hidden" value={selectedDate} /> : null}
                                        <input name="assignmentId" type="hidden" value={assignment.id} />
                                        <span className={`max-w-28 truncate font-medium ${overlappedAssignmentIds.has(assignment.id) ? "text-red-700" : "text-slate-900"}`}>{assignment.employeeDisplayName}</span>
                                        {overlappedAssignmentIds.has(assignment.id) ? <span className="text-red-600">重複</span> : null}
                                        <button className="text-slate-500 hover:text-red-700" type="submit">解除</button>
                                      </form>
                                    ))}
                                  </div>
                                ) : null}
                                {slotAssignments.some((assignment) => overlappedAssignmentIds.has(assignment.id)) ? <p className="text-xs font-medium text-red-600">同じ従業員が重なる時間帯に割り当てられています。</p> : null}
                                {assignableEmployees.length === 0 ? (
                                  <p className="text-xs font-medium text-red-600">割当可能な従業員がいません。</p>
                                ) : (
                                  <ShiftAssignmentPicker
                                    employees={assignableEmployees.map((employee) => ({ id: employee.id, displayName: employee.displayName }))}
                                    initialSelectCount={initialSelectCount}
                                    selectedDate={selectedDate}
                                    shiftPeriodId={period.id}
                                    shiftSlotId={slot.id}
                                  />
                                )}
                              </article>
                            );
                          })}
                        </div>
                      )}
                    </section>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div> : null}
        {activeTab === "availability" ? <section className="space-y-3">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="font-semibold text-slate-900">提出済み {availabilitySubmissions.filter((submission) => submission.submittedAt).length}人</span>
            <span className="text-slate-600">未提出 {Math.max(0, employees.length - availabilitySubmissions.filter((submission) => submission.submittedAt).length)}人</span>
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
            <div className="mt-3 overflow-x-auto">
              {employees.length === 0 ? (
                <p className="text-sm text-slate-600">
                  有効な従業員がいません。
                </p>
              ) : null}
              {employees.length > 0 ? <table className="w-full min-w-[440px] text-left text-sm">
                <thead className="border-y border-slate-200 bg-slate-50 text-xs text-slate-500">
                  <tr><th className="px-3 py-2 font-medium">従業員</th><th className="px-3 py-2 font-medium">提出状況</th><th className="px-3 py-2 font-medium">提出日時</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {employees.map((employee) => {
                    const submission = availabilitySubmissionByEmployeeId.get(employee.id);
                    return <tr key={employee.id}>
                      <th className="px-3 py-2 font-medium text-slate-900">{employee.displayName}</th>
                      <td className="px-3 py-2"><span className={`rounded px-2 py-1 text-xs font-medium ${submission?.submittedAt ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{submission?.submittedAt ? "提出済み" : "未提出"}</span></td>
                      <td className="px-3 py-2 text-xs text-slate-500">{submission?.submittedAt ? submission.submittedAt.toLocaleString("ja-JP") : "—"}</td>
                    </tr>;
                  })}
                </tbody>
              </table> : null}
            </div>
          </div>
        </section> : null}
        {activeTab === "pay" ? <div className="space-y-2">          <section className="rounded-md border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-base font-semibold text-slate-950">勤務時間・見込給与</h2>
              <p className="mt-1 text-sm text-slate-600">
                現在の割当と登録時給から算出した概算です。22:00〜翌5:00の深夜時間は休憩を除き25%加算します。残業割増、交通費、控除などは含みません。
              </p>
            </div>
            {wageEmployees.length === 0 ? (
              <p className="px-5 py-4 text-sm text-slate-600">従業員が登録されていません。</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1060px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">従業員</th>
                      <th className="px-4 py-3 font-medium">平日時給</th>
                      <th className="px-4 py-3 font-medium">土日祝時給</th>
                      <th className="px-4 py-3 font-medium">平日時間</th>
                      <th className="px-4 py-3 font-medium">土日祝時間</th>
                      <th className="px-4 py-3 font-medium">深夜時間</th>
                      <th className="px-4 py-3 font-medium">合計勤務時間</th>
                      <th className="px-4 py-3 font-medium">深夜手当</th>
                      <th className="px-4 py-3 font-medium">見込給与</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {wageEmployees.map((employee) => {
                      const summary = estimatedPayByEmployeeId.get(employee.id)!;
                      return (
                        <tr key={employee.id}>
                          <th className="px-4 py-3 align-top font-medium text-slate-900">
                            {employee.displayName}
                            {!employee.isActive ? <span className="ml-1 text-xs text-slate-500">（無効）</span> : null}
                            <p className="text-xs font-normal text-slate-500">
                              平日 {formatYen(summary.weekdayPay)} / 土日祝 {formatYen(summary.holidayPay)}
                            </p>
                            <p className="text-xs font-normal text-slate-500">
                              平日深夜 {formatWorkingTime(summary.weekdayNightMinutes)} / 土日祝深夜 {formatWorkingTime(summary.holidayNightMinutes)}
                            </p>
                          </th>
                          <td className="px-4 py-3 text-slate-700">{formatYen(employee.hourlyWage)}</td>
                          <td className="px-4 py-3 text-slate-700">{formatYen(employee.hourlyWage + 100)}</td>
                          <td className="px-4 py-3 text-slate-700">{formatWorkingTime(summary.weekdayMinutes)}</td>
                          <td className="px-4 py-3 text-slate-700">{formatWorkingTime(summary.holidayMinutes)}</td>
                          <td className="px-4 py-3 text-slate-700">{formatWorkingTime(summary.weekdayNightMinutes + summary.holidayNightMinutes)}</td>
                          <td className="px-4 py-3 font-medium text-slate-900">{formatWorkingTime(summary.totalMinutes)}</td>
                          <td className="px-4 py-3 text-slate-700">{formatYen(summary.nightPremium)}</td>
                          <td className="px-4 py-3 font-semibold text-slate-900">{formatYen(summary.estimatedPay)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section></div> : null}
        {activeTab === "settings" ? <div className="space-y-3">
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
          <section className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3">
            <p className="text-sm text-slate-600">期間と関連するシフト・希望・割当を削除します。</p>
            <form action={deleteShiftPeriodAction}>
              <input name="shiftPeriodId" type="hidden" value={period.id} />
              <button className="rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50" type="submit">シフト期間を削除</button>
            </form>
          </section>
        </div> : null}
      </div>
    </main>
  );
}
