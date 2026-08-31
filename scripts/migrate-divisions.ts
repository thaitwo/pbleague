// One-shot migration: introduce the League → Division hierarchy.
//
// Transforms the old flat model (leagues == rating flights) into:
//   leagues   (NEW: season/program bucket)
//     └─ divisions  (= old `leagues`, renamed + faceted)
//         └─ teams / matches   (re-keyed league_id → division_id)
//
// Non-destructive: existing flight rows become divisions under one legacy
// parent league ("2026 Season"); best-effort facet parse from their names.
// Constraint/column names are aligned to what drizzle-kit expects so a
// subsequent `db:push` is a no-op.
//
// Local:  npm run migrate:divisions
// Prod:   npm run migrate:divisions:prod   (loads .env.migrate)
export {};

export async function migrateDivisions() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  const { default: postgres } = await import("postgres");
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

  // Already migrated? (divisions table exists) — bail out safely.
  const [{ exists: alreadyDone }] = await sql<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'divisions'
    ) AS exists`;
  if (alreadyDone) {
    console.log("divisions table already exists — migration already applied. Nothing to do.");
    await sql.end();
    return;
  }

  await sql.begin(async (tx) => {
    // 1. New facet enums
    await tx`
      DO $$ BEGIN
        CREATE TYPE division_rating_type AS ENUM ('single', 'combo');
      EXCEPTION WHEN duplicate_object THEN null; END $$`;
    await tx`
      DO $$ BEGIN
        CREATE TYPE division_gender AS ENUM ('mens', 'womens', 'mixed');
      EXCEPTION WHEN duplicate_object THEN null; END $$`;

    // 2. Old `leagues` (rating flights) become `divisions`
    await tx`ALTER TABLE leagues RENAME TO divisions`;
    await tx`ALTER TABLE divisions RENAME CONSTRAINT leagues_pkey TO divisions_pkey`;
    await tx`ALTER TABLE divisions RENAME COLUMN skill_level TO rating`;
    await tx`ALTER TABLE divisions ALTER COLUMN name DROP NOT NULL`;
    await tx`ALTER TABLE divisions ADD COLUMN rating_type division_rating_type NOT NULL DEFAULT 'single'`;
    await tx`ALTER TABLE divisions ADD COLUMN gender division_gender NOT NULL DEFAULT 'mixed'`;
    await tx`ALTER TABLE divisions ADD COLUMN age_group text NOT NULL DEFAULT '18 & Over'`;
    await tx`ALTER TABLE divisions ADD COLUMN league_id uuid`;

    // 3. Re-key teams / matches: league_id → division_id (+ rename FK constraints)
    await tx`ALTER TABLE teams RENAME COLUMN league_id TO division_id`;
    await tx`ALTER TABLE teams RENAME CONSTRAINT teams_league_id_leagues_id_fk TO teams_division_id_divisions_id_fk`;
    await tx`ALTER TABLE matches RENAME COLUMN league_id TO division_id`;
    await tx`ALTER TABLE matches RENAME CONSTRAINT matches_league_id_leagues_id_fk TO matches_division_id_divisions_id_fk`;

    // 4. New top-level `leagues` (season/program) table
    await tx`
      CREATE TABLE leagues (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        season_start timestamp,
        season_end timestamp,
        status league_status NOT NULL DEFAULT 'draft',
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      )`;

    // 5. Legacy parent season, then backfill every division under it
    const [legacy] = await tx<{ id: string }[]>`
      INSERT INTO leagues (name, status) VALUES ('2026 Season', 'active')
      RETURNING id`;
    await tx`UPDATE divisions SET league_id = ${legacy.id}`;
    await tx`ALTER TABLE divisions ALTER COLUMN league_id SET NOT NULL`;
    await tx`
      ALTER TABLE divisions
        ADD CONSTRAINT divisions_league_id_leagues_id_fk
        FOREIGN KEY (league_id) REFERENCES leagues(id) ON DELETE CASCADE`;

    // 6. Best-effort facet parse from the old flight names
    await tx`UPDATE divisions SET gender = 'womens' WHERE name ILIKE '%women%'`;
    await tx`UPDATE divisions SET gender = 'mens' WHERE name ILIKE '%men%' AND name NOT ILIKE '%women%'`;
    await tx`UPDATE divisions SET gender = 'mixed' WHERE name ILIKE '%mixed%'`;
    // A rating of 6.0+ implies a combo (two-player sum) rating.
    await tx`
      UPDATE divisions SET rating_type = 'combo'
      WHERE rating ~ '^[0-9]+(\.[0-9]+)?$' AND rating::numeric >= 6.0`;
  });

  const [{ n: divisionCount }] = await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM divisions`;
  const [{ n: leagueCount }] = await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM leagues`;
  console.log(`Migration complete: ${leagueCount} league(s), ${divisionCount} division(s).`);
  const rows = await sql<{ name: string | null; rating: string; rating_type: string; gender: string; age_group: string }[]>`
    SELECT name, rating, rating_type, gender, age_group FROM divisions ORDER BY name`;
  for (const r of rows) {
    console.log(`  • ${r.name ?? "(auto)"} → rating=${r.rating}(${r.rating_type}) gender=${r.gender} age=${r.age_group}`);
  }
  await sql.end();
}

// Local entry point: load .env.local unless DATABASE_URL is already set.
if (process.argv[1]?.endsWith("migrate-divisions.ts")) {
  if (!process.env.DATABASE_URL) {
    try {
      process.loadEnvFile(".env.local");
    } catch {
      // rely on the environment
    }
  }
  migrateDivisions().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
