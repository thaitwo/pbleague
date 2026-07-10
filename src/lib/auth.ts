import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { claimInvitesForUser } from "@/db/mutations";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: {
    enabled: true,
  },
  databaseHooks: {
    user: {
      create: {
        after: async (createdUser) => {
          // Link any captain/co-captain invites addressed to this email.
          await claimInvitesForUser(createdUser.id, createdUser.email);
        },
      },
    },
  },
  user: {
    additionalFields: {
      skillLevel: {
        type: "string",
        required: false,
      },
      phone: {
        type: "string",
        required: false,
      },
      role: {
        type: "string",
        required: false,
        defaultValue: "player",
        input: false,
      },
    },
  },
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
