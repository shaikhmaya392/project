import crypto from "crypto";
import { readJson, writeJson } from "./blobStore";

const BLOB_KEY = "quotations.json";
const STARTING_NUMBER = 1045;

async function readAll() {
  return readJson(BLOB_KEY);
}

async function writeAll(quotations) {
  await writeJson(BLOB_KEY, quotations);
}

function computeTotal(fees) {
  return (fees || []).reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
}

export async function getQuotations() {
  const quotations = await readAll();
  return quotations.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

export async function getQuotationByToken(token) {
  const quotations = await readAll();
  return quotations.find((q) => q.token === token) || null;
}

export async function getQuotation(id) {
  const quotations = await readAll();
  return quotations.find((q) => q.id === id) || null;
}

export async function createQuotation(data) {
  const quotations = await readAll();
  const number = STARTING_NUMBER + quotations.length;
  const quotation = {
    id: `quote-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    token: crypto.randomBytes(16).toString("hex"),
    number: `Q-${number}`,
    lead_id: data.lead_id || null,
    client_name: data.client_name || "",
    client_email: data.client_email || "",
    project_description: data.project_description || "",
    address: data.address || "",
    services: data.services || [],
    fees: data.fees || [],
    total: computeTotal(data.fees),
    valid_until: data.valid_until || "",
    status: "sent",
    created_at: new Date().toISOString(),
    sent_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    accepted_at: null,
  };
  quotations.push(quotation);
  await writeAll(quotations);
  return quotation;
}

export async function updateQuotation(id, patch) {
  const quotations = await readAll();
  const idx = quotations.findIndex((q) => q.id === id);
  if (idx === -1) return null;
  const updated = { ...quotations[idx], ...patch, updated_at: new Date().toISOString() };
  if (patch.fees) updated.total = computeTotal(patch.fees);
  quotations[idx] = updated;
  await writeAll(quotations);
  return updated;
}

export async function markAccepted(token) {
  const quotations = await readAll();
  const idx = quotations.findIndex((q) => q.token === token);
  if (idx === -1) return null;
  quotations[idx].status = "accepted";
  quotations[idx].accepted_at = new Date().toISOString();
  await writeAll(quotations);
  return quotations[idx];
}
