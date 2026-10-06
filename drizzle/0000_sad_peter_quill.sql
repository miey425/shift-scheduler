CREATE TYPE "public"."admin_role" AS ENUM('owner', 'manager', 'editor', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."assignment_status" AS ENUM('assigned', 'confirmed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."availability_status" AS ENUM('available', 'unavailable', 'preferred');--> statement-breakpoint
CREATE TYPE "public"."availability_submission_status" AS ENUM('draft', 'submitted');--> statement-breakpoint
CREATE TYPE "public"."employment_type" AS ENUM('full_time', 'part_time', 'contract', 'temporary');--> statement-breakpoint
CREATE TYPE "public"."shift_period_status" AS ENUM('draft', 'open', 'closed', 'published');--> statement-breakpoint
CREATE TABLE "admins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"role" "admin_role" DEFAULT 'manager' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "availabilities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"availability_submission_id" uuid NOT NULL,
	"shift_slot_id" uuid NOT NULL,
	"status" "availability_status" DEFAULT 'unavailable' NOT NULL,
	"memo" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "availability_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"shift_period_id" uuid NOT NULL,
	"status" "availability_submission_status" DEFAULT 'draft' NOT NULL,
	"submitted_at" timestamp with time zone,
	"memo" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_access_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"shift_period_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_accessed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"display_name" varchar(120) NOT NULL,
	"employment_type" "employment_type" DEFAULT 'part_time' NOT NULL,
	"max_hours_per_day" numeric(4, 2) DEFAULT '8.00' NOT NULL,
	"max_hours_per_week" numeric(5, 2) DEFAULT '40.00' NOT NULL,
	"min_days_per_period" integer DEFAULT 0 NOT NULL,
	"max_days_per_period" integer DEFAULT 5 NOT NULL,
	"can_open" boolean DEFAULT false NOT NULL,
	"can_close" boolean DEFAULT false NOT NULL,
	"is_high_school_student" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"memo" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shift_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shift_slot_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"assigned_by_admin_id" uuid,
	"status" "assignment_status" DEFAULT 'assigned' NOT NULL,
	"memo" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shift_periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"submission_deadline" timestamp with time zone,
	"status" "shift_period_status" DEFAULT 'draft' NOT NULL,
	"memo" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shift_slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shift_period_id" uuid NOT NULL,
	"work_date" date NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"required_employees" integer DEFAULT 1 NOT NULL,
	"role_label" varchar(120),
	"memo" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "availabilities" ADD CONSTRAINT "availabilities_availability_submission_id_availability_submissions_id_fk" FOREIGN KEY ("availability_submission_id") REFERENCES "public"."availability_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availabilities" ADD CONSTRAINT "availabilities_shift_slot_id_shift_slots_id_fk" FOREIGN KEY ("shift_slot_id") REFERENCES "public"."shift_slots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_submissions" ADD CONSTRAINT "availability_submissions_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_submissions" ADD CONSTRAINT "availability_submissions_shift_period_id_shift_periods_id_fk" FOREIGN KEY ("shift_period_id") REFERENCES "public"."shift_periods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_access_tokens" ADD CONSTRAINT "employee_access_tokens_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_access_tokens" ADD CONSTRAINT "employee_access_tokens_shift_period_id_shift_periods_id_fk" FOREIGN KEY ("shift_period_id") REFERENCES "public"."shift_periods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_assignments" ADD CONSTRAINT "shift_assignments_shift_slot_id_shift_slots_id_fk" FOREIGN KEY ("shift_slot_id") REFERENCES "public"."shift_slots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_assignments" ADD CONSTRAINT "shift_assignments_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_assignments" ADD CONSTRAINT "shift_assignments_assigned_by_admin_id_admins_id_fk" FOREIGN KEY ("assigned_by_admin_id") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_slots" ADD CONSTRAINT "shift_slots_shift_period_id_shift_periods_id_fk" FOREIGN KEY ("shift_period_id") REFERENCES "public"."shift_periods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "admins_email_unique" ON "admins" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "availabilities_submission_slot_unique" ON "availabilities" USING btree ("availability_submission_id","shift_slot_id");--> statement-breakpoint
CREATE INDEX "availabilities_shift_slot_idx" ON "availabilities" USING btree ("shift_slot_id");--> statement-breakpoint
CREATE UNIQUE INDEX "availability_submissions_employee_period_unique" ON "availability_submissions" USING btree ("employee_id","shift_period_id");--> statement-breakpoint
CREATE INDEX "availability_submissions_period_idx" ON "availability_submissions" USING btree ("shift_period_id");--> statement-breakpoint
CREATE UNIQUE INDEX "employee_access_tokens_token_hash_unique" ON "employee_access_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "employee_access_tokens_employee_period_unique" ON "employee_access_tokens" USING btree ("employee_id","shift_period_id");--> statement-breakpoint
CREATE INDEX "employee_access_tokens_active_expires_idx" ON "employee_access_tokens" USING btree ("is_active","expires_at");--> statement-breakpoint
CREATE INDEX "employees_is_active_idx" ON "employees" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "employees_display_name_idx" ON "employees" USING btree ("display_name");--> statement-breakpoint
CREATE UNIQUE INDEX "shift_assignments_slot_employee_unique" ON "shift_assignments" USING btree ("shift_slot_id","employee_id");--> statement-breakpoint
CREATE INDEX "shift_assignments_employee_idx" ON "shift_assignments" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "shift_periods_start_date_idx" ON "shift_periods" USING btree ("start_date");--> statement-breakpoint
CREATE INDEX "shift_periods_status_idx" ON "shift_periods" USING btree ("status");--> statement-breakpoint
CREATE INDEX "shift_slots_period_date_idx" ON "shift_slots" USING btree ("shift_period_id","work_date");