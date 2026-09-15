import { put, head } from "@vercel/blob";
import crypto from "crypto";

const BLOB_KEY = "proposals.json";
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

async function writeAll(proposals) {
  await put(BLOB_KEY, JSON.stringify(proposals, null, 2), {
    access: "public",
    contentType: "application/json",
    allowOverwrite: true,
  });
}

export async function getProposals() {
  const proposals = await readAll();
  return proposals.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

export async function getProposalByToken(token) {
  const proposals = await readAll();
  return proposals.find((p) => p.token === token) || null;
}

export async function getProposal(id) {
  const proposals = await readAll();
  return proposals.find((p) => p.id === id) || null;
}

export async function createProposal(data) {
  const proposals = await readAll();
  const number = STARTING_NUMBER + proposals.length;
  const total = (data.fees || []).reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
  const proposal = {
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
  proposals.push(proposal);
  await writeAll(proposals);
  return proposal;
}

export async function markAccepted(token) {
  const proposals = await readAll();
  const idx = proposals.findIndex((p) => p.token === token);
  if (idx === -1) return null;
  proposals[idx].status = "accepted";
  proposals[idx].accepted_at = new Date().toISOString();
  await writeAll(proposals);
  return proposals[idx];
}
