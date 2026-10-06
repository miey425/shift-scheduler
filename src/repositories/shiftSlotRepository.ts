import "server-only";

import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { shiftSlots } from "@/db/schema";

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
