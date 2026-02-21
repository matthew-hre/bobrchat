CREATE TYPE "subscription_tier" AS ENUM('free', 'beta', 'plus');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"id" text PRIMARY KEY,
	"key" text NOT NULL,
	"count" integer NOT NULL,
	"last_request" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL UNIQUE,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "two_factors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"secret" text,
	"backup_codes" text
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" text NOT NULL,
	"email" text NOT NULL UNIQUE,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"two_factor_enabled" boolean,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"message_id" uuid,
	"filename" text NOT NULL,
	"media_type" text NOT NULL,
	"size" bigint NOT NULL,
	"storage_path" text NOT NULL,
	"page_count" integer,
	"key_version" integer,
	"is_encrypted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message_metadata" (
	"message_id" uuid PRIMARY KEY,
	"model" text,
	"input_tokens" integer,
	"output_tokens" integer,
	"cost_total_usd" text,
	"cost_breakdown" jsonb,
	"tokens_per_second" text,
	"time_to_first_token_ms" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"thread_id" uuid NOT NULL,
	"role" text NOT NULL,
	"content" jsonb,
	"iv" text,
	"ciphertext" text,
	"auth_tag" text,
	"key_version" integer,
	"reasoning_level" text,
	"search_enabled" boolean,
	"model_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"title" text DEFAULT 'New Chat' NOT NULL,
	"model" text,
	"icon" text DEFAULT 'message-circle',
	"parent_thread_id" uuid,
	"last_message_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"archived_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "key_salts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"salt" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "key_salts_user_version_unique" UNIQUE("user_id","version")
);
--> statement-breakpoint
CREATE TABLE "encryption_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL UNIQUE,
	"key_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"rotated_at" timestamp,
	"key_salt" text NOT NULL,
	"rotation_in_progress" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "models" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"model_id" text NOT NULL UNIQUE,
	"canonical_slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"provider" text NOT NULL,
	"context_length" integer,
	"created" integer NOT NULL,
	"pricing_prompt" real,
	"pricing_completion" real,
	"pricing_image" real,
	"pricing_request" real,
	"input_modalities" text[] DEFAULT '{}'::text[] NOT NULL,
	"output_modalities" text[] DEFAULT '{}'::text[] NOT NULL,
	"supported_parameters" text[] DEFAULT '{}'::text[] NOT NULL,
	"raw_data" jsonb NOT NULL,
	"last_synced_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "models_sync_status" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"last_synced_at" timestamp DEFAULT now() NOT NULL,
	"model_count" integer DEFAULT 0 NOT NULL,
	"sync_duration_ms" integer,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL UNIQUE,
	"settings" jsonb DEFAULT '{"theme":"dark","accentColor":"green","defaultThreadName":"New Chat","defaultThreadIcon":"message-circle","landingPageContent":"suggestions","sendMessageKeyboardShortcut":"enter","autoThreadNaming":false,"autoThreadIcon":false,"showSidebarIcons":false,"useOcrForPdfs":false,"autoCreateFilesFromPaste":true,"inputHeightScale":0,"hideModelProviderNames":false,"profileCardWidget":"apiKeyStatus"}' NOT NULL,
	"encrypted_api_keys" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "thread_shares" (
	"id" text PRIMARY KEY,
	"thread_id" uuid NOT NULL UNIQUE,
	"show_attachments" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"revoked_at" timestamp,
	"og_title" text,
	"og_model" text,
	"og_first_message" text
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL UNIQUE,
	"tier" "subscription_tier" DEFAULT 'free'::"subscription_tier" NOT NULL,
	"is_lifetime_beta" boolean DEFAULT false NOT NULL,
	"polar_customer_id" text,
	"polar_subscription_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_storage_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL UNIQUE,
	"provider" text NOT NULL,
	"bucket" text NOT NULL,
	"region" text,
	"endpoint" text,
	"access_key_id" text NOT NULL,
	"secret_access_key" text NOT NULL,
	"public_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "accounts_userId_idx" ON "accounts" ("user_id");--> statement-breakpoint
CREATE INDEX "rate_limits_key_idx" ON "rate_limits" ("key");--> statement-breakpoint
CREATE INDEX "sessions_userId_idx" ON "sessions" ("user_id");--> statement-breakpoint
CREATE INDEX "two_factors_userId_idx" ON "two_factors" ("user_id");--> statement-breakpoint
CREATE INDEX "verifications_identifier_idx" ON "verifications" ("identifier");--> statement-breakpoint
CREATE INDEX "attachments_userId_idx" ON "attachments" ("user_id");--> statement-breakpoint
CREATE INDEX "attachments_messageId_idx" ON "attachments" ("message_id");--> statement-breakpoint
CREATE INDEX "attachments_userId_storagePath_idx" ON "attachments" ("user_id","storage_path");--> statement-breakpoint
CREATE INDEX "messages_threadId_idx" ON "messages" ("thread_id");--> statement-breakpoint
CREATE INDEX "threads_userId_idx" ON "threads" ("user_id");--> statement-breakpoint
CREATE INDEX "threads_userId_lastMessageAt_idx" ON "threads" ("user_id","last_message_at");--> statement-breakpoint
CREATE INDEX "key_salts_user_version_idx" ON "key_salts" ("user_id","version");--> statement-breakpoint
CREATE INDEX "encryption_keys_userId_idx" ON "encryption_keys" ("user_id");--> statement-breakpoint
CREATE INDEX "models_provider_idx" ON "models" ("provider");--> statement-breakpoint
CREATE INDEX "models_name_idx" ON "models" ("name");--> statement-breakpoint
CREATE INDEX "models_context_length_idx" ON "models" ("context_length");--> statement-breakpoint
CREATE INDEX "models_pricing_prompt_idx" ON "models" ("pricing_prompt");--> statement-breakpoint
CREATE INDEX "user_settings_userId_idx" ON "user_settings" ("user_id");--> statement-breakpoint
CREATE INDEX "thread_shares_threadId_idx" ON "thread_shares" ("thread_id");--> statement-breakpoint
CREATE INDEX "subscriptions_userId_idx" ON "subscriptions" ("user_id");--> statement-breakpoint
CREATE INDEX "subscriptions_polarCustomerId_idx" ON "subscriptions" ("polar_customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "subscriptions_polar_customer_id_unique" ON "subscriptions" ("polar_customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "subscriptions_polar_subscription_id_unique" ON "subscriptions" ("polar_subscription_id");--> statement-breakpoint
CREATE INDEX "user_storage_configs_userId_idx" ON "user_storage_configs" ("user_id");--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "two_factors" ADD CONSTRAINT "two_factors_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_message_id_messages_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "message_metadata" ADD CONSTRAINT "message_metadata_message_id_messages_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_thread_id_threads_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "threads"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "threads" ADD CONSTRAINT "threads_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "key_salts" ADD CONSTRAINT "key_salts_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "encryption_keys" ADD CONSTRAINT "encryption_keys_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "thread_shares" ADD CONSTRAINT "thread_shares_thread_id_threads_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "threads"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "user_storage_configs" ADD CONSTRAINT "user_storage_configs_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;