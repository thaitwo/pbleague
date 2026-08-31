// Applies the League → Division migration to the PRODUCTION database, using a
// connection string kept in the gitignored .env.migrate (same pattern as
// db-push-prod), so the secret never appears on the command line or in logs.
//
//   npm run migrate:divisions:prod
//
// Safe to run once; it bails out if the `divisions` table already exists.
import { migrateDivisions } from "./migrate-divisions";

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
migrateDivisions().catch((e) => {
  console.error(e);
  process.exit(1);
});
