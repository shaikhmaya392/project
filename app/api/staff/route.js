import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../lib/currentUser";
import { getUsers, createUser } from "../../../lib/usersStore";

export async function GET() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (me.role !== "admin") return NextResponse.json({ error: "Admins only" }, { status: 403 });
  const users = await getUsers();
  return NextResponse.json(users);
}

export async function POST(request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (me.role !== "admin") return NextResponse.json({ error: "Admins only" }, { status: 403 });

  try {
    const body = await request.json();
    if (!body.name || !body.email || !body.password || body.password.length < 6) {
      return NextResponse.json(
        { error: "Name, email, and a password of at least 6 characters are required" },
        { status: 400 }
      );
    }
    const user = await createUser({
      name: body.name,
      email: body.email,
      password: body.password,
      role: body.role || "agent",
      phone: body.phone,
      address: body.address,
    });
    return NextResponse.json(user, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
