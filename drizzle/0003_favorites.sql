-- Story 3.4: favoritter. drizzle-kit skriver `DEFAULT false`; `DEFAULT 0` er det samme i SQLite (boolean-modus lagrer 0 og 1) og virker også i eldre SQLite-verktøy.
ALTER TABLE `recipes` ADD `is_favorite` integer DEFAULT 0 NOT NULL;
