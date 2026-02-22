import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export const chatRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, "1m"),
  prefix: "ratelimit:chat",
});

export const uploadRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, "1m"),
  prefix: "ratelimit:upload",
});

export const apiRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, "1m"),
  prefix: "ratelimit:api",
});

export const deleteAttachmentsRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, "1m"),
  prefix: "ratelimit:delete-attachments",
});

export const rotateKeyRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "10m"),
  prefix: "ratelimit:rotate-key",
});

export function rateLimitResponse(reset: number) {
  const retryAfter = Math.ceil((reset - Date.now()) / 1000);
  return new Response(
    JSON.stringify({ error: "Rate limit exceeded. Please wait and try again." }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "X-Retry-After": String(retryAfter),
        "Retry-After": String(retryAfter),
      },
    },
  );
}
