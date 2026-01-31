import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import doQueue from "@opennextjs/cloudflare/overrides/queue/do-queue";
import d1NextTagCache from "@opennextjs/cloudflare/overrides/tag-cache/d1-next-tag-cache";

export default defineCloudflareConfig({
  // R2 for ISR/SSG data cache (binding: NEXT_INC_CACHE_R2_BUCKET)
  incrementalCache: r2IncrementalCache,
  // Durable Objects queue for time-based revalidation (binding: NEXT_CACHE_DO_QUEUE)
  queue: doQueue,
  // D1 for cache tags - revalidateTag/revalidatePath (binding: NEXT_TAG_CACHE_D1)
  tagCache: d1NextTagCache,
});
