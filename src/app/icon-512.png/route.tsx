import { ImageResponse } from "next/og";

export const runtime = "edge";
export const contentType = "image/png";

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
          borderRadius: 110,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ color: "white", fontSize: 240, fontWeight: 800, letterSpacing: -10 }}>
          CF
        </div>
      </div>
    ),
    { width: 512, height: 512 },
  );
}
