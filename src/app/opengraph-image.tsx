import { ImageResponse } from "next/og";

// Branded 1200×630 share card. Next serves this at /opengraph-image and wires it
// into the page's OpenGraph + Twitter metadata automatically (the file
// convention), so any seshn.in link pasted into WhatsApp / Discord / Twitter /
// iMessage shows this instead of a bare URL.
export const alt = "Seshn — Your focus, made social.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const HEADLINE_TEXT = "Seshn Your focus, made social.";
const SUB_TEXT =
  "Track your Pomodoro sessions. Post your daily focus time. See what your friends are grinding.";

// next/og's built-in font ignores fontWeight, which left the headline looking
// thin. Pull the real faces from Google Fonts — Syne (the brand's display face)
// for the headline + wordmark, DM Sans for the body line — scoped to just the
// glyphs we render via &text= so each download stays tiny. The css2 endpoint
// returns a truetype URL to a UA-less fetch, which is what satori needs.
async function loadGoogleFont(
  family: string,
  weight: number,
  text: string,
): Promise<ArrayBuffer> {
  const api = `https://fonts.googleapis.com/css2?family=${family.replace(
    / /g,
    "+",
  )}:wght@${weight}&text=${encodeURIComponent(text)}`;
  const css = await (await fetch(api)).text();
  const url = css.match(
    /src: url\((.+?)\) format\('(opentype|truetype)'\)/,
  )?.[1];
  if (!url) throw new Error(`Could not resolve ${family} ${weight} font`);
  return (await fetch(url)).arrayBuffer();
}

export default async function OpengraphImage() {
  // Fall back to the built-in font if the font fetch fails at build time so a
  // network hiccup can never break the production build — worst case the card
  // renders in the default weight rather than failing the route.
  let fonts: NonNullable<ConstructorParameters<typeof ImageResponse>[1]>["fonts"];
  try {
    const [syne, dmSans] = await Promise.all([
      loadGoogleFont("Syne", 800, HEADLINE_TEXT),
      loadGoogleFont("DM Sans", 500, SUB_TEXT),
    ]);
    fonts = [
      { name: "Syne", data: syne, weight: 800, style: "normal" },
      { name: "DM Sans", data: dmSans, weight: 500, style: "normal" },
    ];
  } catch {
    fonts = undefined;
  }

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
          <div
            style={{
              fontFamily: "Syne",
              fontSize: "40px",
              fontWeight: 800,
              color: "#FFFFFF",
            }}
          >
            Seshn
          </div>
        </div>

        {/* Headline */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontFamily: "Syne",
              fontSize: "88px",
              fontWeight: 800,
              color: "#FFFFFF",
              lineHeight: 1.02,
              letterSpacing: "-0.03em",
            }}
          >
            Your focus,
          </div>
          <div
            style={{
              display: "flex",
              fontFamily: "Syne",
              fontSize: "88px",
              fontWeight: 800,
              color: "#22C55E",
              lineHeight: 1.02,
              letterSpacing: "-0.03em",
            }}
          >
            made social.
          </div>
          <div
            style={{
              fontFamily: "DM Sans",
              marginTop: "28px",
              fontSize: "30px",
              fontWeight: 500,
              color: "#888888",
              maxWidth: "760px",
              lineHeight: 1.4,
            }}
          >
            {SUB_TEXT}
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
