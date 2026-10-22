ALTER TABLE "employees" ADD COLUMN "weekday_hourly_wage" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "holiday_hourly_wage" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_weekday_hourly_wage_nonnegative" CHECK ("employees"."weekday_hourly_wage" >= 0);--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_holiday_hourly_wage_nonnegative" CHECK ("employees"."holiday_hourly_wage" >= 0);
