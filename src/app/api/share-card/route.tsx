import { ImageResponse } from "next/og";
import { getViewer } from "@/lib/viewer";
import {
  getDaySummary,
  getProfileById,
  getSessionById,
  getStreak,
} from "@/lib/queries";
import { dayInTimeZone, formatFocusLong, isStreakAlive } from "@/lib/format";

// User-triggered story card (1080×1920), generated on demand for the Share
// buttons. Three modes, all rendering ONLY the authenticated viewer's own data —
// the viewer id comes from the session, never a query param — so a card can't be
// scraped for anyone else and no signed token is needed:
//   • no params         → today's focus recap
//   • ?date=YYYY-MM-DD   → a past day's recap (validated, never future)
//   • ?session=<uuid>    → a single session (ownership re-checked: 403 otherwise)
// Always dynamic (reads cookies) and never cached.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Pull real font faces from Google Fonts so the wordmark/headline render in the
// brand display face (Syne) rather than next/og's built-in fallback — same
// approach as app/opengraph-image.tsx. The card's text is dynamic, so we subset
// each face to exactly the glyphs we render (passed via &text=); the css2
// endpoint then returns a truetype URL that satori can parse.
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

// A base glyph set so any dynamic text (numbers, units, subjects, captions,
// @handle) is covered even when subsetting — extras are deduped by the endpoint.
const BASE_GLYPHS =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .,'·@-—…“”\"";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Everything one card draws — both the day recap and the single-session card map
// onto this, so the layout below is written once.
interface CardConfig {
  /** Small uppercase eyebrow above the headline. */
  eyebrow: string;
  /** The big headline number, e.g. "2 hr 15 min". */
  focusStr: string;
  /** Human date line under the headline. */
  dateStr: string;
  /** Pills under the date — subjects (day) or the one subject (session). */
  chips: string[];
  /** A session's caption, rendered as a quote (null on day cards / no caption). */
  caption: string | null;
  /** The bottom stat row. */
  stats: { value: string; label: string }[];
  username: string;
}

function truncate(text: string, max: number): string {
  const t = text.trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

// A weekday + month + day label, rendered in the given timezone.
function formatDate(date: Date, timeZone: string): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone,
  });
}

// Square (1080×1080) "box" card: a framed inner panel on the dark canvas with a
// tight three-band rhythm (wordmark → hero → stats/footer), so there's no dead
// vertical space. A square reads well pasted into a story, a feed post, or chat.
function CardImage(cfg: CardConfig) {
  // Scale the hero number down for long durations so it never overflows the box.
  const heroSize = cfg.focusStr.length > 9 ? 104 : 132;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "linear-gradient(150deg, #161616 0%, #0B0B0B 70%)",
        padding: "92px 84px",
        position: "relative",
        // PNG corners outside this radius stay transparent (next/og's canvas is
        // transparent), so the card reads as a rounded box on any background.
        borderRadius: "56px",
        overflow: "hidden",
      }}
    >
      {/* Green glow, top-right — echoes the landing hero / OG card. */}
      <div
        style={{
          position: "absolute",
          top: "-260px",
          right: "-200px",
          width: "640px",
          height: "640px",
          borderRadius: "9999px",
          background: "#22C55E",
          opacity: 0.14,
          filter: "blur(150px)",
        }}
      />

        {/* Band 1 — wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
          <div
            style={{
              width: "26px",
              height: "26px",
              borderRadius: "9999px",
              background: "#22C55E",
            }}
          />
          <div
            style={{
              fontFamily: "Syne",
              fontSize: "46px",
              fontWeight: 800,
              color: "#FFFFFF",
            }}
          >
            Seshn
          </div>
        </div>

        {/* Band 2 — hero */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontFamily: "DM Sans",
              fontSize: "30px",
              fontWeight: 700,
              letterSpacing: "0.2em",
              color: "#22C55E",
              textTransform: "uppercase",
            }}
          >
            {cfg.eyebrow}
          </div>
          <div
            style={{
              display: "flex",
              fontFamily: "Syne",
              fontSize: `${heroSize}px`,
              fontWeight: 800,
              color: "#FFFFFF",
              lineHeight: 1.0,
              letterSpacing: "-0.03em",
              marginTop: "16px",
            }}
          >
            {cfg.focusStr}
          </div>
          <div
            style={{
              fontFamily: "DM Sans",
              fontSize: "30px",
              fontWeight: 500,
              color: "#888888",
              marginTop: "18px",
            }}
          >
            {cfg.dateStr}
          </div>

          {/* Caption quote (single-session card). */}
          {cfg.caption && (
            <div
              style={{
                display: "flex",
                fontFamily: "DM Sans",
                fontSize: "34px",
                fontWeight: 500,
                color: "#CFCFCF",
                lineHeight: 1.38,
                marginTop: "30px",
                maxWidth: "820px",
              }}
            >
              {`“${cfg.caption}”`}
            </div>
          )}

          {/* Subject chips */}
          {cfg.chips.length > 0 && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "14px",
                marginTop: "32px",
              }}
            >
              {cfg.chips.map((chip) => (
                <div
                  key={chip}
                  style={{
                    display: "flex",
                    fontFamily: "DM Sans",
                    fontSize: "28px",
                    fontWeight: 500,
                    color: "#22C55E",
                    backgroundColor: "#0F2A15",
                    border: "1px solid #1A4D22",
                    borderRadius: "9999px",
                    padding: "12px 26px",
                  }}
                >
                  {chip}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Band 3 — stats + footer */}
        <div style={{ display: "flex", flexDirection: "column", gap: "36px" }}>
          <div style={{ display: "flex", gap: "64px" }}>
            {cfg.stats.map((s) => (
              <div
                key={s.label}
                style={{ display: "flex", flexDirection: "column" }}
              >
                <div
                  style={{
                    fontFamily: "Syne",
                    fontSize: "60px",
                    fontWeight: 800,
                    color: "#FFFFFF",
                    lineHeight: 1.0,
                  }}
                >
                  {s.value}
                </div>
                <div
                  style={{
                    fontFamily: "DM Sans",
                    fontSize: "24px",
                    fontWeight: 500,
                    color: "#888888",
                    marginTop: "10px",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          {/* Footer — handle + domain */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderTop: "1px solid #222222",
              paddingTop: "32px",
            }}
          >
            <div
              style={{
                fontFamily: "DM Sans",
                fontSize: "30px",
                fontWeight: 700,
                color: "#FFFFFF",
              }}
            >
              {`@${cfg.username}`}
            </div>
            <div
              style={{
                fontFamily: "DM Sans",
                fontSize: "28px",
                fontWeight: 500,
                color: "#8A8A8A",
              }}
            >
              seshn.in
            </div>
          </div>
        </div>
      </div>
  );
}

export async function GET(req: Request) {
  const viewer = await getViewer();
  if (!viewer) {
    return new Response("Unauthorized", { status: 401 });
  }

  const profile = await getProfileById(viewer.id);
  if (!profile) {
    return new Response("Not found", { status: 404 });
  }

  const params = new URL(req.url).searchParams;
  const sessionId = params.get("session");
  const dateParam = params.get("date");

  let cfg: CardConfig;

  if (sessionId) {
    // Single-session card. RLS would already hide a session the viewer can't
    // see, but we additionally require ownership — you can only card your own.
    if (!UUID_RE.test(sessionId)) {
      return new Response("Bad session", { status: 400 });
    }
    const session = await getSessionById(sessionId);
    if (!session) {
      return new Response("Not found", { status: 404 });
    }
    if (session.user_id !== viewer.id) {
      return new Response("Forbidden", { status: 403 });
    }
    cfg = {
      eyebrow: "Focus session",
      focusStr: formatFocusLong(session.focus_minutes),
      dateStr: formatDate(new Date(session.ended_at), profile.timezone),
      chips: session.subject ? [session.subject] : [],
      caption: session.caption ? truncate(session.caption, 140) : null,
      stats: [
        { value: String(session.pomodoros_completed), label: "Pomodoros" },
      ],
      username: profile.username,
    };
  } else {
    // Day recap — `?date=` (validated, never future) or today.
    const today = dayInTimeZone(new Date(), profile.timezone);
    let day = today;
    if (dateParam) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam) || dateParam > today) {
        return new Response("Bad date", { status: 400 });
      }
      day = dateParam;
    }
    const isToday = day === today;
    const summary = await getDaySummary(viewer.id, profile.timezone, day);

    // Streak is a "current" number — only meaningful on today's card.
    let streakDisplay = 0;
    if (isToday) {
      const streak = await getStreak(viewer.id);
      streakDisplay =
        streak && isStreakAlive(streak.last_session_date, profile.timezone)
          ? streak.current_streak
          : 0;
    }

    const stats = [
      { value: String(summary.sessionCount), label: "Sessions" },
      { value: String(summary.pomodoros), label: "Pomodoros" },
    ];
    if (isToday) {
      stats.push({ value: String(streakDisplay), label: "Day streak" });
    }

    cfg = {
      eyebrow: isToday ? "Today's focus" : "Focus",
      focusStr: formatFocusLong(summary.focusMinutes),
      // Render the day at UTC noon so the label never shifts across the boundary.
      dateStr: formatDate(new Date(`${day}T12:00:00Z`), "UTC"),
      chips: summary.subjects.slice(0, 3),
      caption: null,
      stats,
      username: profile.username,
    };
  }

  // Subset each face to exactly what we draw (plus the base glyph set).
  const syneText =
    "Seshn" + cfg.focusStr + cfg.stats.map((s) => s.value).join("") + BASE_GLYPHS;
  const dmText =
    cfg.eyebrow +
    cfg.dateStr +
    `@${cfg.username}` +
    "seshn.in" +
    cfg.stats.map((s) => s.label).join("") +
    cfg.chips.join("") +
    (cfg.caption ?? "") +
    BASE_GLYPHS;

  let fonts: NonNullable<ConstructorParameters<typeof ImageResponse>[1]>["fonts"];
  try {
    const [syne, dmSans, dmSansBold] = await Promise.all([
      loadGoogleFont("Syne", 800, syneText),
      loadGoogleFont("DM Sans", 500, dmText),
      loadGoogleFont("DM Sans", 700, dmText),
    ]);
    fonts = [
      { name: "Syne", data: syne, weight: 800, style: "normal" },
      { name: "DM Sans", data: dmSans, weight: 500, style: "normal" },
      { name: "DM Sans", data: dmSansBold, weight: 700, style: "normal" },
    ];
  } catch {
    fonts = undefined;
  }

  return new ImageResponse(CardImage(cfg), {
    width: 1080,
    height: 1080,
    fonts,
    headers: { "Cache-Control": "no-store" },
  });
}
