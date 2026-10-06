import { notFound } from "next/navigation";
import { AvailabilitySelectionGrid } from "@/components/availability/AvailabilitySelectionGrid";
import {
  availabilityGroupLabels,
  availabilityGroupOrder,
  getAvailabilityGroupFormName,
  getAvailabilityGroupKey,
  type AvailabilityGroupKey,
} from "@/lib/shifts/availabilityGroups";
import { employeeAccessTokenSchema } from "@/lib/validators/shift";
import { findValidEmployeeAccessToken } from "@/repositories/employeeAccessTokenRepository";
import { listShiftSlotsByPeriodId } from "@/repositories/shiftPeriodRepository";
import {
  findAvailabilitySubmission,
  listAvailabilitiesBySubmissionId,
} from "@/repositories/availabilityRepository";
import { submitAvailabilityAction } from "./actions";

type AvailabilityPageProps = {
  params: Promise<{
    token: string;
  }>;
  searchParams?: Promise<{
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

export default async function AvailabilityPage({
  params,
  searchParams,
}: AvailabilityPageProps) {
  const [{ token }, query] = await Promise.all([params, searchParams]);
  const parsedToken = employeeAccessTokenSchema.safeParse(token);

  if (!parsedToken.success) {
    notFound();
  }

  const accessToken = await findValidEmployeeAccessToken(parsedToken.data);

  if (!accessToken) {
    notFound();
  }

  const [slots, submission] = await Promise.all([
    listShiftSlotsByPeriodId(accessToken.shiftPeriodId),
    findAvailabilitySubmission({
      employeeId: accessToken.employeeId,
      shiftPeriodId: accessToken.shiftPeriodId,
    }),
  ]);
  const submittedAvailabilities = submission
    ? await listAvailabilitiesBySubmissionId(submission.id)
    : [];
  const availabilityBySlotId = new Map(
    submittedAvailabilities.map((availability) => [
      availability.shiftSlotId,
      availability,
    ]),
  );
  const slotDates = Array.from(new Set(slots.map((slot) => slot.workDate)));
  const availabilityDays = slotDates.map((date) => {
    const dateSlots = slots.filter((slot) => slot.workDate === date);
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
      isHolidaySchedule: dateSlots.some(
        (slot) =>
          slot.presetGroup === "holiday_lunch" ||
          slot.presetGroup === "holiday_dinner",
      ),
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
            {accessToken.employeeDisplayName}さん
          </p>
          <h1 className="mt-1 text-xl font-semibold text-slate-950">
            希望シフト提出
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {accessToken.periodName} / {accessToken.periodStartDate} から{" "}
            {accessToken.periodEndDate}
          </p>
        </section>

        {accessToken.periodStatus !== "open" ? (
          <section className="rounded-md border border-amber-200 bg-amber-50 p-5">
            <h2 className="text-base font-semibold text-amber-900">
              受付は終了しています
            </h2>
            <p className="mt-2 text-sm text-amber-800">
              このシフト期間は現在受付中ではありません。変更が必要な場合は管理者に連絡してください。
            </p>
          </section>
        ) : (
          <form action={submitAvailabilityAction} className="space-y-4">
            <input name="token" type="hidden" value={parsedToken.data} />

            {query?.error === "closed" ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800">
                受付中ではないため送信できません。
              </div>
            ) : null}

            {slots.length === 0 ? (
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
                disabled={slots.length === 0}
                type="submit"
              >
                希望シフトを送信
              </button>
            </section>
          </form>
        )}
      </div>
    </main>
  );
}
