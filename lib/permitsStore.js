import { put, head } from "@vercel/blob";
import crypto from "crypto";

const BLOB_KEY = "permits.json";
const STARTING_NUMBER = 1045;

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

async function writeAll(permits) {
  await put(BLOB_KEY, JSON.stringify(permits, null, 2), {
    access: "public",
    contentType: "application/json",
    allowOverwrite: true,
  });
}

export async function getPermits() {
  const permits = await readAll();
  return permits.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

export async function getPermitByToken(token) {
  const permits = await readAll();
  return permits.find((p) => p.token === token) || null;
}

export async function getPermit(id) {
  const permits = await readAll();
  return permits.find((p) => p.id === id) || null;
}

export async function createPermit(data) {
  const permits = await readAll();
  const number = STARTING_NUMBER + permits.length;
  const total = (data.fees || []).reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
  const permit = {
    id: `prop-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    token: crypto.randomBytes(16).toString("hex"),
    number: `P-${number}`,
    lead_id: data.lead_id || null,
    client_name: data.client_name || "",
    client_email: data.client_email || "",
    project_description: data.project_description || "",
    address: data.address || "",
    services: data.services || [],
    fees: data.fees || [],
    total,
    valid_until: data.valid_until || "",
    status: "sent",
    created_at: new Date().toISOString(),
    sent_at: new Date().toISOString(),
    accepted_at: null,
  };
  permits.push(permit);
  await writeAll(permits);
  return permit;
}

export async function markAccepted(token) {
  const permits = await readAll();
  const idx = permits.findIndex((p) => p.token === token);
  if (idx === -1) return null;
  permits[idx].status = "accepted";
  permits[idx].accepted_at = new Date().toISOString();
  await writeAll(permits);
  return permits[idx];
}
