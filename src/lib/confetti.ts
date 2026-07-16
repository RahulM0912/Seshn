// One-shot confetti burst (Step 17) — hand-rolled canvas, no dependency. Used
// for the goal-hit moment on the timer card. Fire-and-forget: creates its own
// full-screen canvas, animates ~1.4s, removes itself. Respects
// prefers-reduced-motion (no-op) and never throws.

const COLORS = ["#22C55E", "#4ADE80", "#86EFAC", "#16A34A", "#FFFFFF"];
const PARTICLES = 70;
const DURATION_MS = 1400;
const GRAVITY = 0.16;
const DRAG = 0.99;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  spin: number;
}

export function burstConfetti(origin?: { x: number; y: number }): void {
  if (typeof document === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const canvas = document.createElement("canvas");
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.cssText =
    "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:60";
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(dpr, dpr);
  document.body.appendChild(canvas);

  const cx = origin?.x ?? window.innerWidth / 2;
  const cy = origin?.y ?? window.innerHeight / 3;

  const particles: Particle[] = Array.from({ length: PARTICLES }, () => {
    // Mostly-upward fan; gravity brings them back down through the frame.
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.9;
    const speed = 6 + Math.random() * 8;
    return {
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 3 + Math.random() * 4,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rotation: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.3,
    };
  });

  const startedAt = performance.now();
  function frame(now: number) {
    if (!ctx) return;
    const elapsed = now - startedAt;
    if (elapsed >= DURATION_MS) {
      canvas.remove();
      return;
    }
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    const fade = 1 - elapsed / DURATION_MS;
    for (const p of particles) {
      p.vx *= DRAG;
      p.vy = p.vy * DRAG + GRAVITY;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.spin;
      ctx.save();
      ctx.globalAlpha = Math.max(0, fade);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
