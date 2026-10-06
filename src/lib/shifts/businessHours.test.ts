import assert from "node:assert/strict";
import test from "node:test";
import {
  getCappedEndTime,
  getDefaultClosingTime,
  isDefaultClosedDay,
  isJapaneseHoliday,
  isPublicHoliday,
  isWeekend,
  isWithinBusinessHours,
  resolveBusinessDay,
} from "./businessHours";
import { getTemplateGroupsForDate } from "./shiftTemplates";

test("翌日が土日祝なら22時、通常の平日なら21時", () => {
  assert.equal(getDefaultClosingTime("2026-10-09"), "22:00"); // 金→土
  assert.equal(getDefaultClosingTime("2026-10-10"), "22:00"); // 土→日
  assert.equal(getDefaultClosingTime("2026-10-11"), "22:00"); // 日→スポーツの日
  assert.equal(getDefaultClosingTime("2026-10-12"), "21:00"); // 祝日→火
  assert.equal(getDefaultClosingTime("2026-11-02"), "22:00"); // 月→文化の日
});

test("祝日と週末を分けて判定する", () => {
  assert.equal(isWeekend("2026-10-10"), true);
  assert.equal(isJapaneseHoliday("2026-10-12"), true);
  assert.equal(isJapaneseHoliday("2026-09-22"), true); // 国民の休日
  assert.equal(isPublicHoliday("2026-10-13"), false);
  assert.deepEqual(getTemplateGroupsForDate("2026-10-12"), [
    "holiday_lunch",
    "holiday_dinner",
  ]);
});

test("手動設定を優先し、定休日と閉店時刻を守る", () => {
  const automatic = resolveBusinessDay("2026-10-09");
  const closed = resolveBusinessDay("2026-10-09", {
    isClosed: true,
    closingTime: null,
  });
  const until21 = resolveBusinessDay("2026-10-09", {
    isClosed: false,
    closingTime: "21:00",
  });

  assert.equal(automatic.closingTime, "22:00");
  assert.equal(isWithinBusinessHours("20:00", "22:00", automatic), true);
  assert.equal(closed.isClosed, true);
  assert.equal(isWithinBusinessHours("20:00", "21:00", closed), false);
  assert.equal(isWithinBusinessHours("20:00", "22:00", until21), false);
  assert.equal(isWithinBusinessHours("20:00", "21:00", until21), true);
  assert.equal(getCappedEndTime("17:00", "23:00", until21), "21:00");
  assert.equal(
    resolveBusinessDay("2026-10-09", { isClosed: false, closingTime: "21:00:00" }).closingTime,
    "21:00",
  );
});

test("火曜日は自動で定休日になり、手動設定で営業できる", () => {
  const tuesday = resolveBusinessDay("2026-10-13");
  const manuallyOpen = resolveBusinessDay("2026-10-13", {
    isClosed: false,
    closingTime: "21:00",
  });

  assert.equal(isDefaultClosedDay("2026-10-13"), true);
  assert.equal(tuesday.isClosed, true);
  assert.equal(tuesday.closingTime, null);
  assert.equal(tuesday.isManualOverride, false);
  assert.equal(isWithinBusinessHours("17:00", "20:00", tuesday), false);
  assert.equal(getCappedEndTime("17:00", "22:00", tuesday), null);
  assert.equal(manuallyOpen.isClosed, false);
  assert.equal(manuallyOpen.closingTime, "21:00");
  assert.equal(manuallyOpen.isManualOverride, true);
});
