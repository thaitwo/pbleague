// Applies the division-lineups migration to the PRODUCTION database, using a
// connection string kept in the gitignored .env.migrate (same pattern as
// db-push-prod), so the secret never appears on the command line or in logs.
//
//   npm run migrate:lineups:prod
//
// Additive and idempotent — safe to run once.
import { migrateLineups } from "./migrate-lineups";

try {
  process.loadEnvFile(".env.migrate");
} catch {
  console.error(
    "Missing .env.migrate — create it with:\n" +
      "  DATABASE_URL=<neon direct/unpooled url>",
  );
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is empty in .env.migrate");
  process.exit(1);
}

const host = (() => {
  try {
    return new URL(process.env.DATABASE_URL).host;
  } catch {
    return "?";
  }
})();

console.log(`Migrating PRODUCTION (${host}) …`);
migrateLineups().catch((e) => {
  console.error(e);
  process.exit(1);
});
