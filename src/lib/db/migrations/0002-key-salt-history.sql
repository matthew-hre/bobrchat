-- Create table for salt history (per-version salts for safe key rotation)
CREATE TABLE IF NOT EXISTS key_salts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  salt TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, version)
);

-- Index for fast lookups by user and version
CREATE INDEX key_salts_user_version_idx ON key_salts(user_id, version);

-- Add rotation lock flag to encryption_keys
ALTER TABLE encryption_keys ADD COLUMN rotation_in_progress BOOLEAN DEFAULT FALSE;

-- Migrate existing salts to the history table
INSERT INTO key_salts (user_id, version, salt, created_at)
SELECT user_id, key_version, key_salt, created_at
FROM encryption_keys
ON CONFLICT (user_id, version) DO NOTHING;
