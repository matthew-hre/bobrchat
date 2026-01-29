import { ImageResponse } from "next/og";

export const runtime = "nodejs";

export const alt = "BobrChat - Fast, Minimal AI Chat Interface";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

const colors = {
  background: "#0b0d12",
  foreground: "#ecebe4",
  muted: "#2d333d",
  mutedForeground: "#81807a",
  primary: "#6cbd2e",
};

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

export default async function Image() {
  const title = "BobrChat";
  const tagline = "Fast, minimal AI chat interface with support for multiple models";
  const domain = "bobrchat.com";

  const allText = `${title}${tagline}${domain}`;

  let fontData: ArrayBuffer;
  try {
    fontData = await loadGoogleFont("Rethink+Sans", allText);
  }
  catch {
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
            <div
              style={{
                fontSize: 72,
                fontWeight: 700,
                color: colors.foreground,
                lineHeight: 1.2,
                marginBottom: 24,
                display: "flex",
              }}
            >
              {title}
            </div>
            <div
              style={{
                fontSize: 32,
                color: colors.mutedForeground,
                lineHeight: 1.5,
                marginBottom: 24,
                display: "flex",
                flexWrap: "wrap",
              }}
            >
              {tagline}
            </div>
          </div>
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
              {domain}
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
            padding: "122px 56px 120px 56px",
            flex: 1,
            justifyContent: "flex-start",
            maxWidth: "85%",
          }}
        >
          {/* Title */}
          <div
            style={{
              fontSize: 72,
              fontWeight: 700,
              color: colors.foreground,
              lineHeight: 1.2,
              marginBottom: 24,
              display: "flex",
            }}
          >
            {title}
          </div>

          {/* Tagline */}
          <div
            style={{
              fontSize: 32,
              color: colors.mutedForeground,
              lineHeight: 1.5,
              marginBottom: 24,
              display: "flex",
              flexWrap: "wrap",
            }}
          >
            {tagline}
          </div>

          {/* Feature badges */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              marginTop: 16,
            }}
          >
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
            {domain}
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
