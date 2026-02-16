CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id BIGINT NOT NULL,
  state TEXT NOT NULL,
  context JSONB DEFAULT '{}'::jsonb,
  last_updated TIMESTAMP DEFAULT NOW(),
  UNIQUE(chat_id)
);

ALTER TABLE "users" ADD FOREIGN KEY ("club_id") REFERENCES "clubs" ("id");