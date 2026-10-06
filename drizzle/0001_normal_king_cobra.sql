ALTER TABLE "shift_slots" ADD COLUMN "preset_group" varchar(80);--> statement-breakpoint
ALTER TABLE "shift_slots" ADD COLUMN "requires_open" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "shift_slots" ADD COLUMN "requires_close" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "shift_slots" ADD COLUMN "is_backup" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "shift_slots" ADD COLUMN "break_start_time" time;--> statement-breakpoint
ALTER TABLE "shift_slots" ADD COLUMN "break_end_time" time;