CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Bejelentkezés
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  display_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_token_idx ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);

-- Importált szövegek. A mondatok nincsenek külön eltárolva: olvasáskor bontjuk őket.
CREATE TABLE IF NOT EXISTS texts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  source_language text NOT NULL CHECK (source_language IN ('en','de')),
  original_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS texts_user_created_idx ON texts(user_id, created_at DESC);

-- Csak a ténylegesen elmentett szavak.
CREATE TABLE IF NOT EXISTS user_words (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_language text NOT NULL CHECK (source_language IN ('en','de')),
  word_normalized text NOT NULL,
  display_word text NOT NULL,
  hungarian_meaning text NOT NULL,
  source_text_id uuid REFERENCES texts(id) ON DELETE SET NULL,
  example_sentence text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, source_language, word_normalized)
);
CREATE INDEX IF NOT EXISTS user_words_user_created_idx ON user_words(user_id, created_at DESC);

-- Chrome helyi fordítójával elkészített fordítások cache-e.
CREATE TABLE IF NOT EXISTS translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_language text NOT NULL CHECK (source_language IN ('en','de')),
  translation_type text NOT NULL CHECK (translation_type IN ('word','sentence')),
  source_text text NOT NULL,
  context_text text,
  translated_text text NOT NULL,
  cache_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, cache_key)
);
CREATE INDEX IF NOT EXISTS translations_user_cache_idx ON translations(user_id, cache_key);
