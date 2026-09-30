import crypto from "crypto";
import { formatPhone } from "./formatPhone";
import { allDocs, getDoc, findDoc, insertDoc, replaceDoc, deleteDoc, maxNumeric } from "./db";

const TABLE = "leads";

export async function getLeads() {
  return allDocs(TABLE, "created_at", "DESC");
}

export async function getLead(id) {
  return getDoc(TABLE, id);
}

async function nextNumericId() {
  return (await maxNumeric(TABLE, "numericId")) + 1;
}

export async function createLead(payload) {
  const now = new Date().toISOString();
  const numericId = await nextNumericId();
  const lead = {
    id: `manual-${numericId}`,
    numericId,
    name: payload.name || "",
    email: payload.email || "",
    phone: formatPhone(payload.phone) || payload.phone || "",
    address: payload.address || "",
    company_name: payload.company_name || "",
    license_number: payload.license_number || "",
    property: payload.property || null,
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
  return insertDoc(TABLE, lead);
}

export async function updateLead(id, patch) {
  const lead = await getLead(id);
  if (!lead) return null;
  if (patch.phone !== undefined) patch = { ...patch, phone: formatPhone(patch.phone) || patch.phone };
  const updated = { ...lead, ...patch, updated_at: new Date().toISOString() };
  return replaceDoc(TABLE, updated);
}

// Kept for the document-upload routes that call it. With every lead now its
// own row, a write no longer touches any other lead, so the old retry/verify
// dance against a shared file isn't needed — but the signature stays the same
// so callers don't change. mutate(current) returns a patch; verify(final)
// confirms the desired end state (and short-circuits if already true).
export async function updateLeadSafely(id, mutate, verify) {
  const lead = await getLead(id);
  if (!lead) return null;
  if (verify(lead)) return lead;
  let patch = mutate(lead);
  if (patch.phone !== undefined) patch = { ...patch, phone: formatPhone(patch.phone) || patch.phone };
  const updated = { ...lead, ...patch, updated_at: new Date().toISOString() };
  await replaceDoc(TABLE, updated);
  return updated;
}

export async function getLeadByDocToken(token) {
  return findDoc(TABLE, "doc_token", token);
}

export async function ensureDocToken(id) {
  const lead = await getLead(id);
  if (!lead) return null;
  if (lead.doc_token) return lead.doc_token;
  const token = crypto.randomBytes(16).toString("hex");
  await replaceDoc(TABLE, { ...lead, doc_token: token, updated_at: new Date().toISOString() });
  return token;
}

export async function deleteLead(id) {
  return deleteDoc(TABLE, id);
}

// Merge-insert leads coming from the website (Formidable Forms), skipping
// anything already imported (matched by frm_item_id).
export async function importWebsiteLeads(newLeads) {
  const existing = await getLeads();
  const existingFrmIds = new Set(existing.filter((l) => l.frm_item_id).map((l) => l.frm_item_id));
  let numericId = (await maxNumeric(TABLE, "numericId"));
  let imported = 0;
  for (const raw of newLeads) {
    if (raw.frm_item_id && existingFrmIds.has(raw.frm_item_id)) continue;
    numericId += 1;
    const lead = {
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
    };
    await insertDoc(TABLE, lead);
    if (raw.frm_item_id) existingFrmIds.add(raw.frm_item_id);
    imported++;
  }
  return { scanned: newLeads.length, imported };
}
