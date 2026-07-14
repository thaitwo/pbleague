import { execSync } from "node:child_process";

// Pushes the Drizzle schema to the PRODUCTION database using a connection
// string kept in the gitignored .env.migrate, so the secret never appears on
// the command line or in logs. (This filename is deliberately NOT one Next.js
// auto-loads, so it can't affect builds.)
//
// One-time setup — create .env.migrate with:
//   DATABASE_URL=<your Neon DIRECT/unpooled connection string>
//
// Then run:  npm run db:push:prod

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

console.log(`Pushing schema to PRODUCTION (${host}) …`);
// drizzle.config.ts reads process.env.DATABASE_URL, which is already set above;
// its own .env.local load does not override an existing env var.
execSync("drizzle-kit push", { stdio: "inherit", env: process.env });
