-- Add OG preview columns to thread_shares for Cloudflare Worker access
-- These are populated at share time with unencrypted preview data

ALTER TABLE thread_shares ADD COLUMN og_title TEXT;
ALTER TABLE thread_shares ADD COLUMN og_model TEXT;
ALTER TABLE thread_shares ADD COLUMN og_first_message TEXT;
