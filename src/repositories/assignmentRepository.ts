import "server-only";

import { and, asc, count, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import {
  availabilities,
  availabilitySubmissions,
  employeePositionSkills,
  employees,
  shiftAssignments,
  shiftSlots,
} from "@/db/schema";
import { compareShiftSlots } from "@/lib/shifts/shiftSlotSorting";
import { requiresPositionSkill } from "@/lib/shifts/shiftTemplates";

export type ShiftAssignmentWithEmployee = {
  id: string;
  shiftSlotId: string;
  employeeId: string;
  employeeName: string;
  employeeDisplayName: string;
  status: "assigned" | "confirmed" | "cancelled";
};

type AvailabilityStatus = "available" | "unavailable" | "preferred";

type ActiveEmployee = Awaited<ReturnType<typeof listActiveEmployeesForAssignment>>[number];
type PeriodShiftSlot = Awaited<ReturnType<typeof listShiftSlotsForAssignment>>[number];

type EmployeeAssignmentState = {
  assignedDates: Set<string>;
  assignedSlotIds: Set<string>;
  totalHours: number;
};

const LATE_NIGHT_START_MINUTES = 22 * 60;

export async function listAssignmentsByShiftPeriodId(shiftPeriodId: string) {
  return getDb()
    .select({
      id: shiftAssignments.id,
      shiftSlotId: shiftAssignments.shiftSlotId,
      employeeId: shiftAssignments.employeeId,
      employeeName: employees.name,
      employeeDisplayName: employees.displayName,
      status: shiftAssignments.status,
    })
    .from(shiftAssignments)
    .innerJoin(shiftSlots, eq(shiftAssignments.shiftSlotId, shiftSlots.id))
    .innerJoin(employees, eq(shiftAssignments.employeeId, employees.id))
    .where(eq(shiftSlots.shiftPeriodId, shiftPeriodId));
}

async function listActiveEmployeesForAssignment() {
  const employeeRows = await getDb()
    .select({
      id: employees.id,
      displayName: employees.displayName,
      isHighSchoolStudent: employees.isHighSchoolStudent,
      canOpen: employees.canOpen,
      canClose: employees.canClose,
    })
    .from(employees)
    .where(eq(employees.isActive, true))
    .orderBy(asc(employees.displayName));

  if (employeeRows.length === 0) {
    return [];
  }

  const skills = await getDb()
    .select({
      employeeId: employeePositionSkills.employeeId,
      roleLabel: employeePositionSkills.roleLabel,
    })
    .from(employeePositionSkills)
    .where(
      inArray(
        employeePositionSkills.employeeId,
        employeeRows.map((employee) => employee.id),
      ),
    );
  const skillsByEmployeeId = new Map<string, string[]>();

  for (const skill of skills) {
    const roleLabels = skillsByEmployeeId.get(skill.employeeId) ?? [];
    roleLabels.push(skill.roleLabel);
    skillsByEmployeeId.set(skill.employeeId, roleLabels);
  }

  return employeeRows.map((employee) => ({
    ...employee,
    positionSkills: skillsByEmployeeId.get(employee.id) ?? [],
  }));
}

async function listShiftSlotsForAssignment(shiftPeriodId: string) {
  return getDb()
    .select()
    .from(shiftSlots)
    .where(eq(shiftSlots.shiftPeriodId, shiftPeriodId));
}

function parseTimeToMinutes(time: string) {
  const [hours, minutes] = time.slice(0, 5).split(":").map(Number);

  return hours * 60 + minutes;
}

function calculateSlotHours(slot: PeriodShiftSlot) {
  const workMinutes =
    parseTimeToMinutes(slot.endTime) - parseTimeToMinutes(slot.startTime);
  const breakMinutes =
    slot.breakStartTime && slot.breakEndTime
      ? parseTimeToMinutes(slot.breakEndTime) -
        parseTimeToMinutes(slot.breakStartTime)
      : 0;

  return Math.max(0, workMinutes - breakMinutes) / 60;
}

function endsAfterLateNightStart(slot: PeriodShiftSlot) {
  return parseTimeToMinutes(slot.endTime) > LATE_NIGHT_START_MINUTES;
}

function overlaps(a: PeriodShiftSlot, b: PeriodShiftSlot) {
  if (a.workDate !== b.workDate) {
    return false;
  }

  return (
    parseTimeToMinutes(a.startTime) < parseTimeToMinutes(b.endTime) &&
    parseTimeToMinutes(b.startTime) < parseTimeToMinutes(a.endTime)
  );
}

function canAssignEmployeeToSlot(input: {
  employee: ActiveEmployee;
  employeeSlots: PeriodShiftSlot[];
  slot: PeriodShiftSlot;
  state: EmployeeAssignmentState;
}) {
  const { employee, employeeSlots, slot, state } = input;

  if (state.assignedSlotIds.has(slot.id)) {
    return false;
  }

  if (
    requiresPositionSkill(slot.roleLabel) &&
    !employee.positionSkills.includes(slot.roleLabel ?? "")
  ) {
    return false;
  }

  if (slot.requiresOpen && !employee.canOpen) {
    return false;
  }

  if (slot.requiresClose && !employee.canClose) {
    return false;
  }

  if (employee.isHighSchoolStudent && endsAfterLateNightStart(slot)) {
    return false;
  }

  return !employeeSlots.some((employeeSlot) => overlaps(employeeSlot, slot));
}

function getAvailabilityPriority(status?: AvailabilityStatus) {
  if (status === "preferred") {
    return 0;
  }

  if (status === "available") {
    return 1;
  }

  return 2;
}

function applyAssignmentToState(
  state: EmployeeAssignmentState,
  slot: PeriodShiftSlot,
) {
  const slotHours = calculateSlotHours(slot);

  state.assignedDates.add(slot.workDate);
  state.assignedSlotIds.add(slot.id);
  state.totalHours += slotHours;
}

function createEmptyAssignmentState(): EmployeeAssignmentState {
  return {
    assignedDates: new Set(),
    assignedSlotIds: new Set(),
    totalHours: 0,
  };
}

export async function autoAssignShiftPeriod(input: {
  shiftPeriodId: string;
  assignedByAdminId: string;
}) {
  const [slots, activeEmployees, currentAssignments, submittedAvailabilities] =
    await Promise.all([
      listShiftSlotsForAssignment(input.shiftPeriodId),
      listActiveEmployeesForAssignment(),
      listAssignmentsByShiftPeriodId(input.shiftPeriodId),
      getDb()
        .select({
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
            eq(shiftSlots.shiftPeriodId, input.shiftPeriodId),
            eq(availabilitySubmissions.status, "submitted"),
          ),
        ),
    ]);
  const sortedSlots = [...slots].sort((a, b) => {
    const dateDiff = a.workDate.localeCompare(b.workDate);

    return dateDiff !== 0 ? dateDiff : compareShiftSlots(a, b);
  });
  const assignmentsBySlotId = new Map<string, typeof currentAssignments>();
  const assignedSlotIdsByEmployeeId = new Map<string, Set<string>>();

  for (const assignment of currentAssignments) {
    if (assignment.status !== "assigned") {
      continue;
    }

    const slotAssignments = assignmentsBySlotId.get(assignment.shiftSlotId) ?? [];
    slotAssignments.push(assignment);
    assignmentsBySlotId.set(assignment.shiftSlotId, slotAssignments);

    const slotIds =
      assignedSlotIdsByEmployeeId.get(assignment.employeeId) ?? new Set();
    slotIds.add(assignment.shiftSlotId);
    assignedSlotIdsByEmployeeId.set(assignment.employeeId, slotIds);
  }

  const slotsById = new Map(slots.map((slot) => [slot.id, slot]));
  const employeeSlotsByEmployeeId = new Map<string, PeriodShiftSlot[]>();
  const stateByEmployeeId = new Map<string, EmployeeAssignmentState>();

  for (const employee of activeEmployees) {
    stateByEmployeeId.set(employee.id, createEmptyAssignmentState());
  }

  for (const [employeeId, slotIds] of assignedSlotIdsByEmployeeId) {
    const state = stateByEmployeeId.get(employeeId);

    if (!state) {
      continue;
    }

    for (const slotId of slotIds) {
      const slot = slotsById.get(slotId);

      if (!slot) {
        continue;
      }

      const employeeSlots = employeeSlotsByEmployeeId.get(employeeId) ?? [];
      employeeSlots.push(slot);
      employeeSlotsByEmployeeId.set(employeeId, employeeSlots);
      applyAssignmentToState(state, slot);
    }
  }

  const availabilityBySlotId = new Map<
    string,
    Map<string, AvailabilityStatus>
  >();

  for (const availability of submittedAvailabilities) {
    const slotAvailabilities =
      availabilityBySlotId.get(availability.shiftSlotId) ?? new Map();
    slotAvailabilities.set(availability.employeeId, availability.status);
    availabilityBySlotId.set(availability.shiftSlotId, slotAvailabilities);
  }

  let createdCount = 0;

  for (const slot of sortedSlots) {
    const currentSlotAssignments = assignmentsBySlotId.get(slot.id) ?? [];
    let remainingCount = slot.requiredEmployees - currentSlotAssignments.length;

    while (remainingCount > 0) {
      const slotAvailabilities = availabilityBySlotId.get(slot.id) ?? new Map();
      const candidates = activeEmployees
        .map((employee) => ({
          employee,
          availabilityStatus: slotAvailabilities.get(employee.id),
          employeeSlots: employeeSlotsByEmployeeId.get(employee.id) ?? [],
          state: stateByEmployeeId.get(employee.id) ?? createEmptyAssignmentState(),
        }))
        .filter(({ availabilityStatus }) => availabilityStatus !== "unavailable")
        .filter(({ employee, employeeSlots, state }) =>
          canAssignEmployeeToSlot({ employee, employeeSlots, slot, state }),
        )
        .sort((a, b) => {
          const availabilityDiff =
            getAvailabilityPriority(a.availabilityStatus) -
            getAvailabilityPriority(b.availabilityStatus);

          if (availabilityDiff !== 0) {
            return availabilityDiff;
          }

          const dayDiff =
            a.state.assignedDates.size - b.state.assignedDates.size;

          if (dayDiff !== 0) {
            return dayDiff;
          }

          const hourDiff = a.state.totalHours - b.state.totalHours;

          if (hourDiff !== 0) {
            return hourDiff;
          }

          return a.employee.displayName.localeCompare(b.employee.displayName, "ja");
        });

      const candidate = candidates[0];

      if (!candidate) {
        break;
      }

      const [assignment] = await getDb()
        .insert(shiftAssignments)
        .values({
          shiftSlotId: slot.id,
          employeeId: candidate.employee.id,
          assignedByAdminId: input.assignedByAdminId,
          status: "assigned",
        })
        .onConflictDoNothing()
        .returning();

      if (!assignment) {
        break;
      }

      const employeeSlots =
        employeeSlotsByEmployeeId.get(candidate.employee.id) ?? [];
      employeeSlots.push(slot);
      employeeSlotsByEmployeeId.set(candidate.employee.id, employeeSlots);
      applyAssignmentToState(candidate.state, slot);

      const slotAssignments = assignmentsBySlotId.get(slot.id) ?? [];
      slotAssignments.push({
        id: assignment.id,
        shiftSlotId: slot.id,
        employeeId: candidate.employee.id,
        employeeName: candidate.employee.displayName,
        employeeDisplayName: candidate.employee.displayName,
        status: "assigned",
      });
      assignmentsBySlotId.set(slot.id, slotAssignments);

      createdCount += 1;
      remainingCount -= 1;
    }
  }

  const remainingOpenings = sortedSlots.reduce((total, slot) => {
    const slotAssignments = assignmentsBySlotId.get(slot.id) ?? [];

    return total + Math.max(0, slot.requiredEmployees - slotAssignments.length);
  }, 0);

  return {
    createdCount,
    remainingOpenings,
  };
}

export async function assignEmployeeToShiftSlot(input: {
  shiftSlotId: string;
  employeeId: string;
  assignedByAdminId: string;
}) {
  const [slot] = await getDb()
    .select()
    .from(shiftSlots)
    .where(eq(shiftSlots.id, input.shiftSlotId))
    .limit(1);

  if (!slot) {
    return { ok: false, reason: "slot_not_found" as const };
  }

  const [employee] = await getDb()
    .select()
    .from(employees)
    .where(eq(employees.id, input.employeeId))
    .limit(1);

  if (!employee?.isActive) {
    return { ok: false, reason: "employee_not_found" as const };
  }

  if (slot.roleLabel && requiresPositionSkill(slot.roleLabel)) {
    const [positionSkill] = await getDb()
      .select({ id: employeePositionSkills.id })
      .from(employeePositionSkills)
      .where(
        and(
          eq(employeePositionSkills.employeeId, input.employeeId),
          eq(employeePositionSkills.roleLabel, slot.roleLabel),
        ),
      )
      .limit(1);

    if (!positionSkill) {
      return { ok: false, reason: "position_skill" as const };
    }
  }

  if (slot.requiresOpen && !employee.canOpen) {
    return { ok: false, reason: "requires_open" as const };
  }

  if (slot.requiresClose && !employee.canClose) {
    return { ok: false, reason: "requires_close" as const };
  }

  if (employee.isHighSchoolStudent && endsAfterLateNightStart(slot)) {
    return { ok: false, reason: "late_night_restricted" as const };
  }

  const [unavailableSubmission] = await getDb()
    .select({ id: availabilities.id })
    .from(availabilities)
    .innerJoin(
      availabilitySubmissions,
      eq(availabilities.availabilitySubmissionId, availabilitySubmissions.id),
    )
    .where(
      and(
        eq(availabilities.shiftSlotId, input.shiftSlotId),
        eq(availabilities.status, "unavailable"),
        eq(availabilitySubmissions.employeeId, input.employeeId),
        eq(availabilitySubmissions.status, "submitted"),
      ),
    )
    .limit(1);

  if (unavailableSubmission) {
    return { ok: false, reason: "availability_unavailable" as const };
  }

  const [assignedCount] = await getDb()
    .select({ value: count() })
    .from(shiftAssignments)
    .where(
      and(
        eq(shiftAssignments.shiftSlotId, input.shiftSlotId),
        eq(shiftAssignments.status, "assigned"),
      ),
    );

  if ((assignedCount?.value ?? 0) >= slot.requiredEmployees) {
    return { ok: false, reason: "slot_full" as const };
  }

  await getDb()
    .insert(shiftAssignments)
    .values({
      shiftSlotId: input.shiftSlotId,
      employeeId: input.employeeId,
      assignedByAdminId: input.assignedByAdminId,
      status: "assigned",
    })
    .onConflictDoNothing();

  return { ok: true, reason: null };
}

export async function deleteShiftAssignment(id: string) {
  const [assignment] = await getDb()
    .delete(shiftAssignments)
    .where(eq(shiftAssignments.id, id))
    .returning();

  return assignment ?? null;
}
