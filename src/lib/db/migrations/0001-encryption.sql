-- Create table for encryption keys
CREATE TABLE IF NOT EXISTS encryption_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  key_salt TEXT NOT NULL,
  key_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  rotated_at TIMESTAMP
);

-- Index the user id on encryption keys
CREATE INDEX encryption_keys_userId_idx ON encryption_keys(user_id);

-- Update messages table for new encryption schema (3 separate columns)
ALTER TABLE messages ADD COLUMN iv TEXT;
ALTER TABLE messages ADD COLUMN ciphertext TEXT;
ALTER TABLE messages ADD COLUMN auth_tag TEXT;
ALTER TABLE messages ADD COLUMN key_version INTEGER;
ALTER TABLE messages ALTER COLUMN content DROP NOT NULL;
