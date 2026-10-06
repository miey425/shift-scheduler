import { z } from "zod";

export const employmentTypeValues = [
  "full_time",
  "part_time",
  "contract",
  "temporary",
] as const;

export const employeeFormSchema = z.object({
  name: z.string().trim().min(1, "氏名を入力してください。").max(120),
  displayName: z.string().trim().min(1, "表示名を入力してください。").max(120),
  employmentType: z.enum(employmentTypeValues),
  maxHoursPerDay: z.coerce.number().min(1).max(24),
  maxHoursPerWeek: z.coerce.number().min(1).max(168),
  minDaysPerPeriod: z.coerce.number().int().min(0).max(31),
  maxDaysPerPeriod: z.coerce.number().int().min(0).max(31),
  canOpen: z.coerce.boolean(),
  canClose: z.coerce.boolean(),
  isHighSchoolStudent: z.coerce.boolean(),
  memo: z.string().trim().max(1000).optional(),
});

export const employeeIdSchema = z.string().uuid();
