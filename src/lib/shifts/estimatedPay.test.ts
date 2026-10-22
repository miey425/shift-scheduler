import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateEstimatedPay,
  calculateWorkingMinutes,
} from "./estimatedPay";

test("勤務時間から休憩時間を分単位で差し引く", () => {
  assert.equal(calculateWorkingMinutes({
    workDate: "2026-10-09",
    startTime: "17:00:00",
    endTime: "22:00:00",
    breakStartTime: "19:00:00",
    breakEndTime: "19:30:00",
  }), 270);
});

test("平日、土日、祝日の時給を分けて見込給与を算出する", () => {
  const summary = calculateEstimatedPay([
    { workDate: "2026-10-09", startTime: "09:00", endTime: "13:00", breakStartTime: null, breakEndTime: null },
    { workDate: "2026-10-10", startTime: "09:00", endTime: "14:00", breakStartTime: null, breakEndTime: null },
    { workDate: "2026-10-12", startTime: "17:00", endTime: "18:00", breakStartTime: null, breakEndTime: null },
  ], { weekdayHourlyWage: 1100, holidayHourlyWage: 1200 });

  assert.deepEqual(summary, {
    weekdayMinutes: 240,
    holidayMinutes: 360,
    weekdayPay: 4400,
    holidayPay: 7200,
    totalMinutes: 600,
    estimatedPay: 11600,
  });
});

test("1分単位の給与を最後に円単位へ丸める", () => {
  const summary = calculateEstimatedPay([
    { workDate: "2026-10-09", startTime: "09:00", endTime: "09:01", breakStartTime: null, breakEndTime: null },
  ], { weekdayHourlyWage: 1000, holidayHourlyWage: 1200 });

  assert.equal(summary.estimatedPay, 17);
});
