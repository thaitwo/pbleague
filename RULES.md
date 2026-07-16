# Project Rules

Rules for Claude to check and follow **before and during every implementation**.
This file is imported into context via `CLAUDE.md`, so it is always active.

**How to use:** add or edit rules under the sections below. Keep each rule short
and imperative — one rule per line. Anything here overrides Claude's default
behavior. Delete rules that no longer apply.

---

## Pre-implementation checklist

Before writing any code, Claude must:

- [ ] Re-read this file and honor every rule below.
- [ ] Read the relevant guide in `node_modules/next/dist/docs/` before writing
      Next.js code — this Next.js has breaking changes vs. training data.
- [ ] Confirm whether the change touches `src/db/schema.ts` (needs a migration —
      see **Database & migrations**).
- [ ] State the plan briefly, then implement.

## Workflow & git

- Do **not** commit or push until I explicitly say **"ship it"**. Keep all
  changes local until then.
- When I say "ship it": run the build, then commit **and** push to `main`
  (pushing to `main` auto-deploys via Vercel).
- Keep commits scoped to the batch I approved; write a clear commit message.

## Verification (before reporting done)

- Run `npm run lint` and a build/typecheck (`npx tsc --noEmit` or `npm run build`).
- For any UI change, verify visually with a Playwright screenshot before saying
  it's done.
- Report outcomes honestly — if something failed or was skipped, say so.

## Database & migrations

- Any change to `src/db/schema.ts` requires a production migration
  (`npm run db:push:prod`) applied **before** pushing the code.
- Use the gitignored `.env.migrate` file for prod migrations so the Neon
  connection string never appears in chat or logs. Never use the `!` prefix in a
  way that echoes secrets.
- Do **not** auto-clean or wipe the local dev database — I keep populated
  seed/demo data to preview the UI.

## UI & components

- This project uses shadcn/ui built on **Base UI** (`@base-ui/react`), **not**
  Radix. Follow Base UI conventions (e.g. `render={<Link/>}` not `asChild`).
- Match the surrounding code's style, naming, and idioms.
- Reuse existing patterns (PageHeader, dialog footer bars, the table layout with
  column headers + clickable rows) rather than inventing new ones.
- Every clickable element (buttons, links, menu items, clickable rows, etc.)
  must show a hand cursor (`cursor-pointer`), not the default arrow.
- All dialogs must share the same footer styling — the muted footer bar
  (`-mx-4 -mb-4 flex justify-end gap-2 rounded-b-xl border-t bg-muted/50 p-4`),
  or `DialogFooter`, with a Cancel/secondary button left of the primary action.

## Add your own rules below

<!-- e.g. "Always add an e2e test for new admin actions." -->
