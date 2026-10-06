import { config } from "dotenv";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb } from "../src/db";
import {
  admins,
  availabilities,
  availabilitySubmissions,
  employeeAccessTokens,
  employeePositionSkills,
  employees,
  shiftPeriods,
  shiftSlots,
} from "../src/db/schema";
import { getPositionSkillOptions } from "../src/lib/shifts/shiftTemplates";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

const seedIds = {
  admin: "11111111-1111-4111-8111-111111111111",
  employeeA: "22222222-2222-4222-8222-222222222222",
  employeeB: "33333333-3333-4333-8333-333333333333",
  period: "44444444-4444-4444-8444-444444444444",
  slotMorning: "55555555-5555-4555-8555-555555555555",
  slotEvening: "66666666-6666-4666-8666-666666666666",
  submissionA: "77777777-7777-4777-8777-777777777777",
  submissionB: "88888888-8888-4888-8888-888888888888",
  tokenA: "99999999-9999-4999-8999-999999999999",
  tokenB: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
};

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function main() {
  const db = getDb();
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "owner@example.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "change-me-before-use";
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const tokenA = randomBytes(32).toString("hex");
  const tokenB = randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);
  const seedShiftSlots = [
    {
      id: seedIds.slotMorning,
      shiftPeriodId: seedIds.period,
      workDate: "2026-09-01",
      startTime: "09:00",
      endTime: "13:30",
      requiredEmployees: 1,
      roleLabel: "ホールA",
      presetGroup: "weekday_lunch",
      requiresOpen: true,
    },
    {
      id: seedIds.slotEvening,
      shiftPeriodId: seedIds.period,
      workDate: "2026-09-01",
      startTime: "17:00",
      endTime: "22:00",
      requiredEmployees: 1,
      roleLabel: "ホールDA",
      presetGroup: "weekday_dinner",
    },
  ];

  await db
    .insert(admins)
    .values({
      id: seedIds.admin,
      name: "店舗オーナー",
      email: adminEmail,
      passwordHash,
      role: "owner",
    })
    .onConflictDoUpdate({
      target: admins.id,
      set: {
        name: "店舗オーナー",
        email: adminEmail,
        passwordHash,
        role: "owner",
        isActive: true,
        updatedAt: new Date(),
      },
    });

  await db
    .insert(employees)
    .values([
      {
        id: seedIds.employeeA,
        name: "山田 花子",
        displayName: "山田さん",
        employmentType: "part_time",
        maxHoursPerDay: "6.00",
        maxHoursPerWeek: "24.00",
        minDaysPerPeriod: 2,
        maxDaysPerPeriod: 4,
        canOpen: true,
        canClose: false,
        memo: "平日午前中心",
      },
      {
        id: seedIds.employeeB,
        name: "佐藤 太郎",
        displayName: "佐藤さん",
        employmentType: "part_time",
        maxHoursPerDay: "8.00",
        maxHoursPerWeek: "32.00",
        minDaysPerPeriod: 3,
        maxDaysPerPeriod: 5,
        canOpen: false,
        canClose: true,
        isHighSchoolStudent: false,
        memo: "夕方以降に対応可能",
      },
    ])
    .onConflictDoNothing();

  const positionSkillLabels = getPositionSkillOptions().map(
    (option) => option.roleLabel,
  );

  await db
    .insert(employeePositionSkills)
    .values(
      [seedIds.employeeA, seedIds.employeeB].flatMap((employeeId) =>
        positionSkillLabels.map((roleLabel) => ({
          employeeId,
          roleLabel,
        })),
      ),
    )
    .onConflictDoNothing();

  await db
    .insert(shiftPeriods)
    .values({
      id: seedIds.period,
      name: "2026年9月前半",
      startDate: "2026-09-01",
      endDate: "2026-09-14",
      submissionDeadline: new Date("2026-08-25T14:59:59.000Z"),
      status: "open",
    })
    .onConflictDoUpdate({
      target: shiftPeriods.id,
      set: {
        name: "2026年9月前半",
        startDate: "2026-09-01",
        endDate: "2026-09-14",
        submissionDeadline: new Date("2026-08-25T14:59:59.000Z"),
        status: "open",
        updatedAt: new Date(),
      },
    });

  await db
    .insert(shiftSlots)
    .values(seedShiftSlots)
    .onConflictDoNothing();

  for (const slot of seedShiftSlots) {
    await db
      .update(shiftSlots)
      .set({
        ...slot,
        updatedAt: new Date(),
      })
      .where(eq(shiftSlots.id, slot.id));
  }

  await db
    .insert(availabilitySubmissions)
    .values([
      {
        id: seedIds.submissionA,
        employeeId: seedIds.employeeA,
        shiftPeriodId: seedIds.period,
        status: "submitted",
        submittedAt: new Date(),
      },
      {
        id: seedIds.submissionB,
        employeeId: seedIds.employeeB,
        shiftPeriodId: seedIds.period,
        status: "submitted",
        submittedAt: new Date(),
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(availabilities)
    .values([
      {
        availabilitySubmissionId: seedIds.submissionA,
        shiftSlotId: seedIds.slotMorning,
        status: "preferred",
      },
      {
        availabilitySubmissionId: seedIds.submissionA,
        shiftSlotId: seedIds.slotEvening,
        status: "unavailable",
      },
      {
        availabilitySubmissionId: seedIds.submissionB,
        shiftSlotId: seedIds.slotMorning,
        status: "unavailable",
      },
      {
        availabilitySubmissionId: seedIds.submissionB,
        shiftSlotId: seedIds.slotEvening,
        status: "available",
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(employeeAccessTokens)
    .values([
      {
        id: seedIds.tokenA,
        employeeId: seedIds.employeeA,
        shiftPeriodId: seedIds.period,
        tokenHash: hashToken(tokenA),
        expiresAt,
      },
      {
        id: seedIds.tokenB,
        employeeId: seedIds.employeeB,
        shiftPeriodId: seedIds.period,
        tokenHash: hashToken(tokenB),
        expiresAt,
      },
    ])
    .onConflictDoUpdate({
      target: employeeAccessTokens.id,
      set: {
        expiresAt,
        isActive: true,
        updatedAt: new Date(),
      },
    });

  const employeeCount = await db.select().from(employees);
  const period = await db
    .select()
    .from(shiftPeriods)
    .where(eq(shiftPeriods.id, seedIds.period))
    .limit(1);

  console.log("Seed completed");
  console.log(`employees: ${employeeCount.length}`);
  console.log(`shiftPeriod: ${period[0]?.name ?? "not found"}`);
  console.log("Sample employee URLs:");
  console.log(`/availability/${tokenA}`);
  console.log(`/availability/${tokenB}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Unknown error");
  process.exit(1);
});
