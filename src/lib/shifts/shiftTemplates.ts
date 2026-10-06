import { isPublicHoliday } from "./businessHours";

export type ShiftTemplateGroup =
  | "weekday_lunch"
  | "weekday_dinner"
  | "holiday_lunch"
  | "holiday_dinner";

export type ShiftTemplate = {
  id: string;
  group: ShiftTemplateGroup;
  groupLabel: string;
  roleLabel: string;
  startTime: string;
  endTime: string;
  requiredEmployees: number;
  requiresOpen: boolean;
  requiresClose: boolean;
  isBackup: boolean;
  breakStartTime?: string;
  breakEndTime?: string;
};

const dinnerSkillRequiredPositions = new Set(["ホールラスト", "D洗い場"]);
const skillExcludedPositions = new Set(["ホールC", "フリー"]);

export const shiftTemplates: ShiftTemplate[] = [
  {
    id: "weekday_lunch_hall_a",
    group: "weekday_lunch",
    groupLabel: "平日ランチ",
    roleLabel: "ホールA",
    startTime: "09:00",
    endTime: "13:30",
    requiredEmployees: 1,
    requiresOpen: true,
    requiresClose: false,
    isBackup: false,
  },
  {
    id: "weekday_lunch_hall_b",
    group: "weekday_lunch",
    groupLabel: "平日ランチ",
    roleLabel: "ホールB",
    startTime: "09:00",
    endTime: "16:00",
    requiredEmployees: 1,
    requiresOpen: true,
    requiresClose: false,
    isBackup: false,
    breakStartTime: "11:30",
    breakEndTime: "12:30",
  },
  {
    id: "weekday_lunch_meat",
    group: "weekday_lunch",
    groupLabel: "平日ランチ",
    roleLabel: "肉",
    startTime: "09:00",
    endTime: "13:30",
    requiredEmployees: 1,
    requiresOpen: true,
    requiresClose: false,
    isBackup: false,
  },
  {
    id: "weekday_lunch_sushi",
    group: "weekday_lunch",
    groupLabel: "平日ランチ",
    roleLabel: "寿司",
    startTime: "10:00",
    endTime: "14:00",
    requiredEmployees: 1,
    requiresOpen: true,
    requiresClose: false,
    isBackup: false,
  },
  {
    id: "weekday_lunch_salad",
    group: "weekday_lunch",
    groupLabel: "平日ランチ",
    roleLabel: "サラダ",
    startTime: "09:00",
    endTime: "13:30",
    requiredEmployees: 1,
    requiresOpen: true,
    requiresClose: false,
    isBackup: false,
  },
  {
    id: "weekday_lunch_soup",
    group: "weekday_lunch",
    groupLabel: "平日ランチ",
    roleLabel: "スープ",
    startTime: "09:30",
    endTime: "16:00",
    requiredEmployees: 1,
    requiresOpen: true,
    requiresClose: false,
    isBackup: false,
    breakStartTime: "11:00",
    breakEndTime: "12:00",
  },
  {
    id: "weekday_dinner_hall_da",
    group: "weekday_dinner",
    groupLabel: "平日ディナー",
    roleLabel: "ホールDA",
    startTime: "17:00",
    endTime: "22:00",
    requiredEmployees: 1,
    requiresOpen: false,
    requiresClose: false,
    isBackup: false,
  },
  {
    id: "weekday_dinner_hall_db",
    group: "weekday_dinner",
    groupLabel: "平日ディナー",
    roleLabel: "ホールラスト",
    startTime: "17:00",
    endTime: "22:00",
    requiredEmployees: 1,
    requiresOpen: false,
    requiresClose: false,
    isBackup: true,
  },
  {
    id: "weekday_dinner_kitchen_da",
    group: "weekday_dinner",
    groupLabel: "平日ディナー",
    roleLabel: "キッチンDA",
    startTime: "17:00",
    endTime: "20:00",
    requiredEmployees: 1,
    requiresOpen: false,
    requiresClose: false,
    isBackup: false,
  },
  {
    id: "weekday_dinner_kitchen_db",
    group: "weekday_dinner",
    groupLabel: "平日ディナー",
    roleLabel: "キッチンDB",
    startTime: "17:30",
    endTime: "20:30",
    requiredEmployees: 1,
    requiresOpen: false,
    requiresClose: false,
    isBackup: false,
  },
  {
    id: "weekday_dinner_kitchen_dc",
    group: "weekday_dinner",
    groupLabel: "平日ディナー",
    roleLabel: "キッチンDC",
    startTime: "17:30",
    endTime: "21:30",
    requiredEmployees: 1,
    requiresOpen: false,
    requiresClose: false,
    isBackup: true,
  },
  {
    id: "weekday_dinner_dish",
    group: "weekday_dinner",
    groupLabel: "平日ディナー",
    roleLabel: "D洗い場",
    startTime: "18:30",
    endTime: "22:00",
    requiredEmployees: 1,
    requiresOpen: false,
    requiresClose: true,
    isBackup: false,
  },
  {
    id: "holiday_lunch_hall_a",
    group: "holiday_lunch",
    groupLabel: "土日祝ランチ",
    roleLabel: "ホールA",
    startTime: "09:00",
    endTime: "13:30",
    requiredEmployees: 1,
    requiresOpen: true,
    requiresClose: false,
    isBackup: false,
  },
  {
    id: "holiday_lunch_hall_b",
    group: "holiday_lunch",
    groupLabel: "土日祝ランチ",
    roleLabel: "ホールB",
    startTime: "09:00",
    endTime: "16:00",
    requiredEmployees: 1,
    requiresOpen: true,
    requiresClose: false,
    isBackup: false,
    breakStartTime: "11:30",
    breakEndTime: "12:30",
  },
  {
    id: "holiday_lunch_hall_c",
    group: "holiday_lunch",
    groupLabel: "土日祝ランチ",
    roleLabel: "ホールC",
    startTime: "11:00",
    endTime: "15:00",
    requiredEmployees: 1,
    requiresOpen: false,
    requiresClose: false,
    isBackup: false,
  },
  {
    id: "holiday_lunch_meat",
    group: "holiday_lunch",
    groupLabel: "土日祝ランチ",
    roleLabel: "肉",
    startTime: "09:00",
    endTime: "13:30",
    requiredEmployees: 1,
    requiresOpen: true,
    requiresClose: false,
    isBackup: false,
  },
  {
    id: "holiday_lunch_sushi",
    group: "holiday_lunch",
    groupLabel: "土日祝ランチ",
    roleLabel: "寿司",
    startTime: "10:00",
    endTime: "14:00",
    requiredEmployees: 1,
    requiresOpen: true,
    requiresClose: false,
    isBackup: false,
  },
  {
    id: "holiday_lunch_salad",
    group: "holiday_lunch",
    groupLabel: "土日祝ランチ",
    roleLabel: "サラダ",
    startTime: "09:00",
    endTime: "13:30",
    requiredEmployees: 1,
    requiresOpen: true,
    requiresClose: false,
    isBackup: false,
  },
  {
    id: "holiday_lunch_soup",
    group: "holiday_lunch",
    groupLabel: "土日祝ランチ",
    roleLabel: "スープ",
    startTime: "09:30",
    endTime: "16:00",
    requiredEmployees: 1,
    requiresOpen: true,
    requiresClose: false,
    isBackup: false,
    breakStartTime: "11:00",
    breakEndTime: "12:00",
  },
  {
    id: "holiday_lunch_free",
    group: "holiday_lunch",
    groupLabel: "土日祝ランチ",
    roleLabel: "フリー",
    startTime: "11:00",
    endTime: "15:00",
    requiredEmployees: 1,
    requiresOpen: false,
    requiresClose: false,
    isBackup: false,
  },
  {
    id: "holiday_dinner_hall_da",
    group: "holiday_dinner",
    groupLabel: "土日祝ディナー",
    roleLabel: "ホールDA",
    startTime: "16:00",
    endTime: "20:30",
    requiredEmployees: 1,
    requiresOpen: false,
    requiresClose: false,
    isBackup: false,
  },
  {
    id: "holiday_dinner_hall_db",
    group: "holiday_dinner",
    groupLabel: "土日祝ディナー",
    roleLabel: "ホールラスト",
    startTime: "17:30",
    endTime: "23:00",
    requiredEmployees: 1,
    requiresOpen: false,
    requiresClose: true,
    isBackup: false,
  },
  {
    id: "holiday_dinner_kitchen_da",
    group: "holiday_dinner",
    groupLabel: "土日祝ディナー",
    roleLabel: "キッチンDA",
    startTime: "16:00",
    endTime: "20:00",
    requiredEmployees: 1,
    requiresOpen: false,
    requiresClose: false,
    isBackup: false,
  },
  {
    id: "holiday_dinner_kitchen_db",
    group: "holiday_dinner",
    groupLabel: "土日祝ディナー",
    roleLabel: "キッチンDB",
    startTime: "16:30",
    endTime: "20:30",
    requiredEmployees: 1,
    requiresOpen: false,
    requiresClose: false,
    isBackup: false,
  },
  {
    id: "holiday_dinner_kitchen_dc",
    group: "holiday_dinner",
    groupLabel: "土日祝ディナー",
    roleLabel: "キッチンDC",
    startTime: "17:30",
    endTime: "21:30",
    requiredEmployees: 1,
    requiresOpen: false,
    requiresClose: false,
    isBackup: false,
  },
  {
    id: "holiday_dinner_dish",
    group: "holiday_dinner",
    groupLabel: "土日祝ディナー",
    roleLabel: "D洗い場",
    startTime: "18:30",
    endTime: "23:00",
    requiredEmployees: 1,
    requiresOpen: false,
    requiresClose: true,
    isBackup: false,
  },
];

export function findShiftTemplateById(templateId: string) {
  return shiftTemplates.find((template) => template.id === templateId) ?? null;
}

export function getShiftTemplateGroups() {
  return Array.from(
    new Map(
      shiftTemplates.map((template) => [
        template.group,
        { group: template.group, label: template.groupLabel },
      ]),
    ).values(),
  );
}

function isSelectablePosition(template: ShiftTemplate) {
  if (
    template.roleLabel.startsWith("**") &&
    template.roleLabel.endsWith("**")
  ) {
    return false;
  }

  if (skillExcludedPositions.has(template.roleLabel)) {
    return false;
  }

  if (
    template.group === "weekday_dinner" ||
    template.group === "holiday_dinner"
  ) {
    return dinnerSkillRequiredPositions.has(template.roleLabel);
  }

  return true;
}

export function getPositionSkillOptions() {
  return Array.from(
    new Map(
      shiftTemplates
        .filter((template) => isSelectablePosition(template))
        .map((template) => [
          template.roleLabel,
          { roleLabel: template.roleLabel },
        ]),
    ).values(),
  );
}

export function requiresPositionSkill(roleLabel?: string | null) {
  if (!roleLabel) {
    return false;
  }

  return getPositionSkillOptions().some(
    (option) => option.roleLabel === roleLabel,
  );
}

function parseDateParts(date: string) {
  const [year, month, day] = date.split("-").map(Number);

  return { year, month, day };
}

function toDateKey(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);

  return nextDate;
}

export function getDateKeysInRange(startDate: string, endDate: string) {
  const start = parseDateParts(startDate);
  const end = parseDateParts(endDate);
  const dates: string[] = [];
  let currentDate = new Date(Date.UTC(start.year, start.month - 1, start.day));
  const lastDate = new Date(Date.UTC(end.year, end.month - 1, end.day));

  while (currentDate <= lastDate) {
    dates.push(toDateKey(currentDate));
    currentDate = addDays(currentDate, 1);
  }

  return dates;
}

export function getTemplateGroupsForDate(date: string): ShiftTemplateGroup[] {
  return isPublicHoliday(date)
    ? ["holiday_lunch", "holiday_dinner"]
    : ["weekday_lunch", "weekday_dinner"];
}

export function getFixedShiftTemplatesForDate(date: string) {
  const groups = getTemplateGroupsForDate(date);

  return shiftTemplates.filter((template) => groups.includes(template.group));
}
