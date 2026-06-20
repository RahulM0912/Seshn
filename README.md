# Seshn

**Your focus, made social.** Track your Pomodoro sessions, post your daily focus time, and see what your friends are building — Strava, but for deep work.

> ✅ v1 is live — landing page + the main app (Google sign-in → Pomodoro timer → social feed).

## Stack

| Layer | Tech |
|-------|------|
| Framework | [Next.js](https://nextjs.org) 16 (App Router) + React 19 |
| Database / Auth | [Supabase](https://supabase.com) — Postgres + RLS, Google OAuth |
| Styling | Tailwind CSS v4 (CSS-first config) |
| Icons | [lucide-react](https://lucide.dev) |
| Hosting | Vercel |

## Getting started

### 1. Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project

### 2. Environment

Create `.env` in the project root (never commit it):

```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Both values are in **Supabase Dashboard → Settings → API**. The publishable key is safe for the browser — access is governed by Row Level Security.

### 3. Database

Apply the SQL migrations in `supabase/migrations/` (in filename order) via **Supabase Dashboard → SQL Editor**.

### 4. Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project structure

```
src/
  app/         # App Router — layout, landing page, routes, global styles
  components/  # React components (PascalCase, one per file)
  lib/         # Supabase clients (browser + server)
supabase/
  migrations/  # Timestamped SQL — apply via the Supabase SQL editor
```

## Scripts

| Command | What it does |
|---------|--------------|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |

---

© 2026 Seshn
