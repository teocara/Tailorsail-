import { cookies } from "next/headers";
import { db } from "@/lib/db";

/**
 * Session stub.
 *
 * Shaped like real auth — `getCurrentUser()` returns a user or null, and every
 * caller treats it that way — so swapping in Auth.js later is a change to this
 * file rather than to every page. What it actually does is read a user id from
 * a cookie and fall back to the seeded demo traveller, which is enough to
 * demonstrate the booking flow without building a login this milestone.
 */

const COOKIE = "ts_user";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: "TRAVELER" | "OWNER" | "OPERATOR" | "ADMIN";
};

export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const id = store.get(COOKIE)?.value;

  const user = id
    ? await db.user.findUnique({ where: { id } })
    : await db.user.findFirst({ where: { role: "TRAVELER" } });

  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

/** Ops surfaces are admin-only. With no real auth this is a soft gate. */
export async function requireOps(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("No user in session");
  return user;
}
