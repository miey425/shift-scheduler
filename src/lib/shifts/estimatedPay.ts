import { isPublicHoliday } from "@/lib/shifts/businessHours";

export type WageRates = {
  weekdayHourlyWage: number;
  holidayHourlyWage: number;
};

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
  weekdayPay: number;
  holidayPay: number;
  totalMinutes: number;
  estimatedPay: number;
};

function timeToMinutes(time: string) {
  const [hours, minutes] = time.slice(0, 5).split(":").map(Number);
  return hours * 60 + minutes;
}

export function calculateWorkingMinutes(shift: PayableShift) {
  const duration = timeToMinutes(shift.endTime) - timeToMinutes(shift.startTime);
  const breakDuration = shift.breakStartTime && shift.breakEndTime
    ? timeToMinutes(shift.breakEndTime) - timeToMinutes(shift.breakStartTime)
    : 0;

  return Math.max(0, duration - Math.max(0, breakDuration));
}

export function calculateEstimatedPay(
  shifts: PayableShift[],
  wages: WageRates,
): EstimatedPaySummary {
  let weekdayMinutes = 0;
  let holidayMinutes = 0;

  for (const shift of shifts) {
    const minutes = calculateWorkingMinutes(shift);

    if (isPublicHoliday(shift.workDate)) {
      holidayMinutes += minutes;
    } else {
      weekdayMinutes += minutes;
    }
  }

  const weekdayPay = Math.round((weekdayMinutes * wages.weekdayHourlyWage) / 60);
  const holidayPay = Math.round((holidayMinutes * wages.holidayHourlyWage) / 60);

  return {
    weekdayMinutes,
    holidayMinutes,
    weekdayPay,
    holidayPay,
    totalMinutes: weekdayMinutes + holidayMinutes,
    estimatedPay: weekdayPay + holidayPay,
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
