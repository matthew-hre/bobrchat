-- Add lifetime beta flag to subscriptions
ALTER TABLE subscriptions ADD COLUMN is_lifetime_beta BOOLEAN NOT NULL DEFAULT false;

insert into subscriptions (user_id, tier, is_lifetime_beta)
select id, 'beta'::subscription_tier, true
from users
on conflict (user_id) do nothing;
