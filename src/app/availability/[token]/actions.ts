"use server";

import { redirect } from "next/navigation";
import {
  availabilityMemoSchema,
  availabilityStatusSchema,
  employeeAccessTokenSchema,
} from "@/lib/validators/shift";
import {
  getAvailabilityGroupFormName,
  getAvailabilityGroupKey,
} from "@/lib/shifts/availabilityGroups";
import { findValidEmployeeAccessToken } from "@/repositories/employeeAccessTokenRepository";
import { listBusinessDayOverrides } from "@/repositories/businessDayRepository";
import { filterSlotsByBusinessHours } from "@/lib/shifts/businessHours";
import { listShiftSlotsByPeriodId } from "@/repositories/shiftPeriodRepository";
import {
  submitAvailabilities,
  type AvailabilityInput,
} from "@/repositories/availabilityRepository";

export async function submitAvailabilityAction(formData: FormData) {
  const token = employeeAccessTokenSchema.safeParse(formData.get("token"));

  if (!token.success) {
    redirect("/availability/invalid?error=invalid");
  }

  const accessToken = await findValidEmployeeAccessToken(token.data);

  if (!accessToken) {
    redirect(`/availability/${token.data}?error=invalid`);
  }

  if (accessToken.periodStatus !== "open") {
    redirect(`/availability/${token.data}?error=closed`);
  }

  const memo = availabilityMemoSchema.safeParse(formData.get("memo"));
  const [slots, overrides] = await Promise.all([
    listShiftSlotsByPeriodId(accessToken.shiftPeriodId),
    listBusinessDayOverrides(accessToken.shiftPeriodId),
  ]);
  const overridesByDate = new Map(overrides.map((override) => [override.workDate, override]));
  const eligibleSlots = filterSlotsByBusinessHours(slots, overridesByDate);
  const availabilities: AvailabilityInput[] = eligibleSlots.map((slot) => {
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
    employeeId: accessToken.employeeId,
    shiftPeriodId: accessToken.shiftPeriodId,
    memo: memo.success ? memo.data || null : null,
    availabilities,
  });

  redirect(`/availability/${token.data}/submitted`);
}
