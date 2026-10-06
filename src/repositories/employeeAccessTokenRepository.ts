import "server-only";

import { and, asc, eq, gt } from "drizzle-orm";
import { getDb } from "@/db";
import {
  employeeAccessTokens,
  employees,
  shiftPeriods,
} from "@/db/schema";
import {
  createEmployeeAccessToken,
  hashEmployeeAccessToken,
} from "@/lib/tokens/employeeAccessToken";

function getDefaultExpiresAt(endDate: string) {
  return new Date(`${endDate}T23:59:59+09:00`);
}

export async function listEmployeeAccessTokensByPeriodId(shiftPeriodId: string) {
  return getDb()
    .select({
      id: employeeAccessTokens.id,
      employeeId: employeeAccessTokens.employeeId,
      employeeDisplayName: employees.displayName,
      expiresAt: employeeAccessTokens.expiresAt,
      isActive: employeeAccessTokens.isActive,
      lastAccessedAt: employeeAccessTokens.lastAccessedAt,
    })
    .from(employeeAccessTokens)
    .innerJoin(employees, eq(employeeAccessTokens.employeeId, employees.id))
    .where(eq(employeeAccessTokens.shiftPeriodId, shiftPeriodId))
    .orderBy(asc(employees.displayName));
}

export async function createOrUpdateEmployeeAccessToken(input: {
  employeeId: string;
  shiftPeriodId: string;
}) {
  const [employee] = await getDb()
    .select()
    .from(employees)
    .where(eq(employees.id, input.employeeId))
    .limit(1);

  const [period] = await getDb()
    .select()
    .from(shiftPeriods)
    .where(eq(shiftPeriods.id, input.shiftPeriodId))
    .limit(1);

  if (!employee?.isActive || !period) {
    return { ok: false, token: null, reason: "not_found" as const };
  }

  const token = createEmployeeAccessToken();
  const tokenHash = hashEmployeeAccessToken(token);
  const expiresAt =
    period.submissionDeadline && period.submissionDeadline > new Date()
      ? period.submissionDeadline
      : getDefaultExpiresAt(period.endDate);

  await getDb()
    .insert(employeeAccessTokens)
    .values({
      employeeId: input.employeeId,
      shiftPeriodId: input.shiftPeriodId,
      tokenHash,
      expiresAt,
      isActive: true,
      lastAccessedAt: null,
    })
    .onConflictDoUpdate({
      target: [
        employeeAccessTokens.employeeId,
        employeeAccessTokens.shiftPeriodId,
      ],
      set: {
        tokenHash,
        expiresAt,
        isActive: true,
        updatedAt: new Date(),
      },
    });

  return { ok: true, token, reason: null };
}

export async function findValidEmployeeAccessToken(token: string) {
  const tokenHash = hashEmployeeAccessToken(token);
  const [accessToken] = await getDb()
    .select({
      id: employeeAccessTokens.id,
      employeeId: employeeAccessTokens.employeeId,
      shiftPeriodId: employeeAccessTokens.shiftPeriodId,
      expiresAt: employeeAccessTokens.expiresAt,
      employeeName: employees.name,
      employeeDisplayName: employees.displayName,
      employeeIsActive: employees.isActive,
      periodName: shiftPeriods.name,
      periodStartDate: shiftPeriods.startDate,
      periodEndDate: shiftPeriods.endDate,
      periodStatus: shiftPeriods.status,
    })
    .from(employeeAccessTokens)
    .innerJoin(employees, eq(employeeAccessTokens.employeeId, employees.id))
    .innerJoin(shiftPeriods, eq(employeeAccessTokens.shiftPeriodId, shiftPeriods.id))
    .where(
      and(
        eq(employeeAccessTokens.tokenHash, tokenHash),
        eq(employeeAccessTokens.isActive, true),
        gt(employeeAccessTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!accessToken?.employeeIsActive) {
    return null;
  }

  await getDb()
    .update(employeeAccessTokens)
    .set({
      lastAccessedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(employeeAccessTokens.id, accessToken.id));

  return accessToken;
}
