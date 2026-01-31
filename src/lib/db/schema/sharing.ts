import { boolean, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { threads } from "./chat";

export const threadShares = pgTable(
  "thread_shares",
  {
    id: text("id").primaryKey(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => threads.id, { onDelete: "cascade" })
      .unique(),
    showAttachments: boolean("show_attachments").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    revokedAt: timestamp("revoked_at"),
    // OG preview data (populated at share time for Cloudflare Worker access)
    ogTitle: text("og_title"),
    ogModel: text("og_model"),
    ogFirstMessage: text("og_first_message"),
  },
  table => [index("thread_shares_threadId_idx").on(table.threadId)],
);
