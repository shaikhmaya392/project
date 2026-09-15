import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../../lib/currentUser";
import { updateUser, deleteUser, countAdmins } from "../../../../lib/usersStore";

export async function PATCH(request, { params }) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const isSelf = me.id === params.id;
  const isAdmin = me.role === "admin";
  const admins = await countAdmins();
  const bootstrapping = admins === 0 && isSelf; // no admin exists yet: let a user promote themselves

  if (!isAdmin && !isSelf) {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  try {
    const body = await request.json();

    if (bootstrapping) {
      const user = await updateUser(params.id, { role: "admin" });
      return NextResponse.json(user);
    }

    // Non-admins editing themselves may change their own profile/password,
    // but never their own role.
    if (isSelf && !isAdmin) {
      delete body.role;
    }

    if (isSelf && body.role && body.role !== "admin" && admins <= 1) {
      return NextResponse.json({ error: "You're the only admin left - promote someone else first" }, { status: 400 });
    }

    const user = await updateUser(params.id, body);
    return NextResponse.json(user);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (me.role !== "admin") return NextResponse.json({ error: "Admins only" }, { status: 403 });
  if (me.id === params.id) {
    return NextResponse.json({ error: "You can't remove your own account" }, { status: 400 });
  }
  const ok = await deleteUser(params.id);
  if (!ok) return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
  return NextResponse.json({ deleted: true });
}
