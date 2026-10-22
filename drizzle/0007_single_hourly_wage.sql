ALTER TABLE "employees" RENAME COLUMN "weekday_hourly_wage" TO "hourly_wage";--> statement-breakpoint
ALTER TABLE "employees" DROP CONSTRAINT "employees_weekday_hourly_wage_nonnegative";--> statement-breakpoint
ALTER TABLE "employees" DROP CONSTRAINT "employees_holiday_hourly_wage_nonnegative";--> statement-breakpoint
ALTER TABLE "employees" DROP COLUMN "holiday_hourly_wage";--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_hourly_wage_nonnegative" CHECK ("employees"."hourly_wage" >= 0);