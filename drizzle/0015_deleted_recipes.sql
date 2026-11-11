CREATE TABLE `deleted_recipes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`title` text NOT NULL,
	`deleted_at` text NOT NULL,
	`snapshot` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `deleted_recipes_user_idx` ON `deleted_recipes` (`user_id`,`deleted_at`);