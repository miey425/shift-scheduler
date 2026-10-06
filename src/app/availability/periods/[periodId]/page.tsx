import { notFound } from "next/navigation";
import { AvailabilitySelectionGrid } from "@/components/availability/AvailabilitySelectionGrid";
import {
  availabilityGroupLabels,
  availabilityGroupOrder,
  getAvailabilityGroupFormName,
  getAvailabilityGroupKey,
  type AvailabilityGroupKey,
} from "@/lib/shifts/availabilityGroups";
import { shiftPeriodIdSchema } from "@/lib/validators/shift";
import {
  filterSlotsByBusinessHours,
  getBusinessDayLabel,
  isPublicHoliday,
  resolveBusinessDay,
} from "@/lib/shifts/businessHours";
import { getDateKeysInRange } from "@/lib/shifts/shiftTemplates";
import { listBusinessDayOverrides } from "@/repositories/businessDayRepository";
import { listActiveEmployees } from "@/repositories/employeeRepository";
import {
  findAvailabilitySubmission,
  listAvailabilitiesBySubmissionId,
} from "@/repositories/availabilityRepository";
import {
  findShiftPeriodById,
  listShiftSlotsByPeriodId,
} from "@/repositories/shiftPeriodRepository";
import { submitSharedAvailabilityAction } from "./actions";

type SharedAvailabilityPageProps = {
  params: Promise<{
    periodId: string;
  }>;
  searchParams?: Promise<{
    employeeId?: string;
    error?: string;
  }>;
};

const weekdayLabels = ["日", "月", "火", "水", "木", "金", "土"];

function formatDateLabel(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  const dayOfWeek = new Date(Date.UTC(year, month - 1, day)).getUTCDay();

  return `${month}/${day}(${weekdayLabels[dayOfWeek]})`;
}

function getDefaultGroupStatus(
  groupSlotIds: string[],
  availabilityBySlotId: Map<
    string,
    { status: "available" | "unavailable" | "preferred" }
  >,
): "available" | "unavailable" {
  const statuses = groupSlotIds
    .map((slotId) => availabilityBySlotId.get(slotId)?.status)
    .filter(Boolean);

  if (statuses.includes("available")) {
    return "available";
  }

  if (statuses.includes("preferred")) {
    return "available";
  }

  return "unavailable";
}

export default async function SharedAvailabilityPage({
  params,
  searchParams,
}: SharedAvailabilityPageProps) {
  const [{ periodId }, query] = await Promise.all([params, searchParams]);
  const parsedPeriodId = shiftPeriodIdSchema.safeParse(periodId);

  if (!parsedPeriodId.success) {
    notFound();
  }

  const [period, slots, employees, overrides] = await Promise.all([
    findShiftPeriodById(parsedPeriodId.data),
    listShiftSlotsByPeriodId(parsedPeriodId.data),
    listActiveEmployees(),
    listBusinessDayOverrides(parsedPeriodId.data),
  ]);

  if (!period) {
    notFound();
  }

  const overridesByDate = new Map(overrides.map((override) => [override.workDate, override]));
  const eligibleSlots = filterSlotsByBusinessHours(slots, overridesByDate);

  const selectedEmployee = query?.employeeId
    ? employees.find((employee) => employee.id === query.employeeId)
    : null;
  const submission = selectedEmployee
    ? await findAvailabilitySubmission({
        employeeId: selectedEmployee.id,
        shiftPeriodId: period.id,
      })
    : null;
  const submittedAvailabilities = submission
    ? await listAvailabilitiesBySubmissionId(submission.id)
    : [];
  const availabilityBySlotId = new Map(
    submittedAvailabilities.map((availability) => [
      availability.shiftSlotId,
      availability,
    ]),
  );
  const dates = getDateKeysInRange(period.startDate, period.endDate);
  const availabilityDays = dates.map((date) => {
    const businessDay = resolveBusinessDay(date, overridesByDate.get(date));
    const dateSlots = eligibleSlots.filter((slot) => slot.workDate === date);
    const slotsByGroup = new Map<AvailabilityGroupKey, typeof dateSlots>();

    for (const slot of dateSlots) {
      const groupKey = getAvailabilityGroupKey(slot);
      const groupSlots = slotsByGroup.get(groupKey) ?? [];
      groupSlots.push(slot);
      slotsByGroup.set(groupKey, groupSlots);
    }

    return {
      date,
      label: formatDateLabel(date),
      isHolidaySchedule: isPublicHoliday(date),
      businessLabel: getBusinessDayLabel(businessDay),
      isClosed: businessDay.isClosed,
      groups: availabilityGroupOrder
        .filter((groupKey) => slotsByGroup.has(groupKey))
        .map((groupKey) => {
          const groupSlots = slotsByGroup.get(groupKey) ?? [];

          return {
            formName: getAvailabilityGroupFormName(date, groupKey),
            label: availabilityGroupLabels[groupKey],
            defaultStatus: getDefaultGroupStatus(
              groupSlots.map((slot) => slot.id),
              availabilityBySlotId,
            ),
          };
        }),
    };
  });

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6">
      <div className="mx-auto max-w-4xl space-y-4">
        <section className="rounded-md border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">
            共通提出URL
          </p>
          <h1 className="mt-1 text-xl font-semibold text-slate-950">
            希望シフト提出
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {period.name} / {period.startDate} から {period.endDate}
          </p>
        </section>

        <section className="rounded-md border border-slate-200 bg-white p-5">
          <form className="grid gap-3 md:grid-cols-[1fr_auto]" method="get">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">
                名前を選択
              </span>
              <select
                className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
                defaultValue={selectedEmployee?.id ?? ""}
                name="employeeId"
                required
              >
                <option value="">選択してください</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.displayName}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="self-end rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700"
              type="submit"
            >
              表示
            </button>
          </form>
        </section>

        {period.status !== "open" ? (
          <section className="rounded-md border border-amber-200 bg-amber-50 p-5">
            <h2 className="text-base font-semibold text-amber-900">
              受付は終了しています
            </h2>
            <p className="mt-2 text-sm text-amber-800">
              このシフト期間は現在受付中ではありません。変更が必要な場合は管理者に連絡してください。
            </p>
          </section>
        ) : null}

        {query?.error === "closed" ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800">
            受付中ではないため送信できません。
          </div>
        ) : null}
        {query?.employeeId && !selectedEmployee ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            有効な従業員を選択してください。
          </div>
        ) : null}

        {selectedEmployee && period.status === "open" ? (
          <form action={submitSharedAvailabilityAction} className="space-y-4">
            <input name="shiftPeriodId" type="hidden" value={period.id} />
            <input name="employeeId" type="hidden" value={selectedEmployee.id} />

            {eligibleSlots.length === 0 ? (
              <section className="rounded-md border border-slate-200 bg-white p-5">
                <p className="text-sm text-slate-600">
                  まだ希望を選べる固定シフトがありません。
                </p>
              </section>
            ) : null}

            <AvailabilitySelectionGrid days={availabilityDays} />

            <section className="rounded-md border border-slate-200 bg-white p-5">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  メモ
                </span>
                <textarea
                  className="mt-1 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2"
                  defaultValue={submission?.memo ?? ""}
                  name="memo"
                />
              </label>
              <button
                className="mt-4 w-full rounded-md bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-700"
                disabled={eligibleSlots.length === 0}
                type="submit"
              >
                {selectedEmployee.displayName}さんとして送信
              </button>
            </section>
          </form>
        ) : null}
      </div>
    </main>
  );
}
