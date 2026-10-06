import "server-only";

import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { businessDayOverrides, shiftPeriods, shiftSlots } from "@/db/schema";
import {
  isWithinBusinessHours,
  resolveBusinessDay,
  type BusinessDay,
} from "@/lib/shifts/businessHours";

export async function listBusinessDayOverrides(shiftPeriodId: string) {
  return getDb()
    .select()
    .from(businessDayOverrides)
    .where(eq(businessDayOverrides.shiftPeriodId, shiftPeriodId));
}

export async function getBusinessDay(
  shiftPeriodId: string,
  workDate: string,
): Promise<BusinessDay> {
  const [override] = await getDb()
    .select()
    .from(businessDayOverrides)
    .where(
      and(
        eq(businessDayOverrides.shiftPeriodId, shiftPeriodId),
        eq(businessDayOverrides.workDate, workDate),
      ),
    )
    .limit(1);

  return resolveBusinessDay(workDate, override);
}

export async function saveBusinessDayOverride(input: {
  shiftPeriodId: string;
  workDate: string;
  setting: "auto" | "closed" | "21:00" | "22:00";
}) {
  const [period] = await getDb()
    .select({ startDate: shiftPeriods.startDate, endDate: shiftPeriods.endDate })
    .from(shiftPeriods)
    .where(eq(shiftPeriods.id, input.shiftPeriodId))
    .limit(1);

  if (!period || input.workDate < period.startDate || input.workDate > period.endDate) {
    return { ok: false, reason: "invalid_date" as const };
  }

  const proposedDay = resolveBusinessDay(
    input.workDate,
    input.setting === "auto"
      ? null
      : { isClosed: input.setting === "closed", closingTime: input.setting === "closed" ? null : input.setting },
  );
  const existingSlots = await getDb()
    .select({ startTime: shiftSlots.startTime, endTime: shiftSlots.endTime })
    .from(shiftSlots)
    .where(
      and(
        eq(shiftSlots.shiftPeriodId, input.shiftPeriodId),
        eq(shiftSlots.workDate, input.workDate),
      ),
    );

  if (
    existingSlots.some(
      (slot) =>
        !isWithinBusinessHours(slot.startTime, slot.endTime, proposedDay),
    )
  ) {
    return { ok: false, reason: "conflicting_slots" as const };
  }

  if (input.setting === "auto") {
    await getDb()
      .delete(businessDayOverrides)
      .where(
        and(
          eq(businessDayOverrides.shiftPeriodId, input.shiftPeriodId),
          eq(businessDayOverrides.workDate, input.workDate),
        ),
      );
  } else {
    await getDb()
      .insert(businessDayOverrides)
      .values({
        shiftPeriodId: input.shiftPeriodId,
        workDate: input.workDate,
        isClosed: input.setting === "closed",
        closingTime: input.setting === "closed" ? null : input.setting,
      })
      .onConflictDoUpdate({
        target: [businessDayOverrides.shiftPeriodId, businessDayOverrides.workDate],
        set: {
          isClosed: input.setting === "closed",
          closingTime: input.setting === "closed" ? null : input.setting,
          updatedAt: new Date(),
        },
      });
  }

  return { ok: true, reason: null };
}
