import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. For local development run `npm run dev` " +
      "(starts the embedded Postgres automatically) and check .env.local.",
  );
}

export type Database = ReturnType<typeof createDb>;

// Reuse a single connection pool across Next.js hot reloads
const globalForDb = globalThis as unknown as { db?: Database };

function createDb() {
  // prepare: false is required for connection poolers in transaction mode
  // (e.g. Neon's pooled endpoint / PgBouncer), and is harmless otherwise.
  return drizzle(postgres(process.env.DATABASE_URL!, { prepare: false }), {
    schema,
  });
}

export const db = globalForDb.db ?? (globalForDb.db = createDb());
