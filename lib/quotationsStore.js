import crypto from "crypto";
import { allDocs, getDoc, findDoc, insertDoc, replaceDoc, countDocs } from "./db";

const TABLE = "quotations";
const STARTING_NUMBER = 1045;

function computeTotal(fees) {
  return (fees || []).reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
}

export async function getQuotations() {
  return allDocs(TABLE, "created_at", "DESC");
}

export async function getQuotationByToken(token) {
  return findDoc(TABLE, "token", token);
}

export async function getQuotation(id) {
  return getDoc(TABLE, id);
}

export async function createQuotation(data) {
  const number = STARTING_NUMBER + (await countDocs(TABLE));
  const now = new Date().toISOString();
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
    created_at: now,
    sent_at: now,
    updated_at: now,
    accepted_at: null,
  };
  return insertDoc(TABLE, quotation);
}

export async function updateQuotation(id, patch) {
  const quotation = await getQuotation(id);
  if (!quotation) return null;
  const updated = { ...quotation, ...patch, updated_at: new Date().toISOString() };
  if (patch.fees) updated.total = computeTotal(patch.fees);
  return replaceDoc(TABLE, updated);
}

export async function markAccepted(token) {
  const quotation = await getQuotationByToken(token);
  if (!quotation) return null;
  const updated = { ...quotation, status: "accepted", accepted_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  return replaceDoc(TABLE, updated);
}
