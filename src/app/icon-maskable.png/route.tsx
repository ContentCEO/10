import { ImageResponse } from "next/og";

export const runtime = "edge";

// Maskable icon — safe zone inside 80% of frame so OSes can crop to circle/squircle.
export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #06b6d4 100%)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ color: "white", fontSize: 180, fontWeight: 800, letterSpacing: -8 }}>
          CF
        </div>
      </div>
    ),
    { width: 512, height: 512 },
  );
}
