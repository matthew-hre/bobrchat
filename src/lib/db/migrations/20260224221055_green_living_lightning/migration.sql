CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"color" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "thread_tags" (
	"thread_id" uuid,
	"tag_id" uuid,
	"user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "thread_tags_pkey" PRIMARY KEY("thread_id","tag_id")
);
--> statement-breakpoint
DROP TABLE "accounts";--> statement-breakpoint
DROP TABLE "rate_limits";--> statement-breakpoint
DROP TABLE "sessions";--> statement-breakpoint
DROP TABLE "two_factors";--> statement-breakpoint
DROP TABLE "verifications";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "workos_id" text;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "two_factor_enabled";--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_workos_id_key') THEN
    ALTER TABLE "users" ADD CONSTRAINT "users_workos_id_key" UNIQUE("workos_id");
  END IF;
END $$;--> statement-breakpoint
CREATE INDEX "tags_userId_idx" ON "tags" ("user_id");--> statement-breakpoint
CREATE INDEX "thread_tags_userId_threadId_idx" ON "thread_tags" ("user_id","thread_id");--> statement-breakpoint
CREATE INDEX "thread_tags_userId_tagId_idx" ON "thread_tags" ("user_id","tag_id");--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "thread_tags" ADD CONSTRAINT "thread_tags_thread_id_threads_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "threads"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "thread_tags" ADD CONSTRAINT "thread_tags_tag_id_tags_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "thread_tags" ADD CONSTRAINT "thread_tags_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;