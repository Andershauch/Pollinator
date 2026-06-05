-- Workshop session
CREATE TABLE IF NOT EXISTS sessions (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code                 text UNIQUE NOT NULL,
  title                text NOT NULL,
  current_question_id  uuid,
  state                text NOT NULL DEFAULT 'lobby'
                         CHECK (state IN ('lobby', 'active', 'closed')),
  created_at           timestamptz NOT NULL DEFAULT now()
);

-- Dilemma question belonging to a session
CREATE TABLE IF NOT EXISTS questions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  prompt      text NOT NULL,
  options     jsonb NOT NULL DEFAULT '[]',
  position    int  NOT NULL DEFAULT 0,
  is_open     boolean NOT NULL DEFAULT false
);

-- Participant response (one per participant per question)
CREATE TABLE IF NOT EXISTS responses (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id      uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  option_index     int  NOT NULL,
  participant_key  text NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (question_id, participant_key)
);

-- Forward reference: sessions.current_question_id → questions.id
ALTER TABLE sessions
  ADD CONSTRAINT fk_current_question
  FOREIGN KEY (current_question_id) REFERENCES questions(id)
  ON DELETE SET NULL
  NOT VALID;
