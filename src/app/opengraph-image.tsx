import { ImageResponse } from "next/og";

// Branded 1200×630 share card. Next serves this at /opengraph-image and wires it
// into the page's OpenGraph + Twitter metadata automatically (the file
// convention), so any seshn.in link pasted into WhatsApp / Discord / Twitter /
// iMessage shows this instead of a bare URL. It's code-generated (no binary
// asset to maintain) and uses system fonts so there's nothing to fetch at build.
export const alt = "Seshn — Your focus, made social.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#0A0A0A",
          padding: "80px",
          position: "relative",
        }}
      >
        {/* Green glow, top-left — echoes the landing hero. */}
        <div
          style={{
            position: "absolute",
            top: "-180px",
            left: "-120px",
            width: "600px",
            height: "600px",
            borderRadius: "9999px",
            background: "#22C55E",
            opacity: 0.18,
            filter: "blur(140px)",
          }}
        />

        {/* Wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "20px",
              height: "20px",
              borderRadius: "9999px",
              background: "#22C55E",
            }}
          />
          <div style={{ fontSize: "40px", fontWeight: 700, color: "#FFFFFF" }}>
            Seshn
          </div>
        </div>

        {/* Headline */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: "84px",
              fontWeight: 800,
              color: "#FFFFFF",
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
            }}
          >
            Your focus,
          </div>
          <div
            style={{
              display: "flex",
              fontSize: "84px",
              fontWeight: 800,
              color: "#22C55E",
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
            }}
          >
            made social.
          </div>
          <div
            style={{
              marginTop: "28px",
              fontSize: "30px",
              color: "#888888",
              maxWidth: "760px",
              lineHeight: 1.4,
            }}
          >
            Track your Pomodoro sessions. Post your daily focus time. See what
            your friends are grinding.
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
