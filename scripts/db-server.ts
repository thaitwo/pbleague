import { existsSync } from "node:fs";
import EmbeddedPostgres from "embedded-postgres";

try {
  process.loadEnvFile(".env.local");
} catch {
  // rely on the environment
}

const DATA_DIR = ".pgdata";

export function parseDatabaseUrl() {
  const url = new URL(
    process.env.DATABASE_URL ??
      "postgresql://postgres:postgres@localhost:5502/pbleague",
  );
  return {
    user: url.username || "postgres",
    password: url.password || "postgres",
    port: Number(url.port) || 5432,
    database: url.pathname.replace(/^\//, "") || "pbleague",
  };
}

export async function startDbServer() {
  const { user, password, port, database } = parseDatabaseUrl();
  const pg = new EmbeddedPostgres({
    databaseDir: DATA_DIR,
    user,
    password,
    port,
    persistent: true,
  });

  if (!existsSync(`${DATA_DIR}/PG_VERSION`)) {
    await pg.initialise();
  }
  await pg.start();
  try {
    await pg.createDatabase(database);
  } catch {
    // database already exists
  }
  console.log(`Postgres running on port ${port} (database: ${database})`);
  return pg;
}

// Run standalone via `npm run db:start`
if (process.argv[1]?.endsWith("db-server.ts")) {
  startDbServer().then((pg) => {
    const stop = async () => {
      await pg.stop();
      process.exit(0);
    };
    process.on("SIGINT", stop);
    process.on("SIGTERM", stop);
  });
}
