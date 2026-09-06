// Phase 2 of the lineup-scoring change: move games under lineups.
//
// Adds match_lineups + lineup_players, and repoints match_games from a match
// to a match_lineup. Existing matches with games are wrapped into a single
// doubles lineup (position 1) so no results are lost. Transactional; bails if
// match_lineups already exists.
//
//   Local:  npm run migrate:lineup-scoring
//   Prod:   npm run migrate:lineup-scoring:prod   (loads .env.migrate)
export {};

export async function migrateLineupScoring() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  const { default: postgres } = await import("postgres");
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

  const [{ exists: done }] = await sql<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'match_lineups'
    ) AS exists`;
  if (done) {
    console.log("match_lineups already exists — migration already applied.");
    await sql.end();
    return;
  }

  await sql.begin(async (tx) => {
    await tx`
      DO $$ BEGIN
        CREATE TYPE lineup_side AS ENUM ('home', 'away');
      EXCEPTION WHEN duplicate_object THEN null; END $$`;

    await tx`
      CREATE TABLE match_lineups (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        match_id uuid NOT NULL,
        position integer NOT NULL,
        players_per_side integer NOT NULL,
        CONSTRAINT match_lineups_match_id_matches_id_fk
          FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE
      )`;

    await tx`
      CREATE TABLE lineup_players (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        match_lineup_id uuid NOT NULL,
        side lineup_side NOT NULL,
        user_id text NOT NULL,
        CONSTRAINT lineup_players_match_lineup_id_match_lineups_id_fk
          FOREIGN KEY (match_lineup_id) REFERENCES match_lineups(id) ON DELETE CASCADE,
        CONSTRAINT lineup_players_user_id_user_id_fk
          FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE
      )`;

    // Repoint games: one lineup per existing match that has games.
    await tx`ALTER TABLE match_games ADD COLUMN match_lineup_id uuid`;
    await tx`
      INSERT INTO match_lineups (match_id, position, players_per_side)
      SELECT DISTINCT match_id, 1, 2 FROM match_games`;
    await tx`
      UPDATE match_games g SET match_lineup_id = ml.id
      FROM match_lineups ml WHERE ml.match_id = g.match_id`;

    await tx`ALTER TABLE match_games ALTER COLUMN match_lineup_id SET NOT NULL`;
    await tx`ALTER TABLE match_games DROP CONSTRAINT match_games_match_id_matches_id_fk`;
    await tx`ALTER TABLE match_games DROP COLUMN match_id`;
    await tx`
      ALTER TABLE match_games
        ADD CONSTRAINT match_games_match_lineup_id_match_lineups_id_fk
        FOREIGN KEY (match_lineup_id) REFERENCES match_lineups(id) ON DELETE CASCADE`;
  });

  const [{ n: lineups }] = await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM match_lineups`;
  const [{ n: games }] = await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM match_games`;
  console.log(`Migration complete: ${lineups} lineup(s) wrapping ${games} game(s).`);
  await sql.end();
}

// Local entry point: load .env.local unless DATABASE_URL is already set.
if (process.argv[1]?.endsWith("migrate-lineup-scoring.ts")) {
  if (!process.env.DATABASE_URL) {
    try {
      process.loadEnvFile(".env.local");
    } catch {
      // rely on the environment
    }
  }
  migrateLineupScoring().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
