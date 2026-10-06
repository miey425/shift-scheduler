import { z } from "zod";

export const shiftPeriodStatusValues = [
  "draft",
  "open",
  "closed",
  "published",
] as const;

function countInclusiveDays(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);
  const millisecondsPerDay = 24 * 60 * 60 * 1000;

  return Math.floor((end.getTime() - start.getTime()) / millisecondsPerDay) + 1;
}

export const shiftPeriodFormSchema = z
  .object({
    name: z.string().trim().min(1, "期間名を入力してください。").max(120),
    startDate: z.string().date(),
    endDate: z.string().date(),
    submissionDeadline: z.string().trim().optional(),
    status: z.enum(shiftPeriodStatusValues),
    memo: z.string().trim().max(1000).optional(),
  })
  .refine((value) => value.startDate <= value.endDate, {
    message: "終了日は開始日以降にしてください。",
    path: ["endDate"],
  })
  .refine(
    (value) => {
      if (value.startDate > value.endDate) {
        return true;
      }

      const days = countInclusiveDays(value.startDate, value.endDate);
      return days >= 7 && days <= 14;
    },
    {
      message: "シフト期間は1週間から2週間にしてください。",
      path: ["endDate"],
    },
  );

export const shiftSlotFormSchema = z
  .object({
    shiftPeriodId: z.string().uuid(),
    workDate: z.string().date(),
    startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    requiredEmployees: z.coerce.number().int().min(1).max(99),
    roleLabel: z.string().trim().max(120).optional(),
    presetGroup: z.string().trim().max(80).optional(),
    requiresOpen: z.coerce.boolean(),
    requiresClose: z.coerce.boolean(),
    isBackup: z.coerce.boolean(),
    breakStartTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .optional()
      .or(z.literal("")),
    breakEndTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .optional()
      .or(z.literal("")),
    memo: z.string().trim().max(1000).optional(),
  })
  .refine((value) => value.startTime < value.endTime, {
    message: "終了時刻は開始時刻より後にしてください。",
    path: ["endTime"],
  })
  .refine(
    (value) =>
      !value.breakStartTime ||
      !value.breakEndTime ||
      value.breakStartTime < value.breakEndTime,
    {
      message: "休憩終了時刻は休憩開始時刻より後にしてください。",
      path: ["breakEndTime"],
    },
  )
  .refine(
    (value) =>
      (!value.breakStartTime && !value.breakEndTime) ||
      (Boolean(value.breakStartTime) && Boolean(value.breakEndTime)),
    {
      message: "休憩時間は開始と終了を両方入力してください。",
      path: ["breakStartTime"],
    },
  )
  .refine(
    (value) => {
      if (!value.breakStartTime || !value.breakEndTime) {
        return true;
      }

      return (
        value.startTime <= value.breakStartTime &&
        value.breakEndTime <= value.endTime
      );
    },
    {
      message: "休憩時間は勤務時間内にしてください。",
      path: ["breakStartTime"],
    },
  );

export const shiftPeriodIdSchema = z.string().uuid();
export const shiftSlotIdSchema = z.string().uuid();
export const shiftAssignmentIdSchema = z.string().uuid();
export const shiftTemplateIdSchema = z.string().min(1).max(120);
export const shiftWorkDateSchema = z.string().date();
export const employeeAccessTokenSchema = z.string().trim().min(20).max(200);
export const availabilityStatusSchema = z.enum([
  "available",
  "unavailable",
  "preferred",
]);
export const availabilityMemoSchema = z.string().trim().max(1000).optional();
