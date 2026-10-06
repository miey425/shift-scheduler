UPDATE "shift_slots"
SET "role_label" = 'ホールラスト', "updated_at" = now()
WHERE "role_label" = 'ホールDB';--> statement-breakpoint
UPDATE "employee_position_skills"
SET "role_label" = 'ホールラスト', "updated_at" = now()
WHERE "role_label" = 'ホールDB';--> statement-breakpoint
DELETE FROM "employee_position_skills"
WHERE "role_label" IN (
	'ホールDA',
	'キッチンDA',
	'キッチンDB',
	'キッチンDC'
);
