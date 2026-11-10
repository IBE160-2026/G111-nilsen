ALTER TABLE `recipes` ADD `notes` text;--> statement-breakpoint
ALTER TABLE `recipes` ADD `last_cooked_at` text;--> statement-breakpoint
ALTER TABLE `recipes` ADD `cooked_count` integer DEFAULT 0 NOT NULL;