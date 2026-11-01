-- Baseline schema for a new Pollinator database.
-- Existing installations are marked as baselined by scripts/migrate.mjs and
-- do not execute this file again.

CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  title text NOT NULL,
  current_question_id uuid,
  state text NOT NULL DEFAULT 'lobby' CHECK (state IN ('lobby', 'active', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  prompt text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]',
  position int NOT NULL DEFAULT 0,
  is_open boolean NOT NULL DEFAULT false,
  duration_seconds int DEFAULT NULL,
  opened_at timestamptz DEFAULT NULL,
  type text NOT NULL DEFAULT 'dilemma',
  media_url text,
  media_type text,
  scale_max integer DEFAULT 10
);

CREATE TABLE IF NOT EXISTS responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  option_index int NOT NULL,
  participant_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (question_id, participant_key)
);

ALTER TABLE sessions
  ADD CONSTRAINT fk_current_question
  FOREIGN KEY (current_question_id) REFERENCES questions(id)
  ON DELETE SET NULL
  NOT VALID;

CREATE TABLE IF NOT EXISTS word_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  word text NOT NULL,
  participant_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (question_id, participant_key, word)
);

CREATE TABLE IF NOT EXISTS text_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  answer text NOT NULL,
  participant_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (question_id, participant_key)
);

CREATE TABLE IF NOT EXISTS ranking_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  ranking jsonb NOT NULL,
  participant_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (question_id, participant_key)
);
