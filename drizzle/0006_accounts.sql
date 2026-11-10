CREATE TABLE `sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
DROP INDEX `folders_name_key_unique`;--> statement-breakpoint
ALTER TABLE `folders` ADD `user_id` integer REFERENCES users(id) ON DELETE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX `folders_user_name_key_unique` ON `folders` (`user_id`,`name_key`);--> statement-breakpoint
DROP INDEX `pantry_items_name_key_unique`;--> statement-breakpoint
ALTER TABLE `pantry_items` ADD `user_id` integer REFERENCES users(id) ON DELETE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX `pantry_items_user_name_key_unique` ON `pantry_items` (`user_id`,`name_key`);--> statement-breakpoint
ALTER TABLE `recipes` ADD `user_id` integer REFERENCES users(id) ON DELETE cascade;