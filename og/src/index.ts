import type { NeonQueryFunction } from "@neondatabase/serverless";

import { cache, CustomFont, ImageResponse } from "@cf-wasm/og/workerd";
import { neon } from "@neondatabase/serverless";
import postgres from "postgres";

import fontData from "./fonts/RethinkSans.ttf";

type Env = {
  HYPERDRIVE?: Hyperdrive;
  DATABASE_URL?: string;
};

type SqlClient = {
  query: <T extends Record<string, unknown>>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ) => Promise<T[]>;
};

function getSqlClient(env: Env): SqlClient {
  // Local development: use postgres.js with direct connection
  if (env.DATABASE_URL?.includes("localhost")) {
    const sql = postgres(env.DATABASE_URL);
    return {
      query: async <T extends Record<string, unknown>>(
        strings: TemplateStringsArray,
        ...values: unknown[]
      ): Promise<T[]> => {
        // postgres.js requires tagged template literals; cast to any to bypass strict typing
        return await (sql as any)(strings, ...values);
      },
    };
  }

  // Production: use Neon serverless driver
  const connectionString = env.DATABASE_URL || env.HYPERDRIVE?.connectionString;
  if (!connectionString) {
    throw new Error("No database connection configured");
  }

  const neonSql: NeonQueryFunction<false, false> = neon(connectionString);
  return {
    query: async <T extends Record<string, unknown>>(
      strings: TemplateStringsArray,
      ...values: unknown[]
    ): Promise<T[]> => {
      return neonSql(strings, ...values) as unknown as Promise<T[]>;
    },
  };
}

const colors = {
  background: "#0b0d12",
  foreground: "#ecebe4",
  muted: "#2d333d",
  mutedForeground: "#81807a",
  primary: "#6cbd2e",
};

const SIZE = { width: 1200, height: 630 };

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Set execution context for @cf-wasm/og
    cache.setExecutionContext(ctx);

    // Route: /default - Main site OG image
    if (path === "/" || path === "/default") {
      return generateDefaultOG();
    }

    // Route: /share/:shareId - Dynamic share OG image
    const shareMatch = path.match(/^\/share\/([^/]+)$/);
    if (shareMatch) {
      const shareId = shareMatch[1];
      return generateShareOG(env, shareId);
    }

    return new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;

async function generateDefaultOG(): Promise<Response> {
  const title = "BobrChat";
  const tagline = "Fast, minimal AI chat interface with support for multiple models";
  const domain = "bobrchat.com";

  const font = new CustomFont("Rethink Sans", fontData as unknown as ArrayBuffer);

  return ImageResponse.async(
    {
      type: "div",
      props: {
        style: {
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: colors.background,
          position: "relative",
          fontFamily: "Rethink Sans, sans-serif",
        },
        children: [
          // Content
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                flexDirection: "column",
                padding: "122px 56px 120px 56px",
                flex: 1,
                justifyContent: "flex-start",
                maxWidth: "85%",
              },
              children: [
                // Title
                {
                  type: "div",
                  props: {
                    style: {
                      fontSize: 72,
                      fontWeight: 700,
                      color: colors.foreground,
                      lineHeight: 1.2,
                      marginBottom: 24,
                      display: "flex",
                    },
                    children: title,
                  },
                },
                // Tagline
                {
                  type: "div",
                  props: {
                    style: {
                      fontSize: 32,
                      color: colors.mutedForeground,
                      lineHeight: 1.5,
                      marginBottom: 24,
                      display: "flex",
                      flexWrap: "wrap",
                    },
                    children: tagline,
                  },
                },
              ],
            },
          },
          // Footer
          {
            type: "div",
            props: {
              style: {
                position: "absolute",
                bottom: 56,
                left: 56,
                display: "flex",
                alignItems: "center",
                gap: 12,
              },
              children: [
                {
                  type: "div",
                  props: {
                    style: {
                      fontSize: 18,
                      color: colors.mutedForeground,
                      display: "flex",
                    },
                    children: domain,
                  },
                },
              ],
            },
          },
        ],
      },
    },
    {
      ...SIZE,
      fonts: [font],
    },
  );
}

async function generateShareOG(env: Env, shareId: string): Promise<Response> {
  const sql = getSqlClient(env);

  // Get share with pre-computed OG preview data
  const shares = await sql.query`
    SELECT ts.id, ts.thread_id,
           COALESCE(ts.og_title, t.title) as title,
           ts.og_model,
           ts.og_first_message
    FROM thread_shares ts
    JOIN threads t ON t.id = ts.thread_id
    WHERE ts.id = ${shareId} AND ts.revoked_at IS NULL
    LIMIT 1
  `;

  if (shares.length === 0) {
    return generateUnavailableOG();
  }

  const share = shares[0];
  const title = (share.title as string) || "Shared Chat";
  const model = share.og_model as string | null;
  const truncatedMessage = (share.og_first_message as string) || "";

  const modelName = model?.includes("/") ? model.split("/").pop() || model : model || "AI Chat";

  const font = new CustomFont("Rethink Sans", fontData as unknown as ArrayBuffer);

  return ImageResponse.async(
    {
      type: "div",
      props: {
        style: {
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: colors.background,
          position: "relative",
          fontFamily: "Rethink Sans, sans-serif",
        },
        children: [
          // Content
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                flexDirection: "column",
                padding: "122px 56px 120px 56px",
                flex: 1,
                justifyContent: "flex-start",
                maxWidth: "85%",
              },
              children: [
                // Title
                {
                  type: "div",
                  props: {
                    style: {
                      fontSize: 56,
                      fontWeight: 700,
                      color: colors.foreground,
                      lineHeight: 1.2,
                      marginBottom: 24,
                      display: "flex",
                      flexWrap: "wrap",
                      overflow: "hidden",
                      maxHeight: 140,
                    },
                    children: title,
                  },
                },
                // User message
                ...(truncatedMessage
                  ? [
                      {
                        type: "div",
                        props: {
                          style: {
                            fontSize: 24,
                            color: colors.mutedForeground,
                            lineHeight: 1.5,
                            marginBottom: 24,
                            display: "flex",
                            flexWrap: "wrap",
                            overflow: "hidden",
                            maxHeight: 112,
                          },
                          children: truncatedMessage,
                        },
                      },
                    ]
                  : []),
                // Model badge
                {
                  type: "div",
                  props: {
                    style: {
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginTop: 16,
                    },
                    children: [
                      {
                        type: "div",
                        props: {
                          style: {
                            fontSize: 20,
                            color: colors.primary,
                            display: "flex",
                          },
                          children: modelName,
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
          // Footer
          {
            type: "div",
            props: {
              style: {
                position: "absolute",
                bottom: 56,
                left: 56,
                display: "flex",
                alignItems: "center",
                gap: 12,
              },
              children: [
                {
                  type: "div",
                  props: {
                    style: {
                      fontSize: 18,
                      color: colors.mutedForeground,
                      display: "flex",
                    },
                    children: "bobrchat.com",
                  },
                },
              ],
            },
          },
        ],
      },
    },
    {
      ...SIZE,
      fonts: [font],
    },
  );
}

function generateUnavailableOG(): Response {
  const font = new CustomFont("Rethink Sans", fontData as unknown as ArrayBuffer);

  return ImageResponse.async(
    {
      type: "div",
      props: {
        style: {
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.background,
          color: colors.foreground,
          fontSize: 48,
          fontFamily: "Rethink Sans, sans-serif",
        },
        children: "Thread Unavailable",
      },
    },
    {
      ...SIZE,
      fonts: [font],
    },
  ) as unknown as Response;
}
