import "server-only";

import { asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { shiftPeriods, shiftSlots } from "@/db/schema";

export type ShiftPeriodStatus = "draft" | "open" | "closed" | "published";

export type ShiftPeriodInput = {
  name: string;
  startDate: string;
  endDate: string;
  submissionDeadline?: Date | null;
  status: ShiftPeriodStatus;
  memo?: string | null;
};

export async function listShiftPeriods() {
  return getDb()
    .select()
    .from(shiftPeriods)
    .orderBy(desc(shiftPeriods.startDate), asc(shiftPeriods.name));
}

export async function findShiftPeriodById(id: string) {
  const [period] = await getDb()
    .select()
    .from(shiftPeriods)
    .where(eq(shiftPeriods.id, id))
    .limit(1);

  return period ?? null;
}

export async function createShiftPeriod(input: ShiftPeriodInput) {
  const [period] = await getDb()
    .insert(shiftPeriods)
    .values({
      ...input,
      submissionDeadline: input.submissionDeadline ?? null,
      memo: input.memo || null,
    })
    .returning();

  return period;
}

export async function updateShiftPeriodStatus(
  id: string,
  status: ShiftPeriodStatus,
) {
  const [period] = await getDb()
    .update(shiftPeriods)
    .set({
      status,
      updatedAt: new Date(),
    })
    .where(eq(shiftPeriods.id, id))
    .returning();

  return period ?? null;
}

export async function deleteShiftPeriod(id: string) {
  const [period] = await getDb()
    .delete(shiftPeriods)
    .where(eq(shiftPeriods.id, id))
    .returning();

  return period ?? null;
}

export async function listShiftSlotsByPeriodId(shiftPeriodId: string) {
  return getDb()
    .select()
    .from(shiftSlots)
    .where(eq(shiftSlots.shiftPeriodId, shiftPeriodId))
    .orderBy(asc(shiftSlots.workDate), asc(shiftSlots.startTime));
}
