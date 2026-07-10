# Pickleball League App — Product Plan

_Last updated: 2026-07-09_

## 1. Vision

A mobile-friendly web app that lets a pickleball organization run skill-based leagues end to end: admins create leagues and teams, players join teams, captains manage rosters and schedule matches, and everyone sees live standings computed from recorded scores.

## 2. Users & Roles

| Role | Who | Key powers |
|---|---|---|
| **Admin** | League organizers | Create/manage leagues and teams, assign captains, correct scores, resolve disputes, manage seasons |
| **Captain** | One per team | Manage roster (approve join requests), schedule matches, record/confirm scores, promote a co-captain |
| **Co-captain** | One per team | Same operational powers as captain (schedule, scores, roster) except transferring captaincy |
| **Player** | Anyone with an account | Create profile, browse leagues/teams, request to join teams (multiple allowed), view schedule and standings |

A single account can hold different roles in different contexts (e.g., captain of one team, regular player on another, admin of the org).

## 3. Core Concepts & Data Model

```
Organization (implicit for v1 — single org)
└── League (name, skill level e.g. 3.0/3.5/4.0, season dates, status: draft|active|completed)
    └── Team (name, captain, co-captain, roster cap)
        └── TeamMembership (player ↔ team, status: pending|active|removed, role: captain|co-captain|player)
    └── Match (home team, away team, scheduled datetime, location,
               status: scheduled|completed|confirmed|disputed|cancelled)
        └── MatchScore (per-game scores e.g. best of 3, entered_by, confirmed_by)
User (auth account + player profile: name, skill rating, contact prefs)
```

Key rules:
- A league belongs to exactly one skill level; a team belongs to exactly one league.
- A player may belong to **multiple teams**, including across leagues; joining is **request → captain approval** (invite links also supported).
- Every team has exactly one captain; co-captain optional. Captain assigned by admin at team creation or promoted later.
- Matches are between two teams in the same league.

## 4. Score Recording & Trust Model

1. After a match, either team's captain/co-captain records the score (per-game, e.g., 11-7, 9-11, 11-4).
2. The opposing captain gets a notification to **confirm** or **dispute**.
3. Confirmed scores lock and feed standings. Auto-confirm after 72h with no response.
4. Disputes go to an admin, who can edit and finalize any score at any time.

## 5. Standings

Per league, computed from confirmed matches:
- Primary sort: match wins. Tiebreakers: head-to-head → game win % → point differential.
- Standings table shows W-L, games won/lost, point diff, streak.
- Recompute on score confirmation (cheap at league scale — no caching complexity needed for v1).

## 6. MVP Feature Scope (v1)

### Auth & Profiles
- Email-based sign up / sign in (magic link or password).
- Player profile: name, self-reported skill level, phone (optional, visible to teammates only).

### Admin
- Admin dashboard: create/edit leagues (name, level, season start/end).
- Create teams within a league; assign captain by email (works pre-signup — claimed on account creation).
- Override powers: edit any roster, match, or score; resolve disputes.

### Teams & Rosters
- Public league/team directory with rosters.
- "Request to join" flow + captain approve/decline; shareable invite link that pre-approves.
- Captain can promote co-captain, remove players.

### Scheduling
- Captains propose a match vs. another team in their league (datetime + location).
- Opposing captain accepts or proposes a new time (simple counter-offer, not full negotiation threads).
- Team schedule view + personal "my matches" view across all of a player's teams.

### Scores & Standings
- Score entry (per-game), confirm/dispute flow, auto-confirm at 72h.
- Live standings page per league.

### Notifications (v1: email only)
- Join request received/approved, match proposed/accepted, score awaiting confirmation, score disputed.

## 7. Explicitly Out of Scope for v1 (v2 candidates)

- Playoffs / bracket generation
- Admin-generated round-robin schedules (v1 is captain self-scheduling per your spec)
- Payments / registration fees
- Individual player stats & performance ratings (DUPR-style)
- Native mobile app & push notifications (web is mobile-first; SMS/push later)
- Multi-organization support (v1 assumes one org)
- Free-agent pool / "looking for team" matching
- Court booking integrations

## 8. Key Screens

1. **Home / League directory** — active leagues by level, standings preview
2. **League page** — standings, teams, recent results, upcoming matches
3. **Team page** — roster, schedule, results, join button
4. **My dashboard** — my teams, my upcoming matches, pending actions (confirmations, join requests)
5. **Match page** — details, score entry/confirmation
6. **Admin console** — leagues, teams, disputes, score overrides

## 9. Tech Stack (locked in during Phase 1)

- **Next.js (App Router) + TypeScript** — one codebase for UI + API, mobile-responsive
- **Postgres + Drizzle ORM** — embedded-postgres locally (no system install), Neon (Vercel Marketplace) in production via `DATABASE_URL`
- **Auth:** Better Auth (email + password, DB-backed sessions — no third-party service or API keys)
- **UI:** Tailwind + shadcn/ui
- **Email:** Resend for transactional notifications (Phase 6)
- **Hosting:** Vercel

Rationale: smallest stack that covers auth, relational data (roles/rosters/matches are very relational), and email — all first-class on Vercel with near-zero ops.

## 10. Build Phases

| Phase | Deliverable | Rough size |
|---|---|---|
| **1. Foundation** ✅ | Project setup, auth, DB schema, player profiles | Done (2026-07-09) |
| **2. Admin core** ✅ | League + team CRUD, captain assignment | Done (2026-07-09) |
| **3. Rosters** ✅ | Join requests, approvals, invite links, co-captains | Done (2026-07-09) |
| **4. Scheduling** ✅ | Match proposal/acceptance, schedule views | Done (2026-07-09) |
| **5. Scores + standings** ✅ | Entry, confirm/dispute, auto-confirm job, standings | Done (2026-07-09) |
| **6. Polish** ✅ | Email notifications, admin overrides, empty states, mobile QA | Done (2026-07-09) |

Each phase ships something usable; after Phase 2 an admin can already set up a real season's structure.

## 11. Open Questions (fine to defer)

- Season rollover: archive leagues and carry teams forward, or fresh teams each season?
- Roster caps: fixed per league, per team, or uncapped?
- Match format default: best of 3 games to 11? Configurable per league?
- Should players see contact info of opposing captains for scheduling coordination?
