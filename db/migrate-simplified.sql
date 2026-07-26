BEGIN;

-- A régi, felesleges táblák eltávolítása.
DROP TABLE IF EXISTS review_events CASCADE;
DROP TABLE IF EXISTS user_settings CASCADE;
DROP TABLE IF EXISTS sentences CASCADE;

-- Szövegek egyszerűsítése.
ALTER TABLE texts DROP COLUMN IF EXISTS target_language;
ALTER TABLE texts DROP COLUMN IF EXISTS updated_at;

-- Szavak egyszerűsítése.
ALTER TABLE user_words DROP COLUMN IF EXISTS source_sentence_id;
ALTER TABLE user_words DROP COLUMN IF EXISTS example_translation;
ALTER TABLE user_words DROP COLUMN IF EXISTS status;
ALTER TABLE user_words DROP COLUMN IF EXISTS ease_factor;
ALTER TABLE user_words DROP COLUMN IF EXISTS interval_days;
ALTER TABLE user_words DROP COLUMN IF EXISTS repetitions;
ALTER TABLE user_words DROP COLUMN IF EXISTS next_review_at;
ALTER TABLE user_words DROP COLUMN IF EXISTS updated_at;

-- Régi fordítási cache átnevezése és egyszerűsítése.
DO $$
BEGIN
  IF to_regclass('public.translation_cache') IS NOT NULL
     AND to_regclass('public.translations') IS NULL THEN
    ALTER TABLE translation_cache RENAME TO translations;
  END IF;
END $$;

ALTER TABLE IF EXISTS translations DROP COLUMN IF EXISTS target_language;

COMMIT;
