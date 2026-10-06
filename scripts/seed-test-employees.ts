import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { getDb } from "../src/db";
import {
  availabilities,
  availabilitySubmissions,
  employeePositionSkills,
  employees,
  shiftPeriods,
  shiftSlots,
} from "../src/db/schema";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

type TestEmployee = {
  id: string;
  name: string;
  displayName: string;
  employmentType: "full_time" | "part_time" | "contract" | "temporary";
  canOpen: boolean;
  canClose: boolean;
  isHighSchoolStudent: boolean;
  memo: string;
  positionSkills: string[];
};

type TestShiftSlot = {
  id: string;
  workDate: string;
  startTime: string;
  endTime: string;
  requiredEmployees: number;
  roleLabel: string;
  presetGroup: string;
  requiresOpen: boolean;
  requiresClose: boolean;
  isBackup: boolean;
  breakStartTime?: string;
  breakEndTime?: string;
  memo: string;
};

type AvailabilityStatus = "available" | "unavailable" | "preferred";

const testShiftPeriod = {
  id: "10000000-0000-4000-8000-000000000100",
  name: "テスト用シフト 2026年9月後半",
  startDate: "2026-09-15",
  endDate: "2026-09-21",
  submissionDeadline: new Date("2026-09-10T14:59:59.000Z"),
};

const testEmployees: TestEmployee[] = [
  {
    id: "10000000-0000-4000-8000-000000000001",
    name: "テスト ホール万能",
    displayName: "テストホール万能",
    employmentType: "part_time",
    canOpen: true,
    canClose: true,
    isHighSchoolStudent: false,
    memo: "テスト用: ホール中心。オープン・ラスト両方対応。",
    positionSkills: ["ホールA", "ホールB", "ホールラスト"],
  },
  {
    id: "10000000-0000-4000-8000-000000000002",
    name: "テスト ランチホール",
    displayName: "テストランチホール",
    employmentType: "part_time",
    canOpen: true,
    canClose: false,
    isHighSchoolStudent: false,
    memo: "テスト用: ランチホールのみ。ラスト不可。",
    positionSkills: ["ホールA", "ホールB"],
  },
  {
    id: "10000000-0000-4000-8000-000000000003",
    name: "テスト キッチン万能",
    displayName: "テストキッチン万能",
    employmentType: "part_time",
    canOpen: true,
    canClose: true,
    isHighSchoolStudent: false,
    memo: "テスト用: キッチン全般と洗い場対応。",
    positionSkills: ["肉", "寿司", "サラダ", "スープ", "D洗い場"],
  },
  {
    id: "10000000-0000-4000-8000-000000000004",
    name: "テスト 寿司担当",
    displayName: "テスト寿司",
    employmentType: "part_time",
    canOpen: true,
    canClose: false,
    isHighSchoolStudent: false,
    memo: "テスト用: 寿司のみ。対応ポジション不足の確認用。",
    positionSkills: ["寿司"],
  },
  {
    id: "10000000-0000-4000-8000-000000000005",
    name: "テスト 高校生",
    displayName: "テスト高校生",
    employmentType: "part_time",
    canOpen: false,
    canClose: true,
    isHighSchoolStudent: true,
    memo: "テスト用: 18歳未満・高校生。22時以降にかかるシフト不可の確認用。",
    positionSkills: ["ホールラスト", "D洗い場"],
  },
  {
    id: "10000000-0000-4000-8000-000000000006",
    name: "テスト 洗い場ラスト",
    displayName: "テスト洗い場",
    employmentType: "part_time",
    canOpen: false,
    canClose: true,
    isHighSchoolStudent: false,
    memo: "テスト用: ラストとD洗い場対応。",
    positionSkills: ["D洗い場"],
  },
  {
    id: "10000000-0000-4000-8000-000000000007",
    name: "テスト オープン専任",
    displayName: "テストオープン",
    employmentType: "part_time",
    canOpen: true,
    canClose: false,
    isHighSchoolStudent: false,
    memo: "テスト用: オープンのみ。ランチキッチン中心。",
    positionSkills: ["肉", "サラダ", "スープ"],
  },
  {
    id: "10000000-0000-4000-8000-000000000008",
    name: "テスト 無効従業員",
    displayName: "テスト無効",
    employmentType: "temporary",
    canOpen: true,
    canClose: true,
    isHighSchoolStudent: false,
    memo: "テスト用: 無効表示の確認用。",
    positionSkills: ["ホールA", "ホールB", "ホールラスト", "D洗い場"],
  },
];

const testShiftSlots: TestShiftSlot[] = [
  {
    id: "10000000-0000-4000-8000-000000000201",
    workDate: "2026-09-15",
    startTime: "09:00",
    endTime: "13:30",
    requiredEmployees: 1,
    roleLabel: "ホールA",
    presetGroup: "weekday_lunch",
    requiresOpen: true,
    requiresClose: false,
    isBackup: false,
    memo: "テスト用: 平日ランチ、オープン経験必須。",
  },
  {
    id: "10000000-0000-4000-8000-000000000202",
    workDate: "2026-09-15",
    startTime: "09:00",
    endTime: "16:00",
    requiredEmployees: 1,
    roleLabel: "ホールB",
    presetGroup: "weekday_lunch",
    requiresOpen: true,
    requiresClose: false,
    isBackup: false,
    breakStartTime: "11:30",
    breakEndTime: "12:30",
    memo: "テスト用: 休憩あり、Excel休憩表示確認用。",
  },
  {
    id: "10000000-0000-4000-8000-000000000203",
    workDate: "2026-09-16",
    startTime: "10:00",
    endTime: "14:00",
    requiredEmployees: 1,
    roleLabel: "寿司",
    presetGroup: "weekday_lunch",
    requiresOpen: true,
    requiresClose: false,
    isBackup: false,
    memo: "テスト用: 寿司ポジション専任の確認用。",
  },
  {
    id: "10000000-0000-4000-8000-000000000204",
    workDate: "2026-09-16",
    startTime: "17:00",
    endTime: "22:00",
    requiredEmployees: 2,
    roleLabel: "ホールDA",
    presetGroup: "weekday_dinner",
    requiresOpen: false,
    requiresClose: false,
    isBackup: false,
    memo: "テスト用: 22時ちょうど終了。高校生も時間条件だけなら可。",
  },
  {
    id: "10000000-0000-4000-8000-000000000205",
    workDate: "2026-09-17",
    startTime: "18:30",
    endTime: "23:00",
    requiredEmployees: 1,
    roleLabel: "D洗い場",
    presetGroup: "weekday_dinner",
    requiresOpen: false,
    requiresClose: true,
    isBackup: false,
    memo: "テスト用: ラスト経験必須、22時超え。高校生不可確認用。",
  },
  {
    id: "10000000-0000-4000-8000-000000000206",
    workDate: "2026-09-19",
    startTime: "09:00",
    endTime: "13:30",
    requiredEmployees: 1,
    roleLabel: "肉",
    presetGroup: "holiday_lunch",
    requiresOpen: true,
    requiresClose: false,
    isBackup: false,
    memo: "テスト用: 土日祝ランチ、キッチンオープン。",
  },
  {
    id: "10000000-0000-4000-8000-000000000207",
    workDate: "2026-09-19",
    startTime: "17:30",
    endTime: "23:00",
    requiredEmployees: 1,
    roleLabel: "ホールラスト",
    presetGroup: "holiday_dinner",
    requiresOpen: false,
    requiresClose: true,
    isBackup: false,
    memo: "テスト用: 土日祝ディナー、ホールラスト、22時超え。",
  },
  {
    id: "10000000-0000-4000-8000-000000000208",
    workDate: "2026-09-20",
    startTime: "11:00",
    endTime: "15:00",
    requiredEmployees: 1,
    roleLabel: "フリー",
    presetGroup: "holiday_lunch",
    requiresOpen: false,
    requiresClose: false,
    isBackup: false,
    memo: "テスト用: 対応可能ポジション選択不要の確認用。",
  },
  {
    id: "10000000-0000-4000-8000-000000000209",
    workDate: "2026-09-20",
    startTime: "16:30",
    endTime: "20:30",
    requiredEmployees: 1,
    roleLabel: "キッチンDB",
    presetGroup: "holiday_dinner",
    requiresOpen: false,
    requiresClose: false,
    isBackup: true,
    memo: "テスト用: 予備枠、対応可能ポジション選択不要の確認用。",
  },
];

const testSubmissionIdsByEmployeeId = new Map(
  testEmployees.map((employee, index) => [
    employee.id,
    `10000000-0000-4000-8000-0000000003${String(index + 1).padStart(2, "0")}`,
  ]),
);

const availabilityRules: Record<string, Record<string, AvailabilityStatus>> = {
  "10000000-0000-4000-8000-000000000001": {
    "10000000-0000-4000-8000-000000000201": "preferred",
    "10000000-0000-4000-8000-000000000202": "available",
    "10000000-0000-4000-8000-000000000204": "available",
    "10000000-0000-4000-8000-000000000207": "preferred",
    "10000000-0000-4000-8000-000000000208": "available",
    "10000000-0000-4000-8000-000000000209": "available",
  },
  "10000000-0000-4000-8000-000000000002": {
    "10000000-0000-4000-8000-000000000201": "available",
    "10000000-0000-4000-8000-000000000202": "preferred",
    "10000000-0000-4000-8000-000000000204": "available",
    "10000000-0000-4000-8000-000000000208": "available",
  },
  "10000000-0000-4000-8000-000000000003": {
    "10000000-0000-4000-8000-000000000203": "available",
    "10000000-0000-4000-8000-000000000204": "available",
    "10000000-0000-4000-8000-000000000205": "preferred",
    "10000000-0000-4000-8000-000000000206": "preferred",
    "10000000-0000-4000-8000-000000000208": "available",
    "10000000-0000-4000-8000-000000000209": "available",
  },
  "10000000-0000-4000-8000-000000000004": {
    "10000000-0000-4000-8000-000000000203": "preferred",
    "10000000-0000-4000-8000-000000000208": "available",
  },
  "10000000-0000-4000-8000-000000000005": {
    "10000000-0000-4000-8000-000000000204": "preferred",
    "10000000-0000-4000-8000-000000000205": "preferred",
    "10000000-0000-4000-8000-000000000207": "preferred",
    "10000000-0000-4000-8000-000000000208": "available",
    "10000000-0000-4000-8000-000000000209": "available",
  },
  "10000000-0000-4000-8000-000000000006": {
    "10000000-0000-4000-8000-000000000205": "available",
    "10000000-0000-4000-8000-000000000208": "available",
    "10000000-0000-4000-8000-000000000209": "available",
  },
  "10000000-0000-4000-8000-000000000007": {
    "10000000-0000-4000-8000-000000000206": "available",
    "10000000-0000-4000-8000-000000000208": "available",
  },
};

async function main() {
  const db = getDb();

  for (const employee of testEmployees) {
    await db
      .insert(employees)
      .values({
        id: employee.id,
        name: employee.name,
        displayName: employee.displayName,
        employmentType: employee.employmentType,
        maxHoursPerDay: "24.00",
        maxHoursPerWeek: "168.00",
        minDaysPerPeriod: 0,
        maxDaysPerPeriod: 31,
        canOpen: employee.canOpen,
        canClose: employee.canClose,
        isHighSchoolStudent: employee.isHighSchoolStudent,
        isActive: employee.displayName !== "テスト無効",
        memo: employee.memo,
      })
      .onConflictDoUpdate({
        target: employees.id,
        set: {
          name: employee.name,
          displayName: employee.displayName,
          employmentType: employee.employmentType,
          maxHoursPerDay: "24.00",
          maxHoursPerWeek: "168.00",
          minDaysPerPeriod: 0,
          maxDaysPerPeriod: 31,
          canOpen: employee.canOpen,
          canClose: employee.canClose,
          isHighSchoolStudent: employee.isHighSchoolStudent,
          isActive: employee.displayName !== "テスト無効",
          memo: employee.memo,
          updatedAt: new Date(),
        },
      });

    await db
      .delete(employeePositionSkills)
      .where(eq(employeePositionSkills.employeeId, employee.id));

    if (employee.positionSkills.length > 0) {
      await db.insert(employeePositionSkills).values(
        employee.positionSkills.map((roleLabel) => ({
          employeeId: employee.id,
          roleLabel,
        })),
      );
    }
  }

  await db
    .insert(shiftPeriods)
    .values({
      id: testShiftPeriod.id,
      name: testShiftPeriod.name,
      startDate: testShiftPeriod.startDate,
      endDate: testShiftPeriod.endDate,
      submissionDeadline: testShiftPeriod.submissionDeadline,
      status: "open",
      memo: "テスト用: 条件違いの固定シフトをまとめた期間。",
    })
    .onConflictDoUpdate({
      target: shiftPeriods.id,
      set: {
        name: testShiftPeriod.name,
        startDate: testShiftPeriod.startDate,
        endDate: testShiftPeriod.endDate,
        submissionDeadline: testShiftPeriod.submissionDeadline,
        status: "open",
        memo: "テスト用: 条件違いの固定シフトをまとめた期間。",
        updatedAt: new Date(),
      },
    });

  for (const slot of testShiftSlots) {
    await db
      .insert(shiftSlots)
      .values({
        id: slot.id,
        shiftPeriodId: testShiftPeriod.id,
        workDate: slot.workDate,
        startTime: slot.startTime,
        endTime: slot.endTime,
        requiredEmployees: slot.requiredEmployees,
        roleLabel: slot.roleLabel,
        presetGroup: slot.presetGroup,
        requiresOpen: slot.requiresOpen,
        requiresClose: slot.requiresClose,
        isBackup: slot.isBackup,
        breakStartTime: slot.breakStartTime,
        breakEndTime: slot.breakEndTime,
        memo: slot.memo,
      })
      .onConflictDoUpdate({
        target: shiftSlots.id,
        set: {
          workDate: slot.workDate,
          startTime: slot.startTime,
          endTime: slot.endTime,
          requiredEmployees: slot.requiredEmployees,
          roleLabel: slot.roleLabel,
          presetGroup: slot.presetGroup,
          requiresOpen: slot.requiresOpen,
          requiresClose: slot.requiresClose,
          isBackup: slot.isBackup,
          breakStartTime: slot.breakStartTime,
          breakEndTime: slot.breakEndTime,
          memo: slot.memo,
          updatedAt: new Date(),
        },
      });
  }

  for (const employee of testEmployees) {
    if (employee.displayName === "テスト無効") {
      continue;
    }

    const submissionId = testSubmissionIdsByEmployeeId.get(employee.id);

    if (!submissionId) {
      continue;
    }

    const [submission] = await db
      .insert(availabilitySubmissions)
      .values({
        id: submissionId,
        employeeId: employee.id,
        shiftPeriodId: testShiftPeriod.id,
        status: "submitted",
        submittedAt: new Date(),
        memo: "テスト用: 自動割当確認のための提出済み希望。",
      })
      .onConflictDoUpdate({
        target: [
          availabilitySubmissions.employeeId,
          availabilitySubmissions.shiftPeriodId,
        ],
        set: {
          status: "submitted",
          submittedAt: new Date(),
          memo: "テスト用: 自動割当確認のための提出済み希望。",
          updatedAt: new Date(),
        },
      })
      .returning({ id: availabilitySubmissions.id });

    await db
      .delete(availabilities)
      .where(eq(availabilities.availabilitySubmissionId, submission.id));

    const employeeAvailabilityRules = availabilityRules[employee.id] ?? {};

    await db.insert(availabilities).values(
      testShiftSlots.map((slot) => ({
        availabilitySubmissionId: submission.id,
        shiftSlotId: slot.id,
        status: employeeAvailabilityRules[slot.id] ?? "unavailable",
      })),
    );
  }

  console.log(`Test employees upserted: ${testEmployees.length}`);
  console.log(`Test shift period upserted: ${testShiftPeriod.name}`);
  console.log(`Test shift slots upserted: ${testShiftSlots.length}`);
  console.log("Test availability submissions upserted: 7");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Unknown error");
  process.exit(1);
});
