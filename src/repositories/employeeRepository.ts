import "server-only";

import { asc, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { employeePositionSkills, employees } from "@/db/schema";

export type EmploymentType =
  | "full_time"
  | "part_time"
  | "contract"
  | "temporary";

export type EmployeeInput = {
  name: string;
  displayName: string;
  employmentType: EmploymentType;
  maxHoursPerDay: string;
  maxHoursPerWeek: string;
  minDaysPerPeriod: number;
  maxDaysPerPeriod: number;
  canOpen: boolean;
  canClose: boolean;
  isHighSchoolStudent: boolean;
  positionSkills: string[];
  memo?: string | null;
};

export type EmployeeWithPositionSkills = typeof employees.$inferSelect & {
  positionSkills: string[];
};

async function attachPositionSkills<T extends { id: string }>(
  employeeRows: T[],
) {
  if (employeeRows.length === 0) {
    return employeeRows.map((employee) => ({
      ...employee,
      positionSkills: [],
    }));
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
    )
    .orderBy(asc(employeePositionSkills.roleLabel));
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

async function replaceEmployeePositionSkills(
  employeeId: string,
  positionSkills: string[],
) {
  await getDb()
    .delete(employeePositionSkills)
    .where(eq(employeePositionSkills.employeeId, employeeId));

  const uniquePositionSkills = Array.from(new Set(positionSkills));

  if (uniquePositionSkills.length === 0) {
    return;
  }

  await getDb()
    .insert(employeePositionSkills)
    .values(
      uniquePositionSkills.map((roleLabel) => ({
        employeeId,
        roleLabel,
      })),
    )
    .onConflictDoNothing();
}

export async function listEmployees(): Promise<EmployeeWithPositionSkills[]> {
  const employeeRows = await getDb()
    .select()
    .from(employees)
    .orderBy(desc(employees.isActive), asc(employees.displayName));

  return attachPositionSkills(employeeRows);
}

export async function listActiveEmployees(): Promise<EmployeeWithPositionSkills[]> {
  const employeeRows = await getDb()
    .select()
    .from(employees)
    .where(eq(employees.isActive, true))
    .orderBy(asc(employees.displayName));

  return attachPositionSkills(employeeRows);
}

export async function createEmployee(input: EmployeeInput) {
  const [employee] = await getDb()
    .insert(employees)
    .values({
      name: input.name,
      displayName: input.displayName,
      employmentType: input.employmentType,
      maxHoursPerDay: input.maxHoursPerDay,
      maxHoursPerWeek: input.maxHoursPerWeek,
      minDaysPerPeriod: input.minDaysPerPeriod,
      maxDaysPerPeriod: input.maxDaysPerPeriod,
      canOpen: input.canOpen,
      canClose: input.canClose,
      isHighSchoolStudent: input.isHighSchoolStudent,
      memo: input.memo || null,
    })
    .returning();

  await replaceEmployeePositionSkills(employee.id, input.positionSkills);

  return employee;
}

export async function updateEmployee(id: string, input: EmployeeInput) {
  const [employee] = await getDb()
    .update(employees)
    .set({
      name: input.name,
      displayName: input.displayName,
      employmentType: input.employmentType,
      maxHoursPerDay: input.maxHoursPerDay,
      maxHoursPerWeek: input.maxHoursPerWeek,
      minDaysPerPeriod: input.minDaysPerPeriod,
      maxDaysPerPeriod: input.maxDaysPerPeriod,
      canOpen: input.canOpen,
      canClose: input.canClose,
      isHighSchoolStudent: input.isHighSchoolStudent,
      memo: input.memo || null,
      updatedAt: new Date(),
    })
    .where(eq(employees.id, id))
    .returning();

  if (employee) {
    await replaceEmployeePositionSkills(employee.id, input.positionSkills);
  }

  return employee ?? null;
}

export async function setEmployeeActive(id: string, isActive: boolean) {
  const [employee] = await getDb()
    .update(employees)
    .set({
      isActive,
      updatedAt: new Date(),
    })
    .where(eq(employees.id, id))
    .returning();

  return employee ?? null;
}

export async function deleteEmployee(id: string) {
  const [employee] = await getDb()
    .delete(employees)
    .where(eq(employees.id, id))
    .returning();

  return employee ?? null;
}
