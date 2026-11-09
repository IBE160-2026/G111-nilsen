-- Datamigrasjon (Story 3.1): manuelle oppskrifter (uten kilde-lenke) legges i samlingen.
UPDATE recipes SET saved_at = created_at WHERE saved_at IS NULL AND source_url IS NULL;
