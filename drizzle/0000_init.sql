CREATE TABLE `ingredient_lines` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`recipe_id` integer NOT NULL,
	`position` integer NOT NULL,
	`section` text,
	`original_text` text NOT NULL,
	`quantity_min` real,
	`quantity_max` real,
	`unit` text,
	`name` text NOT NULL,
	`parseable` integer NOT NULL,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ingredient_lines_recipe_idx` ON `ingredient_lines` (`recipe_id`,`position`);--> statement-breakpoint
CREATE TABLE `recipes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`source_url` text,
	`source_name` text,
	`original_servings` integer,
	`selected_servings` integer,
	`saved_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `steps` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`recipe_id` integer NOT NULL,
	`position` integer NOT NULL,
	`section` text,
	`text` text NOT NULL,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `steps_recipe_idx` ON `steps` (`recipe_id`,`position`);