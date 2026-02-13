-- Add unique constraints on Polar IDs to prevent cross-account association
CREATE UNIQUE INDEX subscriptions_polar_customer_id_unique ON subscriptions(polar_customer_id) WHERE polar_customer_id IS NOT NULL;
CREATE UNIQUE INDEX subscriptions_polar_subscription_id_unique ON subscriptions(polar_subscription_id) WHERE polar_subscription_id IS NOT NULL;
