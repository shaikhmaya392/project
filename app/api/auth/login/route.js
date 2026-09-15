import { NextResponse } from "next/server";
import { findUserByEmail } from "../../../../lib/usersStore";
import { verifyPassword } from "../../../../lib/auth";
import { createSessionToken, SESSION_COOKIE, SESSION_TTL_MS } from "../../../../lib/session";

export async function POST(request) {
  try {
    const { email, password } = await request.json();
    const user = await findUserByEmail(email || "");
    if (!user || !verifyPassword(password || "", user.password)) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }
    const token = await createSessionToken(user.id);
    const { password: _pw, ...safe } = user;
    const res = NextResponse.json({ user: safe });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_TTL_MS / 1000,
    });
    return res;
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
