import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Shared OG card for the whole site. Kept flat and quiet: mark top-left,
// name bottom-left, nothing else.
export const alt = "Bikash Sahu";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BG = "#F7F7F7";
const INK = "#36393B";
const MUTED = "#8C8F91";

// Read once at module scope - these never depend on the request.
const [mono, mark] = await Promise.all([
  readFile(join(process.cwd(), "app/fonts/geist-mono-400.woff")),
  readFile(join(process.cwd(), "public/petals-mark.svg"), "base64"),
]);
const markSrc = `data:image/svg+xml;base64,${mark}`;

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: BG,
          fontFamily: "Geist Mono",
        }}
      >
        {/* hairline frame, inset from the edge */}
        <div
          style={{
            position: "absolute",
            top: 14,
            left: 14,
            right: 14,
            bottom: 14,
            display: "flex",
            border: "1px solid #E6E6E6",
            borderRadius: 24,
          }}
        />

        <img src={markSrc} width={48} height={48} style={{ position: "absolute", top: 88, left: 92 }} />

        {/* one clear action: say hi */}
        <div
          style={{
            position: "absolute",
            right: 92,
            top: 100,
            display: "flex",
            fontSize: 24,
            lineHeight: 1,
            letterSpacing: 1,
            color: MUTED,
          }}
        >
          open to work · bikash13763@gmail.com
        </div>

        <div
          style={{
            position: "absolute",
            left: 92,
            bottom: 88,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ display: "flex", fontSize: 54, lineHeight: 1.15, letterSpacing: 2, color: INK }}>
            bikash sahu
          </div>
          <div style={{ display: "flex", marginTop: 10, fontSize: 40, lineHeight: 1.15, letterSpacing: 2, color: MUTED }}>
            design engineer
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Geist Mono", data: mono, style: "normal", weight: 400 }],
    },
  );
}
