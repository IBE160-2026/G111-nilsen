CREATE TABLE `recipe_translations` (
	`recipe_id` integer PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`ingredients` text NOT NULL,
	`steps` text NOT NULL,
	`sections` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE cascade
);
