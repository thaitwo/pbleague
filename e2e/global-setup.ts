import postgres from "postgres";

const BASE = "http://localhost:3100";
const ADMIN = {
  name: "Admin",
  email: "test@example.com",
  password: "password123",
};

// Ensures the admin account the specs sign in as exists, then promotes it.
// Idempotent: locally the account already exists (sign-up just errors and is
// ignored); in CI it seeds a fresh database.
export default async function globalSetup() {
  try {
    await fetch(`${BASE}/api/auth/sign-up/email`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: BASE },
      body: JSON.stringify(ADMIN),
    });
  } catch {
    // server not reachable or account exists — the promote step still runs
  }

  try {
    process.loadEnvFile(".env.local");
  } catch {
    // rely on the environment (CI sets DATABASE_URL directly)
  }
  const url = process.env.DATABASE_URL;
  if (!url) return;
  const sql = postgres(url);
  try {
    await sql`UPDATE "user" SET role = 'admin' WHERE email = ${ADMIN.email}`;
  } finally {
    await sql.end();
  }
}
