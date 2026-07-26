CREATE EXTENSION IF NOT EXISTS pgcrypto;

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
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS user_settings (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  selected_pair text NOT NULL DEFAULT 'en-hu' CHECK (selected_pair IN ('en-hu','de-hu')),
  en_voice_uri text,
  de_voice_uri text,
  speech_rate numeric(3,2) NOT NULL DEFAULT 1.0,
  speech_pitch numeric(3,2) NOT NULL DEFAULT 1.0,
  auto_word_audio boolean NOT NULL DEFAULT true,
  auto_sentence_audio boolean NOT NULL DEFAULT true,
  show_translation boolean NOT NULL DEFAULT true,
  font_size integer NOT NULL DEFAULT 20,
  line_height numeric(3,2) NOT NULL DEFAULT 1.8,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS texts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  source_language text NOT NULL CHECK (source_language IN ('en','de')),
  target_language text NOT NULL DEFAULT 'hu' CHECK (target_language = 'hu'),
  original_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS texts_user_id_created_at_idx ON texts(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS sentences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text_id uuid NOT NULL REFERENCES texts(id) ON DELETE CASCADE,
  position integer NOT NULL,
  source_text text NOT NULL,
  translated_text text,
  UNIQUE(text_id, position)
);
CREATE INDEX IF NOT EXISTS sentences_text_id_position_idx ON sentences(text_id, position);

CREATE TABLE IF NOT EXISTS translation_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_language text NOT NULL CHECK (source_language IN ('en','de')),
  target_language text NOT NULL DEFAULT 'hu',
  source_text text NOT NULL,
  context_text text,
  translated_text text NOT NULL,
  translation_type text NOT NULL CHECK (translation_type IN ('word','sentence')),
  cache_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, cache_key)
);
CREATE INDEX IF NOT EXISTS translation_cache_user_key_idx ON translation_cache(user_id, cache_key);

CREATE TABLE IF NOT EXISTS user_words (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_language text NOT NULL CHECK (source_language IN ('en','de')),
  word_normalized text NOT NULL,
  display_word text NOT NULL,
  hungarian_meaning text NOT NULL,
  source_text_id uuid REFERENCES texts(id) ON DELETE SET NULL,
  source_sentence_id uuid REFERENCES sentences(id) ON DELETE SET NULL,
  example_sentence text,
  example_translation text,
  status text NOT NULL DEFAULT 'learning' CHECK (status IN ('learning','known')),
  ease_factor numeric(4,2) NOT NULL DEFAULT 2.50,
  interval_days integer NOT NULL DEFAULT 0,
  repetitions integer NOT NULL DEFAULT 0,
  next_review_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, source_language, word_normalized)
);
CREATE INDEX IF NOT EXISTS user_words_due_idx ON user_words(user_id, status, next_review_at);

CREATE TABLE IF NOT EXISTS review_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_word_id uuid NOT NULL REFERENCES user_words(id) ON DELETE CASCADE,
  exercise_type text NOT NULL,
  was_correct boolean NOT NULL,
  answer text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS review_events_user_created_idx ON review_events(user_id, created_at DESC);
