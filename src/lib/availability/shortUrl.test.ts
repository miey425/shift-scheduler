import assert from "node:assert/strict";
import test from "node:test";
import { decodeShiftPeriodCode, encodeShiftPeriodId } from "./shortUrl";

test("期間IDを短くして元に戻せる", () => {
  const periodId = "166da259-5e24-4a83-a774-94dbd009c8ca";
  const code = encodeShiftPeriodId(periodId);

  assert.equal(code.length, 22);
  assert.equal(decodeShiftPeriodCode(code), periodId);
});

test("不正な短縮コードは受け付けない", () => {
  assert.equal(decodeShiftPeriodCode("invalid"), null);
  assert.equal(decodeShiftPeriodCode("!!!!!!!!!!!!!!!!!!!!!!"), null);
  assert.equal(decodeShiftPeriodCode("AAAAAAAAAAAAAAAAAAAAAB"), null);
});
