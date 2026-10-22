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
  ], 1100);

  assert.deepEqual(summary, {
    weekdayMinutes: 240,
    holidayMinutes: 360,
    weekdayNightMinutes: 0,
    holidayNightMinutes: 0,
    weekdayPay: 4400,
    holidayPay: 7200,
    nightPremium: 0,
    totalMinutes: 600,
    estimatedPay: 11600,
  });
});

test("1分単位の給与を最後に円単位へ丸める", () => {
  const summary = calculateEstimatedPay([
    { workDate: "2026-10-09", startTime: "09:00", endTime: "09:01", breakStartTime: null, breakEndTime: null },
  ], 1000);

  assert.equal(summary.estimatedPay, 17);
});

test("22時から翌5時の勤務に25%の深夜手当を加算し、休憩を除外する", () => {
  const summary = calculateEstimatedPay([
    { workDate: "2026-10-09", startTime: "20:00", endTime: "23:00", breakStartTime: "22:15", breakEndTime: "22:30" },
  ], 1200);

  assert.deepEqual(summary, {
    weekdayMinutes: 165,
    holidayMinutes: 0,
    weekdayNightMinutes: 45,
    holidayNightMinutes: 0,
    weekdayPay: 3300,
    holidayPay: 0,
    nightPremium: 225,
    totalMinutes: 165,
    estimatedPay: 3525,
  });
});

test("日をまたぐシフトは翌日の休日区分と午前5時までの深夜時間を反映する", () => {
  const summary = calculateEstimatedPay([
    { workDate: "2026-10-09", startTime: "23:00", endTime: "06:00", breakStartTime: "02:00", breakEndTime: "02:30" },
  ], 1200);

  assert.equal(summary.weekdayNightMinutes, 60);
  assert.equal(summary.holidayNightMinutes, 270);
  assert.equal(summary.totalMinutes, 390);
  assert.equal(summary.nightPremium, 1763);
});
