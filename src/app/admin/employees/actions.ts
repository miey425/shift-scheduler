"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { getPositionSkillOptions } from "@/lib/shifts/shiftTemplates";
import { employeeFormSchema, employeeIdSchema } from "@/lib/validators/employee";
import {
  createEmployee,
  deleteEmployee,
  setEmployeeActive,
  updateEmployee,
  type EmployeeInput,
} from "@/repositories/employeeRepository";

function toBoolean(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function getSelectedPositionSkills(formData: FormData) {
  const selectableRoleLabels = new Set(
    getPositionSkillOptions().map((option) => option.roleLabel),
  );

  return formData
    .getAll("positionSkills")
    .filter((value): value is string => typeof value === "string")
    .filter((roleLabel) => selectableRoleLabels.has(roleLabel));
}

function toEmployeeInput(formData: FormData): EmployeeInput {
  const parsedForm = employeeFormSchema.parse({
    name: formData.get("name"),
    displayName: formData.get("displayName"),
    employmentType: formData.get("employmentType"),
    maxHoursPerDay: formData.get("maxHoursPerDay"),
    maxHoursPerWeek: formData.get("maxHoursPerWeek"),
    minDaysPerPeriod: formData.get("minDaysPerPeriod"),
    maxDaysPerPeriod: formData.get("maxDaysPerPeriod"),
    canOpen: toBoolean(formData, "canOpen"),
    canClose: toBoolean(formData, "canClose"),
    isHighSchoolStudent: toBoolean(formData, "isHighSchoolStudent"),
    memo: formData.get("memo"),
  });

  return {
    ...parsedForm,
    maxHoursPerDay: parsedForm.maxHoursPerDay.toFixed(2),
    maxHoursPerWeek: parsedForm.maxHoursPerWeek.toFixed(2),
    positionSkills: getSelectedPositionSkills(formData),
    memo: parsedForm.memo || null,
  };
}

export async function createEmployeeAction(formData: FormData) {
  await requireAdmin();

  try {
    await createEmployee(toEmployeeInput(formData));
  } catch {
    redirect("/admin/employees?error=create");
  }

  revalidatePath("/admin/employees");
  redirect("/admin/employees?created=1");
}

export async function updateEmployeeAction(formData: FormData) {
  await requireAdmin();

  const employeeId = employeeIdSchema.safeParse(formData.get("employeeId"));

  if (!employeeId.success) {
    redirect("/admin/employees?error=invalid");
  }

  try {
    await updateEmployee(employeeId.data, toEmployeeInput(formData));
  } catch {
    redirect("/admin/employees?error=update");
  }

  revalidatePath("/admin/employees");
  redirect("/admin/employees?updated=1");
}

export async function setEmployeeActiveAction(formData: FormData) {
  await requireAdmin();

  const employeeId = employeeIdSchema.safeParse(formData.get("employeeId"));
  const isActive = formData.get("isActive") === "true";

  if (!employeeId.success) {
    redirect("/admin/employees?error=invalid");
  }

  await setEmployeeActive(employeeId.data, isActive);
  revalidatePath("/admin/employees");
}

export async function deleteEmployeeAction(formData: FormData) {
  await requireAdmin();

  const employeeId = employeeIdSchema.safeParse(formData.get("employeeId"));

  if (!employeeId.success) {
    redirect("/admin/employees?error=invalid");
  }

  try {
    await deleteEmployee(employeeId.data);
  } catch {
    redirect("/admin/employees?error=delete");
  }

  revalidatePath("/admin/employees");
  redirect("/admin/employees?deleted=1");
}
