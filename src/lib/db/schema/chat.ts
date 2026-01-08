import { bigint, index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { users } from "./auth";

export const threads = pgTable(
  "threads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("New Chat"),
    model: text("model"),
    lastMessageAt: timestamp("last_message_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  table => [index("threads_userId_idx").on(table.userId), index("threads_userId_lastMessageAt_idx").on(table.userId, table.lastMessageAt)],
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => threads.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["user", "assistant", "system"] }).notNull(),
    content: jsonb("content").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  table => [index("messages_threadId_idx").on(table.threadId)],
);

export const attachments = pgTable(
  "attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    messageId: uuid("message_id").references(() => messages.id, {
      onDelete: "set null",
    }),
    filename: text("filename").notNull(),
    mediaType: text("media_type").notNull(),
    size: bigint("size", { mode: "number" }).notNull(),
    storagePath: text("storage_path").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  table => [
    index("attachments_userId_idx").on(table.userId),
    index("attachments_messageId_idx").on(table.messageId),
  ],
);
