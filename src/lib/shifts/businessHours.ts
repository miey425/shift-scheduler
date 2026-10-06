import * as japaneseHolidays from "@holiday-jp/holiday_jp";

export type BusinessDayOverride = {
  isClosed: boolean;
  closingTime: string | null;
};

export type BusinessDay = {
  isClosed: boolean;
  closingTime: string | null;
  isManualOverride: boolean;
};

function toUtcDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function nextDateKey(date: string) {
  const next = toUtcDate(date);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
}

export function isWeekend(date: string) {
  const day = toUtcDate(date).getUTCDay();
  return day === 0 || day === 6;
}

export function isDefaultClosedDay(date: string) {
  return toUtcDate(date).getUTCDay() === 2;
}

export function isJapaneseHoliday(date: string) {
  try {
    return japaneseHolidays.isHoliday(date);
  } catch {
    return false;
  }
}

export function isPublicHoliday(date: string) {
  return isWeekend(date) || isJapaneseHoliday(date);
}

export function getDefaultClosingTime(date: string) {
  return isPublicHoliday(nextDateKey(date)) ? "22:00" : "21:00";
}

export function resolveBusinessDay(
  date: string,
  override?: BusinessDayOverride | null,
): BusinessDay {
  if (override) {
    return {
      isClosed: override.isClosed,
      closingTime: override.isClosed ? null : override.closingTime?.slice(0, 5) ?? null,
      isManualOverride: true,
    };
  }

  if (isDefaultClosedDay(date)) {
    return {
      isClosed: true,
      closingTime: null,
      isManualOverride: false,
    };
  }

  return {
    isClosed: false,
    closingTime: getDefaultClosingTime(date),
    isManualOverride: false,
  };
}

export function isWithinBusinessHours(
  startTime: string,
  endTime: string,
  businessDay: BusinessDay,
) {
  return (
    !businessDay.isClosed &&
    businessDay.closingTime !== null &&
    startTime < endTime &&
    endTime.slice(0, 5) <= businessDay.closingTime.slice(0, 5)
  );
}

export function getCappedEndTime(
  startTime: string,
  endTime: string,
  businessDay: BusinessDay,
) {
  if (businessDay.isClosed || !businessDay.closingTime) {
    return null;
  }

  const cappedEndTime = endTime > businessDay.closingTime
    ? businessDay.closingTime
    : endTime;

  return startTime < cappedEndTime ? cappedEndTime : null;
}

export function filterSlotsByBusinessHours<
  T extends { workDate: string; startTime: string; endTime: string },
>(slots: T[], overrides: Map<string, BusinessDayOverride>) {
  return slots.filter((slot) =>
    isWithinBusinessHours(
      slot.startTime,
      slot.endTime,
      resolveBusinessDay(slot.workDate, overrides.get(slot.workDate)),
    ),
  );
}

export function getBusinessDayLabel(businessDay: BusinessDay) {
  return businessDay.isClosed
    ? "定休日"
    : `${businessDay.closingTime?.slice(0, 5) ?? "21:00"}まで営業`;
}
