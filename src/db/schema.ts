import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// ---------- Auth tables (managed by Better Auth) ----------

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  // Player profile
  skillLevel: text("skill_level"),
  phone: text("phone"),
  // "player" | "admin" — org-level admin
  role: text("role").notNull().default("player"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ---------- League domain ----------

export const leagueStatus = pgEnum("league_status", [
  "draft",
  "active",
  "completed",
]);

export const membershipRole = pgEnum("membership_role", [
  "captain",
  "co_captain",
  "player",
]);

export const membershipStatus = pgEnum("membership_status", [
  "pending",
  "active",
  "removed",
]);

export const matchStatus = pgEnum("match_status", [
  "proposed",
  "scheduled",
  "completed",
  "confirmed",
  "disputed",
  "cancelled",
]);

export const leagues = pgTable("leagues", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  // e.g. "3.0", "3.5", "4.0"
  skillLevel: text("skill_level").notNull(),
  seasonStart: timestamp("season_start"),
  seasonEnd: timestamp("season_end"),
  status: leagueStatus("status").notNull().default("draft"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  leagueId: uuid("league_id")
    .notNull()
    .references(() => leagues.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  area: text("area"),
  rosterCap: integer("roster_cap"),
  inviteToken: text("invite_token").unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const teamMemberships = pgTable("team_memberships", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  // Null until an invited-by-email member claims their account
  userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
  invitedEmail: text("invited_email"),
  role: membershipRole("role").notNull().default("player"),
  status: membershipStatus("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const matches = pgTable("matches", {
  id: uuid("id").primaryKey().defaultRandom(),
  leagueId: uuid("league_id")
    .notNull()
    .references(() => leagues.id, { onDelete: "cascade" }),
  homeTeamId: uuid("home_team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  awayTeamId: uuid("away_team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  proposedByTeamId: uuid("proposed_by_team_id").references(() => teams.id),
  scheduledAt: timestamp("scheduled_at"),
  location: text("location"),
  status: matchStatus("status").notNull().default("proposed"),
  scoreEnteredBy: text("score_entered_by").references(() => user.id),
  scoreEnteredByTeamId: uuid("score_entered_by_team_id").references(() => teams.id),
  scoreEnteredAt: timestamp("score_entered_at"),
  scoreConfirmedBy: text("score_confirmed_by").references(() => user.id),
  scoreConfirmedAt: timestamp("score_confirmed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const matchGames = pgTable("match_games", {
  id: uuid("id").primaryKey().defaultRandom(),
  matchId: uuid("match_id")
    .notNull()
    .references(() => matches.id, { onDelete: "cascade" }),
  gameNumber: integer("game_number").notNull(),
  homeScore: integer("home_score").notNull(),
  awayScore: integer("away_score").notNull(),
});
