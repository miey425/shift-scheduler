CREATE TABLE "employee_position_skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"role_label" varchar(120) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "employee_position_skills" ADD CONSTRAINT "employee_position_skills_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "employee_position_skills_employee_role_unique" ON "employee_position_skills" USING btree ("employee_id","role_label");--> statement-breakpoint
CREATE INDEX "employee_position_skills_employee_idx" ON "employee_position_skills" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "employee_position_skills_role_label_idx" ON "employee_position_skills" USING btree ("role_label");--> statement-breakpoint
INSERT INTO "employee_position_skills" ("employee_id", "role_label")
SELECT "employees"."id", "position_options"."role_label"
FROM "employees"
CROSS JOIN (
	VALUES
		('ホールA'),
		('ホールB'),
		('肉'),
		('寿司'),
		('サラダ'),
		('スープ'),
		('ホールラスト'),
		('D洗い場')
) AS "position_options"("role_label")
ON CONFLICT DO NOTHING;
