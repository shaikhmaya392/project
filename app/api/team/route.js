import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../lib/currentUser";
import { getUsers } from "../../../lib/usersStore";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Lightweight team list (id, name, role) for assignment dropdowns.
// Any authenticated staff member may read it.
export async function GET() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const users = await getUsers();
  return NextResponse.json(users.map((u) => ({ id: u.id, name: u.name, role: u.role })));
}
