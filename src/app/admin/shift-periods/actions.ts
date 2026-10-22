"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import {
  shiftAssignmentIdSchema,
  shiftPeriodFormSchema,
  shiftPeriodIdSchema,
  shiftSlotFormSchema,
  shiftSlotIdSchema,
  shiftTemplateIdSchema,
  shiftWorkDateSchema,
  businessDaySettingSchema,
} from "@/lib/validators/shift";
import { employeeIdSchema } from "@/lib/validators/employee";
import {
  findShiftTemplateById,
  getDateKeysInRange,
  getFixedShiftTemplatesForDate,
} from "@/lib/shifts/shiftTemplates";
import { getCappedEndTime, resolveBusinessDay } from "@/lib/shifts/businessHours";
import {
  getBusinessDay,
  listBusinessDayOverrides,
  saveBusinessDayOverride,
} from "@/repositories/businessDayRepository";
import {
  autoAssignShiftPeriod,
  assignEmployeeToShiftSlot,
  deleteShiftAssignment,
} from "@/repositories/assignmentRepository";
import { createOrUpdateEmployeeAccessToken } from "@/repositories/employeeAccessTokenRepository";
import {
  createShiftPeriod,
  deleteShiftPeriod,
  listShiftSlotsByPeriodId,
  updateShiftPeriodStatus,
} from "@/repositories/shiftPeriodRepository";
import {
  createShiftSlot,
  deleteShiftSlot,
} from "@/repositories/shiftSlotRepository";

function getSubmissionDeadline(endDate: string) {
  const nextDay = new Date(`${endDate}T00:00:00.000Z`);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  return new Date(`${nextDay.toISOString().slice(0, 10)}T00:00:00+09:00`);
}

async function generateFixedShiftSlots(period: {
  id: string;
  startDate: string;
  endDate: string;
}) {
  const [existingSlots, overrides] = await Promise.all([
    listShiftSlotsByPeriodId(period.id),
    listBusinessDayOverrides(period.id),
  ]);
  const workDates = getDateKeysInRange(period.startDate, period.endDate);
  const overridesByDate = new Map(overrides.map((override) => [override.workDate, override]));
  const existingKeys = new Set(
    existingSlots.map(
      (slot) => `${slot.workDate}|${slot.presetGroup ?? ""}|${slot.roleLabel ?? ""}`,
    ),
  );
  let createdCount = 0;

  for (const workDate of workDates) {
    const businessDay = resolveBusinessDay(workDate, overridesByDate.get(workDate));
    if (businessDay.isClosed || !businessDay.closingTime) continue;

    for (const template of getFixedShiftTemplatesForDate(workDate)) {
      const endTime = getCappedEndTime(template.startTime, template.endTime, businessDay);
      if (!endTime) continue;

      const key = `${workDate}|${template.group}|${template.roleLabel}`;
      if (existingKeys.has(key)) continue;

      await createShiftSlot({
        shiftPeriodId: period.id,
        workDate,
        startTime: template.startTime,
        endTime,
        requiredEmployees: template.requiredEmployees,
        roleLabel: template.roleLabel,
        presetGroup: template.group,
        requiresOpen: template.requiresOpen,
        requiresClose: template.requiresClose,
        isBackup: template.isBackup,
        breakStartTime: template.breakStartTime ?? null,
        breakEndTime: template.breakEndTime ?? null,
        memo: template.isBackup ? "予備枠" : null,
      });

      existingKeys.add(key);
      createdCount += 1;
    }
  }

  return { createdCount, firstWorkDate: workDates[0] };
}

function toBoolean(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function getSelectedDateParam(formData: FormData) {
  const selectedDate = shiftWorkDateSchema.safeParse(formData.get("selectedDate"));

  return selectedDate.success ? `&date=${selectedDate.data}` : "";
}

export type CreateShiftPeriodState = {
  error: string | null;
  values: {
    name: string;
    startDate: string;
    endDate: string;
    memo: string;
  };
};

export async function createShiftPeriodAction(
  _previousState: CreateShiftPeriodState,
  formData: FormData,
): Promise<CreateShiftPeriodState> {
  await requireAdmin();

  const values = {
    name: String(formData.get("name") ?? ""),
    startDate: String(formData.get("startDate") ?? ""),
    endDate: String(formData.get("endDate") ?? ""),
    memo: String(formData.get("memo") ?? ""),
  };

  const parsedForm = shiftPeriodFormSchema.safeParse({
    ...values,
    status: formData.get("status"),
  });

  if (!parsedForm.success) {
    const validationMessage = parsedForm.error.issues.find((issue) =>
      issue.path.includes("endDate"),
    )?.message;
    return {
      error: validationMessage ?? "期間名と日付を確認してください。",
      values,
    };
  }

  const submissionDeadline = getSubmissionDeadline(parsedForm.data.endDate);

  let createdPeriodId: string;

  try {
    const period = await createShiftPeriod({
      ...parsedForm.data,
      submissionDeadline,
      memo: parsedForm.data.memo || null,
    });

    createdPeriodId = period.id;
  } catch {
    return { error: "シフト期間を保存できませんでした。接続を確認して再度お試しください。", values };
  }

  let fixedShiftResult: Awaited<ReturnType<typeof generateFixedShiftSlots>>;
  try {
    fixedShiftResult = await generateFixedShiftSlots({
      id: createdPeriodId,
      startDate: parsedForm.data.startDate,
      endDate: parsedForm.data.endDate,
    });
  } catch {
    revalidatePath("/admin/shift-periods");
    revalidatePath(`/admin/shift-periods/${createdPeriodId}`);
    redirect(`/admin/shift-periods/${createdPeriodId}?created=1&fixedError=1`);
  }

  revalidatePath("/admin/shift-periods");
  revalidatePath(`/admin/shift-periods/${createdPeriodId}`);
  redirect(`/admin/shift-periods/${createdPeriodId}?created=1&fixedCreated=${fixedShiftResult.createdCount}&date=${fixedShiftResult.firstWorkDate ?? ""}`);
}

export async function closeShiftPeriodAction(formData: FormData) {
  await requireAdmin();

  const periodId = shiftPeriodIdSchema.safeParse(formData.get("shiftPeriodId"));
  const returnTo = formData.get("returnTo");

  if (!periodId.success) {
    redirect("/admin/shift-periods?error=invalid");
  }

  const period = await updateShiftPeriodStatus(periodId.data, "closed");
  const redirectPath =
    returnTo === "detail"
      ? `/admin/shift-periods/${periodId.data}`
      : "/admin/shift-periods";

  if (!period) {
    redirect(`${redirectPath}?error=invalid`);
  }

  revalidatePath("/admin/shift-periods");
  revalidatePath(`/admin/shift-periods/${periodId.data}`);
  redirect(`${redirectPath}?closed=1`);
}

export async function deleteShiftPeriodAction(formData: FormData) {
  await requireAdmin();

  const periodId = shiftPeriodIdSchema.safeParse(formData.get("shiftPeriodId"));

  if (!periodId.success) {
    redirect("/admin/shift-periods?error=invalid");
  }

  const period = await deleteShiftPeriod(periodId.data);

  if (!period) {
    redirect("/admin/shift-periods?error=invalid");
  }

  revalidatePath("/admin/shift-periods");
  revalidatePath(`/admin/shift-periods/${periodId.data}`);
  redirect("/admin/shift-periods?deleted=1");
}

export async function generateEmployeeAccessTokenAction(formData: FormData) {
  await requireAdmin();

  const periodId = shiftPeriodIdSchema.safeParse(formData.get("shiftPeriodId"));
  const employeeId = employeeIdSchema.safeParse(formData.get("employeeId"));

  if (!periodId.success || !employeeId.success) {
    redirect("/admin/shift-periods?error=invalid");
  }

  const result = await createOrUpdateEmployeeAccessToken({
    employeeId: employeeId.data,
    shiftPeriodId: periodId.data,
  });

  if (!result.ok || !result.token) {
    redirect(`/admin/shift-periods/${periodId.data}?error=token`);
  }

  revalidatePath(`/admin/shift-periods/${periodId.data}`);
  redirect(
    `/admin/shift-periods/${periodId.data}?generatedToken=${encodeURIComponent(
      result.token,
    )}&generatedEmployee=${employeeId.data}`,
  );
}

export async function createShiftSlotAction(formData: FormData) {
  await requireAdmin();

  const parsedForm = shiftSlotFormSchema.safeParse({
    shiftPeriodId: formData.get("shiftPeriodId"),
    workDate: formData.get("workDate"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    requiredEmployees: formData.get("requiredEmployees"),
    roleLabel: formData.get("roleLabel"),
    presetGroup: formData.get("presetGroup"),
    requiresOpen: toBoolean(formData, "requiresOpen"),
    requiresClose: toBoolean(formData, "requiresClose"),
    isBackup: toBoolean(formData, "isBackup"),
    breakStartTime: formData.get("breakStartTime"),
    breakEndTime: formData.get("breakEndTime"),
    memo: formData.get("memo"),
  });

  if (!parsedForm.success) {
    redirect("/admin/shift-periods?error=slot");
  }

  try {
    await createShiftSlot({
      ...parsedForm.data,
      roleLabel: parsedForm.data.roleLabel || null,
      presetGroup: parsedForm.data.presetGroup || null,
      breakStartTime: parsedForm.data.breakStartTime || null,
      breakEndTime: parsedForm.data.breakEndTime || null,
      memo: parsedForm.data.memo || null,
    });
  } catch {
    redirect(`/admin/shift-periods/${parsedForm.data.shiftPeriodId}?error=businessHours`);
  }

  revalidatePath(`/admin/shift-periods/${parsedForm.data.shiftPeriodId}`);
  redirect(`/admin/shift-periods/${parsedForm.data.shiftPeriodId}?slotCreated=1`);
}

export async function createShiftSlotFromTemplateAction(formData: FormData) {
  await requireAdmin();

  const periodId = shiftPeriodIdSchema.safeParse(formData.get("shiftPeriodId"));
  const workDate = shiftWorkDateSchema.safeParse(formData.get("workDate"));
  const templateId = shiftTemplateIdSchema.safeParse(formData.get("templateId"));

  if (!periodId.success || !workDate.success || !templateId.success) {
    redirect("/admin/shift-periods?error=invalid");
  }

  const template = findShiftTemplateById(templateId.data);

  if (!template) {
    redirect(`/admin/shift-periods/${periodId.data}?error=template`);
  }

  const businessDay = await getBusinessDay(periodId.data, workDate.data);
  const endTime = getCappedEndTime(template.startTime, template.endTime, businessDay);

  if (!endTime) {
    redirect(`/admin/shift-periods/${periodId.data}?error=businessHours`);
  }

  await createShiftSlot({
    shiftPeriodId: periodId.data,
    workDate: workDate.data,
    startTime: template.startTime,
    endTime,
    requiredEmployees: template.requiredEmployees,
    roleLabel: template.roleLabel,
    presetGroup: template.group,
    requiresOpen: template.requiresOpen,
    requiresClose: template.requiresClose,
    isBackup: template.isBackup,
    breakStartTime: template.breakStartTime ?? null,
    breakEndTime: template.breakEndTime ?? null,
    memo: template.isBackup ? "予備枠" : null,
  });

  revalidatePath(`/admin/shift-periods/${periodId.data}`);
  redirect(`/admin/shift-periods/${periodId.data}?slotCreated=1`);
}

export async function updateBusinessDayAction(formData: FormData) {
  await requireAdmin();

  const periodId = shiftPeriodIdSchema.safeParse(formData.get("shiftPeriodId"));
  const workDate = shiftWorkDateSchema.safeParse(formData.get("workDate"));
  const setting = businessDaySettingSchema.safeParse(formData.get("setting"));

  if (!periodId.success || !workDate.success || !setting.success) {
    redirect("/admin/shift-periods?error=invalid");
  }

  const result = await saveBusinessDayOverride({
    shiftPeriodId: periodId.data,
    workDate: workDate.data,
    setting: setting.data,
  });

  if (!result.ok) {
    redirect(`/admin/shift-periods/${periodId.data}?error=${result.reason}`);
  }

  revalidatePath(`/admin/shift-periods/${periodId.data}`);
  revalidatePath(`/availability/periods/${periodId.data}`);
  redirect(`/admin/shift-periods/${periodId.data}?businessDayUpdated=1`);
}

export async function deleteShiftSlotAction(formData: FormData) {
  await requireAdmin();

  const slotId = shiftSlotIdSchema.safeParse(formData.get("shiftSlotId"));
  const periodId = shiftPeriodIdSchema.safeParse(formData.get("shiftPeriodId"));

  if (!slotId.success || !periodId.success) {
    redirect("/admin/shift-periods?error=invalid");
  }

  const selectedDateParam = getSelectedDateParam(formData);

  await deleteShiftSlot(slotId.data);
  revalidatePath(`/admin/shift-periods/${periodId.data}`);
  redirect(`/admin/shift-periods/${periodId.data}?slotDeleted=1${selectedDateParam}`);
}

export async function assignEmployeeAction(formData: FormData) {
  const admin = await requireAdmin();

  const periodId = shiftPeriodIdSchema.safeParse(formData.get("shiftPeriodId"));
  const slotId = shiftSlotIdSchema.safeParse(formData.get("shiftSlotId"));
  const employeeId = employeeIdSchema.safeParse(formData.get("employeeId"));
  const selectorCountValue = Number(formData.get("selectorCount"));
  const selectorCount = Number.isInteger(selectorCountValue)
    ? Math.max(1, Math.min(20, selectorCountValue))
    : 1;

  if (!periodId.success || !slotId.success || !employeeId.success) {
    redirect("/admin/shift-periods?error=invalid");
  }

  const selectedDateParam = getSelectedDateParam(formData);
  const selectorCountParam = `&selectorCount=${selectorCount}`;
  const result = await assignEmployeeToShiftSlot({
    shiftSlotId: slotId.data,
    employeeId: employeeId.data,
    assignedByAdminId: admin.id,
  });

  if (!result.ok) {
    redirect(
      `/admin/shift-periods/${periodId.data}?assignError=${result.reason}${selectorCountParam}${selectedDateParam}`,
    );
  }

  revalidatePath(`/admin/shift-periods/${periodId.data}`);
  redirect(`/admin/shift-periods/${periodId.data}?assigned=1${selectorCountParam}${selectedDateParam}`);
}

export async function autoAssignShiftPeriodAction(formData: FormData) {
  const admin = await requireAdmin();

  const periodId = shiftPeriodIdSchema.safeParse(formData.get("shiftPeriodId"));

  if (!periodId.success) {
    redirect("/admin/shift-periods?error=invalid");
  }

  const result = await autoAssignShiftPeriod({
    shiftPeriodId: periodId.data,
    assignedByAdminId: admin.id,
  });

  revalidatePath(`/admin/shift-periods/${periodId.data}`);
  redirect(
    `/admin/shift-periods/${periodId.data}?autoAssigned=${result.createdCount}&autoRemaining=${result.remainingOpenings}`,
  );
}

export async function deleteShiftAssignmentAction(formData: FormData) {
  await requireAdmin();

  const periodId = shiftPeriodIdSchema.safeParse(formData.get("shiftPeriodId"));
  const assignmentId = shiftAssignmentIdSchema.safeParse(
    formData.get("assignmentId"),
  );

  if (!periodId.success || !assignmentId.success) {
    redirect("/admin/shift-periods?error=invalid");
  }

  const selectedDateParam = getSelectedDateParam(formData);

  await deleteShiftAssignment(assignmentId.data);
  revalidatePath(`/admin/shift-periods/${periodId.data}`);
  redirect(`/admin/shift-periods/${periodId.data}?unassigned=1${selectedDateParam}`);
}
