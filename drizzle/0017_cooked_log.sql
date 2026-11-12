CREATE TABLE `cooked_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`recipe_id` integer NOT NULL,
	`cooked_at` text NOT NULL,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `cooked_log_recipe_idx` ON `cooked_log` (`recipe_id`);--> statement-breakpoint
CREATE INDEX `cooked_log_at_idx` ON `cooked_log` (`cooked_at`);--> statement-breakpoint
INSERT INTO `cooked_log` (`recipe_id`, `cooked_at`) SELECT `id`, `last_cooked_at` FROM `recipes` WHERE `last_cooked_at` IS NOT NULL;
