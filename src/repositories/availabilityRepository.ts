import "server-only";

import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  availabilities,
  availabilitySubmissions,
  employees,
  shiftSlots,
} from "@/db/schema";

export type AvailabilityStatus = "available" | "unavailable" | "preferred";

export type AvailabilityInput = {
  shiftSlotId: string;
  status: AvailabilityStatus;
  memo?: string | null;
};

export async function findAvailabilitySubmission(input: {
  employeeId: string;
  shiftPeriodId: string;
}) {
  const [submission] = await getDb()
    .select()
    .from(availabilitySubmissions)
    .where(
      and(
        eq(availabilitySubmissions.employeeId, input.employeeId),
        eq(availabilitySubmissions.shiftPeriodId, input.shiftPeriodId),
      ),
    );

  return submission ?? null;
}

export async function listAvailabilitiesBySubmissionId(
  availabilitySubmissionId: string,
) {
  return getDb()
    .select({
      id: availabilities.id,
      shiftSlotId: availabilities.shiftSlotId,
      status: availabilities.status,
      memo: availabilities.memo,
    })
    .from(availabilities)
    .where(eq(availabilities.availabilitySubmissionId, availabilitySubmissionId));
}

export async function listAvailabilitySubmissionsByPeriodId(shiftPeriodId: string) {
  return getDb()
    .select({
      id: availabilitySubmissions.id,
      employeeId: availabilitySubmissions.employeeId,
      employeeDisplayName: employees.displayName,
      status: availabilitySubmissions.status,
      submittedAt: availabilitySubmissions.submittedAt,
      memo: availabilitySubmissions.memo,
    })
    .from(availabilitySubmissions)
    .innerJoin(employees, eq(availabilitySubmissions.employeeId, employees.id))
    .where(eq(availabilitySubmissions.shiftPeriodId, shiftPeriodId));
}

export async function submitAvailabilities(input: {
  employeeId: string;
  shiftPeriodId: string;
  memo?: string | null;
  availabilities: AvailabilityInput[];
}) {
  const now = new Date();
  const [submission] = await getDb()
    .insert(availabilitySubmissions)
    .values({
      employeeId: input.employeeId,
      shiftPeriodId: input.shiftPeriodId,
      status: "submitted",
      submittedAt: now,
      memo: input.memo || null,
    })
    .onConflictDoUpdate({
      target: [
        availabilitySubmissions.employeeId,
        availabilitySubmissions.shiftPeriodId,
      ],
      set: {
        status: "submitted",
        submittedAt: now,
        memo: input.memo || null,
        updatedAt: now,
      },
    })
    .returning();

  await getDb()
    .delete(availabilities)
    .where(eq(availabilities.availabilitySubmissionId, submission.id));

  if (input.availabilities.length > 0) {
    await getDb().insert(availabilities).values(
      input.availabilities.map((availability) => ({
        availabilitySubmissionId: submission.id,
        shiftSlotId: availability.shiftSlotId,
        status: availability.status,
        memo: availability.memo || null,
      })),
    );
  }

  return submission;
}

export async function listSubmittedAvailabilitiesByPeriodId(shiftPeriodId: string) {
  return getDb()
    .select({
      availabilityId: availabilities.id,
      submissionId: availabilitySubmissions.id,
      employeeId: availabilitySubmissions.employeeId,
      shiftSlotId: availabilities.shiftSlotId,
      status: availabilities.status,
    })
    .from(availabilities)
    .innerJoin(
      availabilitySubmissions,
      eq(availabilities.availabilitySubmissionId, availabilitySubmissions.id),
    )
    .innerJoin(shiftSlots, eq(availabilities.shiftSlotId, shiftSlots.id))
    .where(
      and(
        eq(shiftSlots.shiftPeriodId, shiftPeriodId),
        eq(availabilitySubmissions.shiftPeriodId, shiftPeriodId),
        eq(availabilitySubmissions.status, "submitted"),
      ),
    );
}
