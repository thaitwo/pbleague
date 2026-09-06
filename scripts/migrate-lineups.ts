// Phase 1 of the lineup-scoring change: give each division a lineup template.
// Adds divisions.lineups (jsonb) — an ordered list of lineup slots, each
// singles/doubles — defaulting existing divisions to three doubles lineups.
// Additive and idempotent; safe to run more than once.
//
//   Local:  npm run migrate:lineups
//   Prod:   npm run migrate:lineups:prod   (loads .env.migrate)
export {};

export async function migrateLineups() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  const { default: postgres } = await import("postgres");
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

  await sql`
    ALTER TABLE divisions
      ADD COLUMN IF NOT EXISTS lineups jsonb NOT NULL
      DEFAULT '[{"playersPerSide":2},{"playersPerSide":2},{"playersPerSide":2}]'::jsonb`;

  const [{ n }] = await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM divisions`;
  console.log(`Lineups column ready. ${n} division(s) now have a lineup template.`);
  await sql.end();
}

// Local entry point: load .env.local unless DATABASE_URL is already set.
if (process.argv[1]?.endsWith("migrate-lineups.ts")) {
  if (!process.env.DATABASE_URL) {
    try {
      process.loadEnvFile(".env.local");
    } catch {
      // rely on the environment
    }
  }
  migrateLineups().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
