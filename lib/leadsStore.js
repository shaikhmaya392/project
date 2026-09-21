import crypto from "crypto";
import { readJson, writeJson } from "./blobStore";
import { formatPhone } from "./formatPhone";

const BLOB_KEY = "leads.json";

async function readAll() {
  return readJson(BLOB_KEY);
}

async function writeAll(leads) {
  await writeJson(BLOB_KEY, leads);
}

function nextId(leads) {
  const max = leads.reduce((m, l) => Math.max(m, Number(l.numericId) || 0), 0);
  return max + 1;
}

export async function getLeads() {
  const leads = await readAll();
  return leads.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

export async function getLead(id) {
  const leads = await readAll();
  return leads.find((l) => String(l.id) === String(id)) || null;
}

export async function createLead(payload) {
  const leads = await readAll();
  const now = new Date().toISOString();
  const numericId = nextId(leads);
  const lead = {
    id: `manual-${numericId}`,
    numericId,
    name: payload.name || "",
    email: payload.email || "",
    phone: formatPhone(payload.phone) || payload.phone || "",
    address: payload.address || "",
    service_type: payload.service_type || "",
    message: payload.message || "",
    status: payload.status || "new",
    assigned_to: payload.assigned_to || "",
    notes: payload.notes || "",
    source: payload.source || "manual",
    form_name: payload.form_name || "",
    raw_data: payload.raw_data || {},
    created_at: now,
    updated_at: now,
  };
  leads.push(lead);
  await writeAll(leads);
  return lead;
}

export async function updateLead(id, patch) {
  const leads = await readAll();
  const idx = leads.findIndex((l) => String(l.id) === String(id));
  if (idx === -1) return null;
  if (patch.phone !== undefined) patch = { ...patch, phone: formatPhone(patch.phone) || patch.phone };
  leads[idx] = { ...leads[idx], ...patch, updated_at: new Date().toISOString() };
  await writeAll(leads);
  return leads[idx];
}

export async function getLeadByDocToken(token) {
  const leads = await readAll();
  return leads.find((l) => l.doc_token === token) || null;
}

// Lazily creates the lead's document-upload token the first time it's
// needed, instead of a migration — existing leads simply don't have one yet.
export async function ensureDocToken(id) {
  const leads = await readAll();
  const idx = leads.findIndex((l) => String(l.id) === String(id));
  if (idx === -1) return null;
  if (leads[idx].doc_token) return leads[idx].doc_token;
  const token = crypto.randomBytes(16).toString("hex");
  leads[idx] = { ...leads[idx], doc_token: token, updated_at: new Date().toISOString() };
  await writeAll(leads);
  // Re-read after the write settles: a concurrent call (e.g. the Documents
  // tab loading at the same moment a quotation is being sent) can race this
  // one and win the write, so return whichever token actually ended up
  // persisted rather than this call's own — every caller then converges on
  // the same value instead of a stale, orphaned one.
  const after = await readAll();
  const final = after.find((l) => String(l.id) === String(id));
  return final?.doc_token || token;
}

export async function deleteLead(id) {
  const leads = await readAll();
  const filtered = leads.filter((l) => String(l.id) !== String(id));
  await writeAll(filtered);
  return filtered.length !== leads.length;
}

// Merge-insert leads coming from the website (Formidable Forms), skipping
// anything already imported (matched by frm_item_id).
export async function importWebsiteLeads(newLeads) {
  const leads = await readAll();
  const existingFrmIds = new Set(leads.filter((l) => l.frm_item_id).map((l) => l.frm_item_id));
  let imported = 0;
  for (const raw of newLeads) {
    if (raw.frm_item_id && existingFrmIds.has(raw.frm_item_id)) continue;
    const numericId = nextId(leads) + imported;
    leads.push({
      id: raw.frm_item_id ? `frm-${raw.frm_item_id}` : `manual-${numericId}`,
      numericId,
      frm_item_id: raw.frm_item_id || null,
      name: raw.name || "",
      email: raw.email || "",
      phone: formatPhone(raw.phone) || raw.phone || "",
      address: raw.address || "",
      service_type: raw.service_type || "",
      message: raw.message || "",
      status: "new",
      assigned_to: "",
      notes: "",
      source: "website_form",
      form_name: raw.form_name || "",
      raw_data: raw.raw_data || {},
      created_at: raw.created_at || new Date().toISOString(),
      updated_at: raw.updated_at || new Date().toISOString(),
    });
    if (raw.frm_item_id) existingFrmIds.add(raw.frm_item_id);
    imported++;
  }
  if (imported > 0) await writeAll(leads);
  return { scanned: newLeads.length, imported };
}
