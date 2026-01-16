import { ImageResponse } from "next/og";

import { getMessagesByThreadId, getThreadById } from "~/features/chat/queries";
import { getShareByShareId } from "~/features/chat/sharing-queries";

export const runtime = "nodejs";
export const alt = "BobrChat shared conversation";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Props = {
  params: Promise<{ shareId: string }>;
};

// Dark theme colors from globals.css (oklch converted to hex approximations)
const colors = {
  background: "#0b0d12", // oklch(0.16 0.01 260)
  foreground: "#ecebe4", // oklch(0.94 0.01 100)
  muted: "#2d333d", // oklch(0.32 0.02 260)
  mutedForeground: "#81807a", // oklch(0.6 0.01 100)
  primary: "#6cbd2e", // oklch(0.72 0.19 135) - green
};

function extractTextContent(content: unknown): string {
  if (typeof content === "string")
    return content;
  if (!content || typeof content !== "object")
    return "";

  const msg = content as { parts?: unknown[]; content?: unknown };
  if (Array.isArray(msg.parts)) {
    for (const part of msg.parts) {
      if (part && typeof part === "object") {
        const p = part as { type?: string; text?: string };
        if (p.type === "text" && p.text)
          return p.text;
      }
    }
  }
  if (typeof msg.content === "string")
    return msg.content;
  return "";
}

async function loadGoogleFont(font: string, text: string): Promise<ArrayBuffer> {
  const url = `https://fonts.googleapis.com/css2?family=${font}:wght@400;700&text=${encodeURIComponent(text)}`;
  const css = await (await fetch(url)).text();
  const resource = css.match(/src: url\((.+)\) format\('(opentype|truetype)'\)/);

  if (resource) {
    const response = await fetch(resource[1]);
    if (response.status === 200) {
      return await response.arrayBuffer();
    }
  }

  throw new Error("Failed to load font data");
}

export default async function Image({ params }: Props) {
  const { shareId } = await params;

  const share = await getShareByShareId(shareId);
  if (!share) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.background,
            color: colors.foreground,
            fontSize: 48,
            fontFamily: "Rethink Sans, sans-serif",
          }}
        >
          Thread Unavailable
        </div>
      ),
      { ...size },
    );
  }

  const [thread, messages] = await Promise.all([
    getThreadById(share.threadId),
    getMessagesByThreadId(share.threadId),
  ]);

  if (!thread) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.background,
            color: colors.foreground,
            fontSize: 48,
            fontFamily: "Rethink Sans, sans-serif",
          }}
        >
          Thread Unavailable
        </div>
      ),
      { ...size },
    );
  }

  const firstUserMessage = messages.find(m => m.role === "user");
  const userMessageText = firstUserMessage
    ? extractTextContent(firstUserMessage)
    : "";
  const truncatedMessage = userMessageText.length > 200
    ? `${userMessageText.slice(0, 197)}...`
    : userMessageText;

  const firstAssistantMessage = messages.find(m => m.role === "assistant");
  const assistantMetadata = firstAssistantMessage?.metadata as { model?: string } | undefined;
  const modelId = assistantMetadata?.model || thread.model || "Unknown model";
  const modelName = modelId.includes("/")
    ? modelId.split("/").pop() || modelId
    : modelId;

  // Combine all text for font loading
  const allText = `${thread.title}${truncatedMessage}${modelName}bobrchat.comThread Unavailable`;

  let fontData: ArrayBuffer;
  try {
    fontData = await loadGoogleFont("Rethink+Sans", allText);
  }
  catch {
    // Fallback to system font if Google Font fails
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            backgroundColor: colors.background,
            position: "relative",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          {/* Topographic contour lines */}
          {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
            <div
              key={i}
              style={{
                position: "absolute",
                bottom: -180 + i * 42,
                left: -100,
                right: -100,
                height: 380,
                borderRadius: "50%",
                border: `${i === 2 ? 2 : 1}px solid ${i === 2 ? colors.primary : colors.foreground}${i === 2 ? "50" : i < 4 ? "18" : "10"}`,
                display: "flex",
              }}
            />
          ))}
          {/* Secondary contour cluster offset right */}
          {[0, 1, 2, 3, 4, 5].map(i => (
            <div
              key={`r${i}`}
              style={{
                position: "absolute",
                bottom: -260 + i * 48,
                left: 350,
                width: 950,
                height: 480,
                borderRadius: "50%",
                border: `${i === 3 ? 2 : 1}px solid ${i === 3 ? colors.primary : colors.foreground}${i === 3 ? "40" : i < 3 ? "15" : "08"}`,
                display: "flex",
              }}
            />
          ))}
          {/* Content */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              padding: "72px 56px 120px 56px",
              flex: 1,
              justifyContent: "flex-start",
              maxWidth: "85%",
            }}
          >
            <div
              style={{
                fontSize: 56,
                fontWeight: 700,
                color: colors.foreground,
                lineHeight: 1.2,
                marginBottom: 24,
                display: "flex",
                flexWrap: "wrap",
                overflow: "hidden",
                maxHeight: 140,
              }}
            >
              {thread.title}
            </div>
            {truncatedMessage && (
              <div
                style={{
                  fontSize: 24,
                  color: colors.mutedForeground,
                  lineHeight: 1.5,
                  marginBottom: 24,
                  display: "flex",
                  flexWrap: "wrap",
                  overflow: "hidden",
                  maxHeight: 112,
                }}
              >
                {truncatedMessage}
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16 }}>
              <div style={{ fontSize: 20, color: colors.primary, display: "flex" }}>
                {modelName}
              </div>
            </div>
          </div>

          {/* Footer branding */}
          <div
            style={{
              position: "absolute",
              bottom: 56,
              left: 56,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div style={{ fontSize: 18, color: colors.mutedForeground, display: "flex" }}>
              bobrchat.com
            </div>
          </div>
        </div>
      ),
      { ...size },
    );
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: colors.background,
          position: "relative",
          fontFamily: "Rethink Sans, sans-serif",
        }}
      >
        {/* Topographic contour lines */}
        {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
          <div
            key={i}
            style={{
              position: "absolute",
              bottom: -180 + i * 42,
              left: -100,
              right: -100,
              height: 380,
              borderRadius: "50%",
              border: `${i === 2 ? 2 : 1}px solid ${i === 2 ? colors.muted : colors.foreground}${i === 2 ? "50" : i < 4 ? "18" : "10"}`,
              display: "flex",
            }}
          />
        ))}
        {/* Secondary contour cluster offset right */}
        {[0, 1, 2, 3, 4, 5].map(i => (
          <div
            key={`r${i}`}
            style={{
              position: "absolute",
              bottom: -260 + i * 48,
              left: 350,
              width: 950,
              height: 480,
              borderRadius: "50%",
              border: `${i === 3 ? 2 : 1}px solid ${i === 3 ? colors.primary : colors.foreground}${i === 3 ? "40" : i < 3 ? "15" : "08"}`,
              display: "flex",
            }}
          />
        ))}

        {/* Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            padding: "122px 56px 120px 56px",
            flex: 1,
            justifyContent: "flex-start",
            maxWidth: "85%",
          }}
        >
          {/* Title */}
          <div
            style={{
              fontSize: 56,
              fontWeight: 700,
              color: colors.foreground,
              lineHeight: 1.2,
              marginBottom: 24,
              display: "flex",
              flexWrap: "wrap",
              overflow: "hidden",
              maxHeight: 140,
            }}
          >
            {thread.title}
          </div>

          {/* User message */}
          {truncatedMessage && (
            <div
              style={{
                fontSize: 24,
                color: colors.mutedForeground,
                lineHeight: 1.5,
                marginBottom: 24,
                display: "flex",
                flexWrap: "wrap",
                overflow: "hidden",
                maxHeight: 112,
              }}
            >
              {truncatedMessage}
            </div>
          )}

          {/* Model badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 16,
            }}
          >
            <div
              style={{
                fontSize: 20,
                color: colors.primary,
                display: "flex",
              }}
            >
              {modelName}
            </div>
          </div>
        </div>

        {/* Footer branding */}
        <div
          style={{
            position: "absolute",
            bottom: 56,
            left: 56,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              fontSize: 18,
              color: colors.mutedForeground,
              display: "flex",
            }}
          >
            bobrchat.com
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "Rethink Sans",
          data: fontData,
          style: "normal",
        },
      ],
    },
  );
}
