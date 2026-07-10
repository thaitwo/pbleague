import postgres from "postgres";

// Remove data created by e2e runs (leagues named "E2E …", users "e2e-…"),
// leaving the developer's own data and the admin account intact.
export default async function globalTeardown() {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // rely on the environment
  }
  const url = process.env.DATABASE_URL;
  if (!url) return;
  const sql = postgres(url);
  try {
    await sql`DELETE FROM leagues WHERE name LIKE 'E2E %'`;
    await sql`DELETE FROM "user" WHERE email LIKE 'e2e-%'`;
  } finally {
    await sql.end();
  }
}
