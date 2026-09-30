import { hashPassword } from "./auth";
import { formatPhone } from "./formatPhone";
import { allDocs, getDoc, findDoc, insertDoc, replaceDoc, deleteDoc, countDocs } from "./db";

const TABLE = "users";

function strip(user) {
  const { password, ...safe } = user;
  return safe;
}

export async function getUsers() {
  const users = await allDocs(TABLE);
  return users.map(strip);
}

export async function countAdmins() {
  const users = await allDocs(TABLE);
  return users.filter((u) => u.role === "admin").length;
}

export async function findUserByEmail(email) {
  return findDoc(TABLE, "email", email, { caseInsensitive: true });
}

export async function findUserById(id) {
  return getDoc(TABLE, id);
}

export async function createUser({ name, email, password, role, phone, address }) {
  const existing = await findUserByEmail(email);
  if (existing) throw new Error("An account with this email already exists");
  const total = await countDocs(TABLE);
  // The very first account in the system becomes the admin automatically.
  const resolvedRole = role || (total === 0 ? "admin" : "agent");
  const user = {
    id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    email,
    phone: (phone && (formatPhone(phone) || phone)) || "",
    address: address || "",
    password: hashPassword(password),
    role: resolvedRole,
    createdAt: new Date().toISOString(),
  };
  await insertDoc(TABLE, user);
  return strip(user);
}

export async function updateUser(id, patch) {
  const user = await getDoc(TABLE, id);
  if (!user) throw new Error("Staff member not found");

  const updated = { ...user };
  if (patch.name !== undefined) updated.name = patch.name;
  if (patch.email !== undefined) {
    const other = await findUserByEmail(patch.email);
    if (other && other.id !== id) throw new Error("Another account already uses this email");
    updated.email = patch.email;
  }
  if (patch.phone !== undefined) updated.phone = formatPhone(patch.phone) || patch.phone;
  if (patch.address !== undefined) updated.address = patch.address;
  if (patch.role !== undefined) updated.role = patch.role;
  if (patch.password) updated.password = hashPassword(patch.password);

  await replaceDoc(TABLE, updated);
  return strip(updated);
}

export async function deleteUser(id) {
  return deleteDoc(TABLE, id);
}
