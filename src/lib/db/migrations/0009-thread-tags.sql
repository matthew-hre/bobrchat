CREATE TABLE IF NOT EXISTS "tags" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "color" text NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "tags_userId_idx" ON "tags"("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "tags_user_id_name_lower_uniq" ON "tags"("user_id", lower("name"));

CREATE TABLE IF NOT EXISTS "thread_tags" (
  "thread_id" uuid NOT NULL REFERENCES "threads"("id") ON DELETE CASCADE,
  "tag_id" uuid NOT NULL REFERENCES "tags"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "created_at" timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY ("thread_id", "tag_id")
);

CREATE INDEX IF NOT EXISTS "thread_tags_userId_threadId_idx" ON "thread_tags"("user_id", "thread_id");
CREATE INDEX IF NOT EXISTS "thread_tags_userId_tagId_idx" ON "thread_tags"("user_id", "tag_id");
