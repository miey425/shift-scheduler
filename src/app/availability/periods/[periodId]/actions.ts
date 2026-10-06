"use server";

import { redirect } from "next/navigation";
import {
  availabilityMemoSchema,
  availabilityStatusSchema,
  shiftPeriodIdSchema,
} from "@/lib/validators/shift";
import { employeeIdSchema } from "@/lib/validators/employee";
import {
  getAvailabilityGroupFormName,
  getAvailabilityGroupKey,
} from "@/lib/shifts/availabilityGroups";
import { listActiveEmployees } from "@/repositories/employeeRepository";
import {
  findShiftPeriodById,
  listShiftSlotsByPeriodId,
} from "@/repositories/shiftPeriodRepository";
import {
  submitAvailabilities,
  type AvailabilityInput,
} from "@/repositories/availabilityRepository";

function getRedirectPath(shiftPeriodId: string, employeeId?: string) {
  const employeeParam = employeeId
    ? `?employeeId=${encodeURIComponent(employeeId)}`
    : "";

  return `/availability/periods/${shiftPeriodId}${employeeParam}`;
}

export async function submitSharedAvailabilityAction(formData: FormData) {
  const periodId = shiftPeriodIdSchema.safeParse(formData.get("shiftPeriodId"));
  const employeeId = employeeIdSchema.safeParse(formData.get("employeeId"));

  if (!periodId.success || !employeeId.success) {
    redirect("/availability/periods/invalid?error=invalid");
  }

  const [period, employees, slots] = await Promise.all([
    findShiftPeriodById(periodId.data),
    listActiveEmployees(),
    listShiftSlotsByPeriodId(periodId.data),
  ]);
  const selectedEmployee = employees.find(
    (employee) => employee.id === employeeId.data,
  );
  const redirectPath = getRedirectPath(periodId.data, employeeId.data);

  if (!period || !selectedEmployee) {
    redirect(`${redirectPath}&error=invalid`);
  }

  if (period.status !== "open") {
    redirect(`${redirectPath}&error=closed`);
  }

  const memo = availabilityMemoSchema.safeParse(formData.get("memo"));
  const availabilities: AvailabilityInput[] = slots.map((slot) => {
    const groupKey = getAvailabilityGroupKey(slot);
    const status = availabilityStatusSchema.safeParse(
      formData.get(getAvailabilityGroupFormName(slot.workDate, groupKey)),
    );

    return {
      shiftSlotId: slot.id,
      status: status.success ? status.data : "unavailable",
    };
  });

  await submitAvailabilities({
    employeeId: employeeId.data,
    shiftPeriodId: periodId.data,
    memo: memo.success ? memo.data || null : null,
    availabilities,
  });

  redirect(
    `/availability/periods/${periodId.data}/submitted?employeeId=${encodeURIComponent(employeeId.data)}`,
  );
}
