type SortableShiftSlot = {
  presetGroup?: string | null;
  roleLabel?: string | null;
  startTime: string;
};

const presetGroupOrder: Record<string, number> = {
  weekday_lunch: 1,
  holiday_lunch: 1,
  weekday_dinner: 2,
  holiday_dinner: 2,
  manual: 9,
};

const positionOrderByGroup: Record<string, string[]> = {
  weekday_lunch: ["ホールA", "ホールB", "肉", "寿司", "サラダ", "スープ"],
  weekday_dinner: [
    "ホールDA",
    "ホールラスト",
    "キッチンDA",
    "キッチンDB",
    "キッチンDC",
    "D洗い場",
  ],
  holiday_lunch: [
    "ホールA",
    "ホールB",
    "ホールC",
    "肉",
    "寿司",
    "サラダ",
    "スープ",
    "フリー",
  ],
  holiday_dinner: [
    "ホールDA",
    "ホールラスト",
    "キッチンDA",
    "キッチンDB",
    "キッチンDC",
    "D洗い場",
  ],
};

function getPositionOrder(slot: SortableShiftSlot) {
  const group = slot.presetGroup ?? "manual";
  const positions = positionOrderByGroup[group] ?? [];
  const positionIndex = slot.roleLabel ? positions.indexOf(slot.roleLabel) : -1;

  return positionIndex === -1 ? 999 : positionIndex;
}

export function compareShiftSlots<T extends SortableShiftSlot>(a: T, b: T) {
  const groupDiff =
    (presetGroupOrder[a.presetGroup ?? "manual"] ?? 9) -
    (presetGroupOrder[b.presetGroup ?? "manual"] ?? 9);

  if (groupDiff !== 0) {
    return groupDiff;
  }

  const positionDiff = getPositionOrder(a) - getPositionOrder(b);

  if (positionDiff !== 0) {
    return positionDiff;
  }

  return `${a.startTime}-${a.roleLabel ?? ""}`.localeCompare(
    `${b.startTime}-${b.roleLabel ?? ""}`,
    "ja",
  );
}
