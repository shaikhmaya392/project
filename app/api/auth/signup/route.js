import { NextResponse } from "next/server";
import { createUser } from "../../../../lib/usersStore";
import { createSessionToken, SESSION_COOKIE, SESSION_TTL_MS } from "../../../../lib/session";

export async function POST(request) {
  try {
    const { name, email, password } = await request.json();
    if (!name || !email || !password || password.length < 6) {
      return NextResponse.json(
        { error: "Name, email, and a password of at least 6 characters are required" },
        { status: 400 }
      );
    }
    const user = await createUser({ name, email, password });
    const token = await createSessionToken(user.id);
    const res = NextResponse.json({ user });
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
