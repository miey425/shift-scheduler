import { isPublicHoliday } from "@/lib/shifts/businessHours";

export type PayableShift = {
  workDate: string;
  startTime: string;
  endTime: string;
  breakStartTime: string | null;
  breakEndTime: string | null;
};

export type EstimatedPaySummary = {
  weekdayMinutes: number;
  holidayMinutes: number;
  weekdayNightMinutes: number;
  holidayNightMinutes: number;
  weekdayPay: number;
  holidayPay: number;
  nightPremium: number;
  totalMinutes: number;
  estimatedPay: number;
};

function timeToMinutes(time: string) {
  const [hours, minutes] = time.slice(0, 5).split(":").map(Number);
  return hours * 60 + minutes;
}

export function calculateWorkingMinutes(shift: PayableShift) {
  const start = timeToMinutes(shift.startTime);
  let end = timeToMinutes(shift.endTime);
  if (end <= start) end += 24 * 60;

  let breakDuration = 0;
  if (shift.breakStartTime && shift.breakEndTime) {
    let breakStart = timeToMinutes(shift.breakStartTime);
    if (breakStart < start) breakStart += 24 * 60;
    let breakEnd = timeToMinutes(shift.breakEndTime);
    if (breakEnd <= breakStart) breakEnd += 24 * 60;
    breakDuration = Math.max(0, Math.min(end, breakEnd) - Math.max(start, breakStart));
  }

  return Math.max(0, end - start - breakDuration);
}

function addDays(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1, day + days));
  return value.toISOString().slice(0, 10);
}

export function calculateEstimatedPay(
  shifts: PayableShift[],
  hourlyWage: number,
): EstimatedPaySummary {
  let weekdayMinutes = 0;
  let holidayMinutes = 0;
  let weekdayNightMinutes = 0;
  let holidayNightMinutes = 0;

  for (const shift of shifts) {
    const start = timeToMinutes(shift.startTime);
    let end = timeToMinutes(shift.endTime);
    if (end <= start) end += 24 * 60;

    let breakStart = Number.POSITIVE_INFINITY;
    let breakEnd = Number.POSITIVE_INFINITY;
    if (shift.breakStartTime && shift.breakEndTime) {
      breakStart = timeToMinutes(shift.breakStartTime);
      if (breakStart < start) breakStart += 24 * 60;
      breakEnd = timeToMinutes(shift.breakEndTime);
      if (breakEnd <= breakStart) breakEnd += 24 * 60;
    }

    for (let minute = start; minute < end; minute += 1) {
      if (minute >= breakStart && minute < breakEnd) continue;

      const dayOffset = Math.floor(minute / (24 * 60));
      const minuteOfDay = minute % (24 * 60);
      const isHoliday = isPublicHoliday(addDays(shift.workDate, dayOffset));
      const isNight = minuteOfDay >= 22 * 60 || minuteOfDay < 5 * 60;

      if (isHoliday) {
        holidayMinutes += 1;
        if (isNight) holidayNightMinutes += 1;
      } else {
        weekdayMinutes += 1;
        if (isNight) weekdayNightMinutes += 1;
      }
    }
  }

  const weekdayPay = Math.round((weekdayMinutes * hourlyWage) / 60);
  const holidayHourlyWage = hourlyWage + 100;
  const holidayPay = Math.round((holidayMinutes * holidayHourlyWage) / 60);
  const nightPremium = Math.round(
    (weekdayNightMinutes * hourlyWage +
      holidayNightMinutes * holidayHourlyWage) / 240,
  );

  return {
    weekdayMinutes,
    holidayMinutes,
    weekdayNightMinutes,
    holidayNightMinutes,
    weekdayPay,
    holidayPay,
    nightPremium,
    totalMinutes: weekdayMinutes + holidayMinutes,
    estimatedPay: weekdayPay + holidayPay + nightPremium,
  };
}

export function formatWorkingTime(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes === 0 ? `${hours}時間` : `${hours}時間${remainingMinutes}分`;
}

export function formatYen(amount: number) {
  return `${new Intl.NumberFormat("ja-JP").format(amount)}円`;
}
