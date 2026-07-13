export {}; // treat this file as a module (isolates its top-level scope)

try {
  process.loadEnvFile(".env.local");
} catch {
  // rely on the environment
}

async function main() {
  const { eq } = await import("drizzle-orm");
  const { db } = await import("../src/db");
  const { user } = await import("../src/db/schema");

  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npm run make-admin -- <email>");
    process.exit(1);
  }

  const [updated] = await db
    .update(user)
    .set({ role: "admin" })
    .where(eq(user.email, email))
    .returning({ email: user.email, role: user.role });

  if (!updated) {
    console.error(`No user found with email ${email}`);
    process.exit(1);
  }

  console.log(`${updated.email} is now an ${updated.role}.`);
  process.exit(0);
}

main();
