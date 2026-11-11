CREATE TABLE `recipe_labels` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`recipe_id` integer NOT NULL,
	`label` text NOT NULL,
	`label_key` text NOT NULL,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `recipe_labels_unique_idx` ON `recipe_labels` (`recipe_id`,`label_key`);