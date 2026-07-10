# PB League

Pickleball league management — leagues by skill level, teams with captains, match scheduling, score recording, and standings. See [PRODUCT_PLAN.md](./PRODUCT_PLAN.md) for the full product plan.

## Stack

- **Next.js (App Router) + TypeScript**, Tailwind CSS + shadcn/ui
- **Postgres + Drizzle ORM** — locally via [embedded-postgres](https://www.npmjs.com/package/embedded-postgres) (real Postgres binaries in `node_modules`, data in `.pgdata/`, no system install needed); in production set `DATABASE_URL` to a hosted Postgres (e.g. Neon)
- **Better Auth** — email + password, sessions stored in the database

## Getting started

```bash
npm install
npm run db:push     # create/update database tables (starts embedded Postgres if needed)
npm run dev         # starts embedded Postgres + Next.js dev server together
```

`npm run dev` prints the port (3000, or the next free one). Environment lives in `.env.local` — see `.env.example`.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start embedded Postgres + Next dev server |
| `npm run db:start` | Start only the local Postgres (e.g. alongside `npm run build`) |
| `npm run db:push` | Apply the Drizzle schema in `src/db/schema.ts` to the database |
| `npm run db:studio` | Browse the database in Drizzle Studio |
| `npm run make-admin -- <email>` | Promote a signed-up user to league admin |

## Project layout

```
src/
  app/              # routes: /, /sign-in, /sign-up, /dashboard, /profile,
                    #   /leagues, /teams/[id], /join/[token],
                    #   /admin (+ /admin/leagues/[id]), /api/auth/*
  app/admin/        # admin console pages + server actions (actions.ts)
  app/teams/        # team server actions (roster: join/approve/remove/invite)
  components/       # admin/ + teams/ forms, ui/ = shadcn
  db/               # schema, queries (reads), mutations (writes), client
  lib/              # Better Auth config, auth guard, team-perms, constants
scripts/            # dev orchestration, db server, make-admin
```

## Testing

End-to-end tests use Playwright and drive a real headless browser through the
core flows (`e2e/`):

```bash
npm run test:e2e        # run headless
npm run test:e2e:ui     # interactive Playwright UI
```

Playwright starts its own dev server on port 3100 (reusing the local Postgres),
runs the specs serially against a shared DB, and a global teardown removes
anything it created (leagues named `E2E …`, users `e2e-…`). It relies on the
local admin account (`test@example.com` / `password123`). Coverage (`e2e/`):

- **auth** — sign up, sign out, sign in
- **league-flow** — admin golden path: create league → teams → propose → accept → enter score → confirm → standings
- **counter** — a proposal is countered, then accepted
- **dispute** — score dispute → admin resolves via the console → standings update
- **invite** — a player joins through an invite link
- **join** — request to join → captain approval
- **roster** — promote to co-captain → demote → remove

Note: while running these tests serially, close the port-3002 dev server first
(both are `next dev` on the same `.next`).

## Deployment (Vercel + Neon)

1. **Import the repo** into Vercel (New Project → pick `pbleague`). The first
   build will fail until the env vars below exist — that's expected.
2. **Add a Neon Postgres** database (Vercel dashboard → Storage → Create →
   Neon, or the Marketplace). Connecting it sets `DATABASE_URL` automatically.
3. **Set env vars** (Project → Settings → Environment Variables):
   - `BETTER_AUTH_SECRET` — a 32-byte random string (`openssl rand -base64 32`)
   - `BETTER_AUTH_URL` — your deployed URL, e.g. `https://pbleague.vercel.app`
   - `APP_URL` — same URL (used for links in emails)
   - Optional: `RESEND_API_KEY` + `EMAIL_FROM` (real emails), `CRON_SECRET`
4. **Redeploy** (Deployments → ⋯ → Redeploy).
5. **Create the schema** on Neon — from your machine, using Neon's **direct**
   (unpooled) connection string:
   ```bash
   DATABASE_URL='<neon-direct-url>' npm run db:push
   ```
6. **Make yourself an admin** — sign up on the live site, then:
   ```bash
   DATABASE_URL='<neon-direct-url>' npm run make-admin -- you@example.com
   ```

The daily score auto-confirm cron (`vercel.json`) runs automatically once deployed.

## Build status

- ✅ Phase 1 — foundation: auth (sign-up/sign-in/sign-out), player profiles, full DB schema, route protection, admin role
- ✅ Phase 2 — admin console: league CRUD (name/level/season/status), team CRUD, captain-by-email assignment with claim-on-signup
- ✅ Phase 3 — rosters: public league/team directory, join requests + captain approval, invite links (auto-join), remove/promote co-captain, roster caps, "My teams" dashboard
- ✅ Phase 4 — scheduling: captains propose matches vs teams in their league, opponents accept / counter-propose / cancel, team schedule + "My matches" dashboard
- ✅ Phase 5 — scores + standings: per-game score entry, opponent confirm/dispute, 72h auto-confirm (opportunistic + `/api/cron/auto-confirm`), admin resolve, live per-league standings (`/leagues/[id]`) with wins/head-to-head/game-%/point-diff tiebreakers and streaks
- ✅ Phase 6 — notifications + polish: email notifications for the 6 key events (Resend in prod, console fallback in dev), admin disputes panel, daily auto-confirm cron (`vercel.json`)

**All six phases are complete.** Configure `RESEND_API_KEY` + `EMAIL_FROM` to turn on real emails; without them, notifications are logged to the server console.
