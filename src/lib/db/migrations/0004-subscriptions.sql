-- Create subscription tier enum
CREATE TYPE subscription_tier AS ENUM ('free', 'beta', 'plus', 'pro');

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  tier subscription_tier NOT NULL DEFAULT 'free',
  polar_customer_id TEXT,
  polar_subscription_id TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX subscriptions_userId_idx ON subscriptions(user_id);
CREATE INDEX subscriptions_polarCustomerId_idx ON subscriptions(polar_customer_id);

-- Create user storage configs table (for BYOS - Pro tier)
CREATE TABLE IF NOT EXISTS user_storage_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('r2', 's3')),
  bucket TEXT NOT NULL,
  region TEXT,
  endpoint TEXT,
  access_key_id TEXT NOT NULL,
  secret_access_key TEXT NOT NULL,
  public_url TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX user_storage_configs_userId_idx ON user_storage_configs(user_id);

-- Backfill: Create subscription records for existing users (as beta users)
INSERT INTO subscriptions (user_id, tier)
SELECT id, 'beta'::subscription_tier
FROM users
ON CONFLICT (user_id) DO NOTHING;
