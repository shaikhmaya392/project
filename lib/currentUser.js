import { cookies } from "next/headers";
import { verifySessionToken, SESSION_COOKIE } from "./session";
import { findUserById } from "./usersStore";

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const payload = await verifySessionToken(token);
  if (!payload) return null;
  const user = await findUserById(payload.uid);
  if (!user) return null;
  const { password, ...safe } = user;
  return safe;
}
