import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  return session;
}

export async function requireAdmin() {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  if (session.user.role !== "admin") redirect("/dashboard");
  return session;
}
