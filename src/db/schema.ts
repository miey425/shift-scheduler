import {
  boolean,
  check,
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { sql } from "drizzle-orm";

export const adminRoleEnum = pgEnum("admin_role", [
  "owner",
  "manager",
  "editor",
  "viewer",
]);

export const employmentTypeEnum = pgEnum("employment_type", [
  "full_time",
  "part_time",
  "contract",
  "temporary",
]);

export const shiftPeriodStatusEnum = pgEnum("shift_period_status", [
  "draft",
  "open",
  "closed",
  "published",
]);

export const availabilitySubmissionStatusEnum = pgEnum(
  "availability_submission_status",
  ["draft", "submitted"],
);

export const availabilityStatusEnum = pgEnum("availability_status", [
  "available",
  "unavailable",
  "preferred",
]);

export const assignmentStatusEnum = pgEnum("assignment_status", [
  "assigned",
  "confirmed",
  "cancelled",
]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const admins = pgTable(
  "admins",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    role: adminRoleEnum("role").default("manager").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    ...timestamps,
  },
  (table) => [uniqueIndex("admins_email_unique").on(table.email)],
);

export const employees = pgTable(
  "employees",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    displayName: varchar("display_name", { length: 120 }).notNull(),
    employmentType: employmentTypeEnum("employment_type").default("part_time").notNull(),
    maxHoursPerDay: numeric("max_hours_per_day", {
      precision: 4,
      scale: 2,
    }).default("8.00").notNull(),
    maxHoursPerWeek: numeric("max_hours_per_week", {
      precision: 5,
      scale: 2,
    }).default("40.00").notNull(),
    minDaysPerPeriod: integer("min_days_per_period").default(0).notNull(),
    maxDaysPerPeriod: integer("max_days_per_period").default(5).notNull(),
    canOpen: boolean("can_open").default(false).notNull(),
    canClose: boolean("can_close").default(false).notNull(),
    isHighSchoolStudent: boolean("is_high_school_student").default(false).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    memo: text("memo"),
    ...timestamps,
  },
  (table) => [
    index("employees_is_active_idx").on(table.isActive),
    index("employees_display_name_idx").on(table.displayName),
  ],
);

export const shiftPeriods = pgTable(
  "shift_periods",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    submissionDeadline: timestamp("submission_deadline", { withTimezone: true }),
    status: shiftPeriodStatusEnum("status").default("draft").notNull(),
    memo: text("memo"),
    ...timestamps,
  },
  (table) => [
    index("shift_periods_start_date_idx").on(table.startDate),
    index("shift_periods_status_idx").on(table.status),
  ],
);

export const businessDayOverrides = pgTable(
  "business_day_overrides",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    shiftPeriodId: uuid("shift_period_id")
      .notNull()
      .references(() => shiftPeriods.id, { onDelete: "cascade" }),
    workDate: date("work_date").notNull(),
    isClosed: boolean("is_closed").notNull(),
    closingTime: time("closing_time"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("business_day_overrides_period_date_unique").on(
      table.shiftPeriodId,
      table.workDate,
    ),
    check(
      "business_day_overrides_state_check",
      sql`(${table.isClosed} AND ${table.closingTime} IS NULL) OR (NOT ${table.isClosed} AND ${table.closingTime} IS NOT NULL)`,
    ),
  ],
);

export const shiftSlots = pgTable(
  "shift_slots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    shiftPeriodId: uuid("shift_period_id")
      .notNull()
      .references(() => shiftPeriods.id, { onDelete: "cascade" }),
    workDate: date("work_date").notNull(),
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
    requiredEmployees: integer("required_employees").default(1).notNull(),
    roleLabel: varchar("role_label", { length: 120 }),
    presetGroup: varchar("preset_group", { length: 80 }),
    requiresOpen: boolean("requires_open").default(false).notNull(),
    requiresClose: boolean("requires_close").default(false).notNull(),
    isBackup: boolean("is_backup").default(false).notNull(),
    breakStartTime: time("break_start_time"),
    breakEndTime: time("break_end_time"),
    memo: text("memo"),
    ...timestamps,
  },
  (table) => [
    index("shift_slots_period_date_idx").on(table.shiftPeriodId, table.workDate),
  ],
);

export const availabilitySubmissions = pgTable(
  "availability_submissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    shiftPeriodId: uuid("shift_period_id")
      .notNull()
      .references(() => shiftPeriods.id, { onDelete: "cascade" }),
    status: availabilitySubmissionStatusEnum("status").default("draft").notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    memo: text("memo"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("availability_submissions_employee_period_unique").on(
      table.employeeId,
      table.shiftPeriodId,
    ),
    index("availability_submissions_period_idx").on(table.shiftPeriodId),
  ],
);

export const availabilities = pgTable(
  "availabilities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    availabilitySubmissionId: uuid("availability_submission_id")
      .notNull()
      .references(() => availabilitySubmissions.id, { onDelete: "cascade" }),
    shiftSlotId: uuid("shift_slot_id")
      .notNull()
      .references(() => shiftSlots.id, { onDelete: "cascade" }),
    status: availabilityStatusEnum("status").default("unavailable").notNull(),
    memo: text("memo"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("availabilities_submission_slot_unique").on(
      table.availabilitySubmissionId,
      table.shiftSlotId,
    ),
    index("availabilities_shift_slot_idx").on(table.shiftSlotId),
  ],
);

export const employeeAccessTokens = pgTable(
  "employee_access_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    shiftPeriodId: uuid("shift_period_id")
      .notNull()
      .references(() => shiftPeriods.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    lastAccessedAt: timestamp("last_accessed_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("employee_access_tokens_token_hash_unique").on(table.tokenHash),
    uniqueIndex("employee_access_tokens_employee_period_unique").on(
      table.employeeId,
      table.shiftPeriodId,
    ),
    index("employee_access_tokens_active_expires_idx").on(
      table.isActive,
      table.expiresAt,
    ),
  ],
);

export const employeePositionSkills = pgTable(
  "employee_position_skills",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    roleLabel: varchar("role_label", { length: 120 }).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("employee_position_skills_employee_role_unique").on(
      table.employeeId,
      table.roleLabel,
    ),
    index("employee_position_skills_employee_idx").on(table.employeeId),
    index("employee_position_skills_role_label_idx").on(table.roleLabel),
  ],
);

export const shiftAssignments = pgTable(
  "shift_assignments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    shiftSlotId: uuid("shift_slot_id")
      .notNull()
      .references(() => shiftSlots.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    assignedByAdminId: uuid("assigned_by_admin_id").references(() => admins.id, {
      onDelete: "set null",
    }),
    status: assignmentStatusEnum("status").default("assigned").notNull(),
    memo: text("memo"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("shift_assignments_slot_employee_unique").on(
      table.shiftSlotId,
      table.employeeId,
    ),
    index("shift_assignments_employee_idx").on(table.employeeId),
  ],
);

export const adminsRelations = relations(admins, ({ many }) => ({
  shiftAssignments: many(shiftAssignments),
}));

export const employeesRelations = relations(employees, ({ many }) => ({
  availabilitySubmissions: many(availabilitySubmissions),
  accessTokens: many(employeeAccessTokens),
  positionSkills: many(employeePositionSkills),
  shiftAssignments: many(shiftAssignments),
}));

export const shiftPeriodsRelations = relations(shiftPeriods, ({ many }) => ({
  shiftSlots: many(shiftSlots),
  businessDayOverrides: many(businessDayOverrides),
  availabilitySubmissions: many(availabilitySubmissions),
  accessTokens: many(employeeAccessTokens),
}));

export const businessDayOverridesRelations = relations(
  businessDayOverrides,
  ({ one }) => ({
    shiftPeriod: one(shiftPeriods, {
      fields: [businessDayOverrides.shiftPeriodId],
      references: [shiftPeriods.id],
    }),
  }),
);

export const shiftSlotsRelations = relations(shiftSlots, ({ one, many }) => ({
  shiftPeriod: one(shiftPeriods, {
    fields: [shiftSlots.shiftPeriodId],
    references: [shiftPeriods.id],
  }),
  availabilities: many(availabilities),
  shiftAssignments: many(shiftAssignments),
}));

export const availabilitySubmissionsRelations = relations(
  availabilitySubmissions,
  ({ one, many }) => ({
    employee: one(employees, {
      fields: [availabilitySubmissions.employeeId],
      references: [employees.id],
    }),
    shiftPeriod: one(shiftPeriods, {
      fields: [availabilitySubmissions.shiftPeriodId],
      references: [shiftPeriods.id],
    }),
    availabilities: many(availabilities),
  }),
);

export const availabilitiesRelations = relations(availabilities, ({ one }) => ({
  availabilitySubmission: one(availabilitySubmissions, {
    fields: [availabilities.availabilitySubmissionId],
    references: [availabilitySubmissions.id],
  }),
  shiftSlot: one(shiftSlots, {
    fields: [availabilities.shiftSlotId],
    references: [shiftSlots.id],
  }),
}));

export const employeeAccessTokensRelations = relations(
  employeeAccessTokens,
  ({ one }) => ({
    employee: one(employees, {
      fields: [employeeAccessTokens.employeeId],
      references: [employees.id],
    }),
    shiftPeriod: one(shiftPeriods, {
      fields: [employeeAccessTokens.shiftPeriodId],
      references: [shiftPeriods.id],
    }),
  }),
);

export const employeePositionSkillsRelations = relations(
  employeePositionSkills,
  ({ one }) => ({
    employee: one(employees, {
      fields: [employeePositionSkills.employeeId],
      references: [employees.id],
    }),
  }),
);

export const shiftAssignmentsRelations = relations(shiftAssignments, ({ one }) => ({
  shiftSlot: one(shiftSlots, {
    fields: [shiftAssignments.shiftSlotId],
    references: [shiftSlots.id],
  }),
  employee: one(employees, {
    fields: [shiftAssignments.employeeId],
    references: [employees.id],
  }),
  assignedByAdmin: one(admins, {
    fields: [shiftAssignments.assignedByAdminId],
    references: [admins.id],
  }),
}));
