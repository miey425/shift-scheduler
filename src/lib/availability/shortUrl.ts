import { shiftPeriodIdSchema } from "@/lib/validators/shift";

export function encodeShiftPeriodId(periodId: string) {
  const parsed = shiftPeriodIdSchema.parse(periodId);
  return Buffer.from(parsed.replaceAll("-", ""), "hex").toString("base64url");
}

export function decodeShiftPeriodCode(code: string) {
  if (!/^[A-Za-z0-9_-]{22}$/.test(code)) {
    return null;
  }

  const bytes = Buffer.from(code, "base64url");
  if (bytes.length !== 16 || bytes.toString("base64url") !== code) {
    return null;
  }

  const hex = bytes.toString("hex");
  const periodId = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  return shiftPeriodIdSchema.safeParse(periodId).success ? periodId : null;
}
