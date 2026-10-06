CREATE TABLE "business_day_overrides" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "shift_period_id" uuid NOT NULL REFERENCES "shift_periods"("id") ON DELETE cascade,
  "work_date" date NOT NULL,
  "is_closed" boolean NOT NULL,
  "closing_time" time,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "business_day_overrides_state_check" CHECK (("is_closed" AND "closing_time" IS NULL) OR (NOT "is_closed" AND "closing_time" IS NOT NULL))
);
CREATE UNIQUE INDEX "business_day_overrides_period_date_unique" ON "business_day_overrides" ("shift_period_id", "work_date");
