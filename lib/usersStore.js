import { put, head } from "@vercel/blob";
import { hashPassword } from "./auth";

const BLOB_KEY = "users.json";

async function readAll() {
  try {
    const info = await head(BLOB_KEY);
    const res = await fetch(info.url, { cache: "no-store" });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

async function writeAll(users) {
  await put(BLOB_KEY, JSON.stringify(users, null, 2), {
    access: "public",
    contentType: "application/json",
    allowOverwrite: true,
  });
}

export async function getUsers() {
  const users = await readAll();
  return users.map(({ password, ...rest }) => rest);
}

export async function findUserByEmail(email) {
  const users = await readAll();
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
}

export async function findUserById(id) {
  const users = await readAll();
  return users.find((u) => u.id === id) || null;
}

export async function createUser({ name, email, password, role }) {
  const users = await readAll();
  if (users.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
    throw new Error("An account with this email already exists");
  }
  const user = {
    id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    email,
    password: hashPassword(password),
    role: role || "team",
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  await writeAll(users);
  const { password: _pw, ...safe } = user;
  return safe;
}
