export type AvailabilityGroupKey = "lunch" | "dinner";

type GroupableShiftSlot = {
  presetGroup?: string | null;
  roleLabel?: string | null;
};

export const availabilityGroupLabels: Record<AvailabilityGroupKey, string> = {
  lunch: "ランチ",
  dinner: "ディナー",
};

export const availabilityGroupOrder: AvailabilityGroupKey[] = [
  "lunch",
  "dinner",
];

function isLunchSlot(slot: GroupableShiftSlot) {
  return slot.presetGroup === "weekday_lunch" || slot.presetGroup === "holiday_lunch";
}

export function getAvailabilityGroupKey(
  slot: GroupableShiftSlot,
): AvailabilityGroupKey {
  return isLunchSlot(slot) ? "lunch" : "dinner";
}

export function getAvailabilityGroupFormName(
  workDate: string,
  groupKey: AvailabilityGroupKey,
) {
  return `group_${workDate}_${groupKey}`;
}
