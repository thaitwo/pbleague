// Demo data for local development / UI work. Repeatable: re-running replaces
// its own data (the demo season below + @demo.pbl users) and leaves everything
// else (your admin account, other leagues) untouched.
//
//   npm run seed
//
export {}; // treat this file as a module (isolates its top-level scope)

try {
  process.loadEnvFile(".env.local");
} catch {
  // rely on the environment
}

const DEMO_SEASONS = ["2026 Demo Season"];
const ADMIN_EMAIL = "test@example.com";

const daysFromNow = (d: number) =>
  new Date(Date.now() + d * 24 * 60 * 60 * 1000);

async function main() {
  const { randomUUID } = await import("node:crypto");
  const { eq, inArray, like } = await import("drizzle-orm");
  const { db } = await import("../src/db");
  const s = await import("../src/db/schema");
  const m = await import("../src/db/mutations");

  // --- reset prior demo data (divisions/teams cascade from the season) ---
  await db.delete(s.leagues).where(inArray(s.leagues.name, DEMO_SEASONS));
  await db.delete(s.user).where(like(s.user.email, "%@demo.pbl"));

  const [admin] = await db
    .select({ id: s.user.id })
    .from(s.user)
    .where(eq(s.user.email, ADMIN_EMAIL))
    .limit(1);
  const scorerId = admin?.id ?? null;

  // --- demo users (display-only rows; they can't log in) ---
  const ids: Record<string, string> = {};
  async function mkUser(name: string, email: string, skillLevel: string) {
    const id = randomUUID();
    await db.insert(s.user).values({ id, name, email, skillLevel });
    ids[email] = id;
  }
  await mkUser("Alex Rivera", "alex@demo.pbl", "3.5");
  await mkUser("Sam Chen", "sam@demo.pbl", "3.5");
  await mkUser("Jordan Lee", "jordan@demo.pbl", "3.5");
  await mkUser("Taylor Kim", "taylor@demo.pbl", "3.5");
  await mkUser("Morgan Diaz", "morgan@demo.pbl", "3.5");
  await mkUser("Casey Nguyen", "casey@demo.pbl", "3.5");
  await mkUser("Riley Brooks", "riley@demo.pbl", "3.5");
  await mkUser("Jamie Park", "jamie@demo.pbl", "3.5");
  await mkUser("Pat Owens", "pat@demo.pbl", "3.5");
  await mkUser("Dana Cross", "dana@demo.pbl", "4.0");

  const enteredBy = scorerId ?? ids["alex@demo.pbl"];

  type DivFacets = {
    name?: string | null;
    rating: string;
    ratingType?: "single" | "combo";
    gender?: "mens" | "womens" | "mixed";
    ageGroup?: string;
    status?: "draft" | "active" | "completed";
    seasonStart?: Date | null;
    seasonEnd?: Date | null;
  };
  async function division(leagueId: string, f: DivFacets) {
    const d = await m.createDivision(leagueId, {
      name: f.name ?? null,
      rating: f.rating,
      ratingType: f.ratingType ?? "single",
      gender: f.gender ?? "mixed",
      ageGroup: f.ageGroup ?? "18 & Over",
      status: f.status ?? "active",
      seasonStart: f.seasonStart ?? null,
      seasonEnd: f.seasonEnd ?? null,
    });
    return d.id;
  }

  async function team(
    divisionId: string,
    name: string,
    captainEmail: string,
    opts: { coCaptain?: string; players?: string[]; rosterCap?: number } = {},
  ) {
    const t = await m.createTeam({
      divisionId,
      name,
      rosterCap: opts.rosterCap ?? null,
      captainEmail,
    });
    if (opts.coCaptain) await m.assignRoleByEmail(t.id, opts.coCaptain, "co_captain");
    for (const p of opts.players ?? []) await m.assignRoleByEmail(t.id, p, "player");
    return t.id;
  }

  type Outcome = "scheduled" | "awaiting" | "disputed" | "proposed";
  async function match(
    homeId: string,
    awayId: string,
    when: Date,
    outcome: Outcome | { confirmed: [number, number][] },
    location = "Community Center",
  ) {
    const proposed = await m.proposeMatch({
      proposingTeamId: homeId,
      opponentTeamId: awayId,
      scheduledAt: when,
      location,
    });
    if (outcome === "proposed") return;
    await m.acceptMatch(proposed.id);
    if (outcome === "scheduled") return;

    if (typeof outcome === "object") {
      const games = outcome.confirmed.map(([h, a]) => ({ homeScore: h, awayScore: a }));
      await m.enterScore(proposed.id, homeId, games, enteredBy);
      await m.confirmScore(proposed.id, enteredBy);
      return;
    }
    // awaiting / disputed: home enters a score, opponent hasn't confirmed
    await m.enterScore(
      proposed.id,
      homeId,
      [{ homeScore: 11, awayScore: 6 }],
      enteredBy,
    );
    if (outcome === "disputed") await m.disputeScore(proposed.id);
  }

  // ===== One demo season with several divisions =====
  const season = await m.createLeague({
    name: "2026 Demo Season",
    seasonStart: daysFromNow(-21),
    seasonEnd: daysFromNow(60),
    status: "active",
  });

  // --- Division A: 3.5 Mixed (the main worked example) ---
  const a = await division(season.id, {
    rating: "3.5",
    gender: "mixed",
    seasonStart: daysFromNow(-21),
    seasonEnd: daysFromNow(40),
  });
  const dinkers = await team(a, "Dinktown Dinkers", ADMIN_EMAIL, {
    coCaptain: "alex@demo.pbl",
    players: ["sam@demo.pbl"],
    rosterCap: 8,
  });
  const crashers = await team(a, "Kitchen Crashers", "jordan@demo.pbl", {
    players: ["taylor@demo.pbl"],
    rosterCap: 8,
  });
  const gains = await team(a, "Net Gains", "morgan@demo.pbl", {
    coCaptain: "casey@demo.pbl",
    rosterCap: 8,
  });
  const paddle = await team(a, "Paddle Battalion", "riley@demo.pbl", {
    players: ["jamie@demo.pbl"],
    rosterCap: 8,
  });

  // a player waiting on approval to join Paddle Battalion
  await m.requestToJoin(paddle, ids["pat@demo.pbl"]);

  // confirmed results (feed standings)
  await match(dinkers, crashers, daysFromNow(-14), { confirmed: [[11, 6], [11, 8]] });
  await match(dinkers, gains, daysFromNow(-12), { confirmed: [[11, 9], [8, 11], [11, 7]] });
  await match(crashers, paddle, daysFromNow(-11), { confirmed: [[11, 4], [11, 9]] });
  await match(gains, paddle, daysFromNow(-9), { confirmed: [[11, 7], [11, 5]] });
  await match(crashers, gains, daysFromNow(-7), { confirmed: [[11, 8], [9, 11], [12, 10]] });
  // upcoming, proposed, awaiting confirmation (Dinkers must confirm), disputed
  await match(dinkers, paddle, daysFromNow(6), "scheduled");
  await match(gains, dinkers, daysFromNow(9), "proposed");
  await match(crashers, dinkers, daysFromNow(-2), "awaiting");
  await match(gains, crashers, daysFromNow(-3), "disputed");

  // --- Division B: 4.0 Men's ---
  const b = await division(season.id, {
    rating: "4.0",
    gender: "mens",
    seasonStart: daysFromNow(-10),
    seasonEnd: daysFromNow(60),
  });
  const smash = await team(b, "Smash Bros", "alex@demo.pbl", {
    players: ["jordan@demo.pbl", "dana@demo.pbl"],
  });
  const rally = await team(b, "Rally Cats", "casey@demo.pbl", {
    players: ["taylor@demo.pbl"],
  });
  // a team whose captain was invited by email but hasn't signed up yet
  await team(b, "Baseline Bandits", "newcoach@demo.pbl");
  await match(smash, rally, daysFromNow(-5), { confirmed: [[11, 9], [11, 6]] });

  // --- Division C: 9.0 Mixed combo (draft, no teams) ---
  await division(season.id, {
    rating: "9.0",
    ratingType: "combo",
    gender: "mixed",
    status: "draft",
  });

  console.log("Seeded demo data:");
  console.log("  • 2026 Demo Season");
  console.log("      – 3.5 Mixed — 4 teams, 5 played + upcoming/proposed/awaiting/disputed");
  console.log("      – 4.0 Men's — 3 teams (one pending captain invite), 1 played");
  console.log("      – 9.0 Mixed (combo) — draft, no teams");
  console.log(`  • ${ADMIN_EMAIL} is captain of Dinktown Dinkers`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
