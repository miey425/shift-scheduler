import "server-only";

import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { shiftPeriods, shiftSlots } from "@/db/schema";
import { isWithinBusinessHours } from "@/lib/shifts/businessHours";
import { getBusinessDay } from "./businessDayRepository";

export type ShiftSlotInput = {
  shiftPeriodId: string;
  workDate: string;
  startTime: string;
  endTime: string;
  requiredEmployees: number;
  roleLabel?: string | null;
  presetGroup?: string | null;
  requiresOpen: boolean;
  requiresClose: boolean;
  isBackup: boolean;
  breakStartTime?: string | null;
  breakEndTime?: string | null;
  memo?: string | null;
};

export async function createShiftSlot(input: ShiftSlotInput) {
  const [period] = await getDb()
    .select({ startDate: shiftPeriods.startDate, endDate: shiftPeriods.endDate })
    .from(shiftPeriods)
    .where(eq(shiftPeriods.id, input.shiftPeriodId))
    .limit(1);

  if (!period || input.workDate < period.startDate || input.workDate > period.endDate) {
    throw new Error("shift_period_date_invalid");
  }

  const businessDay = await getBusinessDay(input.shiftPeriodId, input.workDate);

  if (!isWithinBusinessHours(input.startTime, input.endTime, businessDay)) {
    throw new Error("shift_outside_business_hours");
  }

  const [slot] = await getDb()
    .insert(shiftSlots)
    .values({
      ...input,
      roleLabel: input.roleLabel || null,
      presetGroup: input.presetGroup || null,
      breakStartTime: input.breakStartTime || null,
      breakEndTime: input.breakEndTime || null,
      memo: input.memo || null,
    })
    .returning();

  return slot;
}

export async function deleteShiftSlot(id: string) {
  const [slot] = await getDb()
    .delete(shiftSlots)
    .where(eq(shiftSlots.id, id))
    .returning();

  return slot ?? null;
}
