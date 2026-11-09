-- Story 3.3: mapper. `folder_id` får ON DELETE SET NULL for hånd: drizzle-kit utelater det i ALTER TABLE ADD COLUMN.
CREATE TABLE `folders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`name_key` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `folders_name_key_unique` ON `folders` (`name_key`);--> statement-breakpoint
ALTER TABLE `recipes` ADD `folder_id` integer REFERENCES folders(id) ON DELETE SET NULL;