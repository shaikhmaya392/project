import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken, SESSION_COOKIE } from "../../../../lib/session";
import { findUserById } from "../../../../lib/usersStore";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const payload = await verifySessionToken(token);
  if (!payload) return NextResponse.json({ user: null });
  const user = await findUserById(payload.uid);
  if (!user) return NextResponse.json({ user: null });
  const { password, ...safe } = user;
  return NextResponse.json({ user: safe });
}
