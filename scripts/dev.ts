import { spawn } from "node:child_process";
import { connect } from "node:net";
import { parseDatabaseUrl, startDbServer } from "./db-server";

function portInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = connect({ port, host: "127.0.0.1" });
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
  });
}

async function main() {
  const { port } = parseDatabaseUrl();
  const dbAlreadyRunning = await portInUse(port);
  const pg = dbAlreadyRunning ? null : await startDbServer();
  if (dbAlreadyRunning) {
    console.log(`Postgres already running on port ${port}, reusing it`);
  }

  const next = spawn("npx", ["next", "dev"], { stdio: "inherit" });

  let shuttingDown = false;
  const shutdown = async (code: number) => {
    if (shuttingDown) return;
    shuttingDown = true;
    if (pg) await pg.stop();
    process.exit(code);
  };

  next.on("exit", (code) => shutdown(code ?? 0));
  process.on("SIGINT", () => {
    next.kill("SIGINT");
  });
  process.on("SIGTERM", () => {
    next.kill("SIGTERM");
  });
}

main();
