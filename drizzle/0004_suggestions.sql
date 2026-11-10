CREATE TABLE `suggestions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`recipe_id` integer NOT NULL,
	`text` text NOT NULL,
	`reason` text NOT NULL,
	`applies_to` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `suggestions_recipe_text_unique` ON `suggestions` (`recipe_id`,`text`);