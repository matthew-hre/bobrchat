CREATE TABLE "utility_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"model" text NOT NULL,
	"input_tokens" integer,
	"output_tokens" integer,
	"cost_total_usd" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "message_metadata" ADD COLUMN "provider" text;--> statement-breakpoint
CREATE INDEX "utility_usage_userId_idx" ON "utility_usage" ("user_id");--> statement-breakpoint
CREATE INDEX "utility_usage_userId_createdAt_idx" ON "utility_usage" ("user_id","created_at");--> statement-breakpoint
ALTER TABLE "utility_usage" ADD CONSTRAINT "utility_usage_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;