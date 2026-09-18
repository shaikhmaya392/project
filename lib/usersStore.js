import { hashPassword } from "./auth";
import { readJson, writeJson } from "./blobStore";
import { formatPhone } from "./formatPhone";

const BLOB_KEY = "users.json";

async function readAll() {
  return readJson(BLOB_KEY);
}

async function writeAll(users) {
  await writeJson(BLOB_KEY, users);
}

function strip(user) {
  const { password, ...safe } = user;
  return safe;
}

export async function getUsers() {
  const users = await readAll();
  return users.map(strip);
}

export async function countAdmins() {
  const users = await readAll();
  return users.filter((u) => u.role === "admin").length;
}

export async function findUserByEmail(email) {
  const users = await readAll();
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
}

export async function findUserById(id) {
  const users = await readAll();
  return users.find((u) => u.id === id) || null;
}

export async function createUser({ name, email, password, role, phone, address }) {
  const users = await readAll();
  if (users.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
    throw new Error("An account with this email already exists");
  }
  // The very first account in the system becomes the admin automatically.
  const resolvedRole = role || (users.length === 0 ? "admin" : "agent");
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
  users.push(user);
  await writeAll(users);
  return strip(user);
}

export async function updateUser(id, patch) {
  const users = await readAll();
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) throw new Error("Staff member not found");

  const updated = { ...users[idx] };
  if (patch.name !== undefined) updated.name = patch.name;
  if (patch.email !== undefined) {
    if (users.some((u) => u.id !== id && u.email.toLowerCase() === patch.email.toLowerCase())) {
      throw new Error("Another account already uses this email");
    }
    updated.email = patch.email;
  }
  if (patch.phone !== undefined) updated.phone = formatPhone(patch.phone) || patch.phone;
  if (patch.address !== undefined) updated.address = patch.address;
  if (patch.role !== undefined) updated.role = patch.role;
  if (patch.password) updated.password = hashPassword(patch.password);

  users[idx] = updated;
  await writeAll(users);
  return strip(updated);
}

export async function deleteUser(id) {
  const users = await readAll();
  const filtered = users.filter((u) => u.id !== id);
  await writeAll(filtered);
  return filtered.length !== users.length;
}
