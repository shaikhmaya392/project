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

// Every whole-array write in this file used to be a plain read → modify →
// write. That's unsafe: Vercel Blob's CDN can still be serving a stale,
// pre-write copy for a beat after some other write has already landed, and
// that's enough time for a caller here to read that stale copy, build its
// change on top of it, and write it straight back — silently reverting
// every lead added or changed in between, not just missing its own change.
// This re-reads fresh on every retry and confirms the result is what the
// store now actually holds before returning, so a stale read never gets
// the final say.
async function writeSafely(mutate, verify) {
  let lastError = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, 80 * attempt + Math.random() * 120));
    }
    const leads = await readAll();
    const { next, result } = mutate(leads);
    try {
      await writeAll(next);
      const after = await readAll();
      if (verify(after, result)) return result;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error("Didn't save, please try again");
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
  return writeSafely(
    (leads) => {
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
      return { next: [...leads, lead], result: lead };
    },
    (after, lead) => after.some((l) => l.id === lead.id)
  );
}

export async function updateLead(id, patch) {
  try {
    return await writeSafely(
      (leads) => {
        const idx = leads.findIndex((l) => String(l.id) === String(id));
        if (idx === -1) return { next: leads, result: null };
        let p = patch;
        if (p.phone !== undefined) p = { ...p, phone: formatPhone(p.phone) || p.phone };
        const updated = { ...leads[idx], ...p, updated_at: new Date().toISOString() };
        const next = [...leads];
        next[idx] = updated;
        return { next, result: updated };
      },
      (after, updated) => (updated === null ? true : after.some((l) => String(l.id) === String(id) && l.updated_at === updated.updated_at))
    );
  } catch {
    return null;
  }
}

// Safely applies a change to a lead under concurrent writers — e.g. two
// documents uploaded through the same client link seconds apart. A plain
// read-modify-write can silently drop one of them (both read the same
// "before" state, both write their own version of "after", second write
// wins and erases the first). This re-reads fresh on every attempt and
// verifies its own change actually stuck before returning, retrying if
// another writer raced it in between.
export async function updateLeadSafely(id, mutate, verify) {
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) {
      // Jittered backoff so two callers that just collided don't retry in
      // lockstep and collide again on the next attempt. Kept short — each
      // attempt already pays writeJson's own durability wait, so a long
      // backoff on top compounds into a very slow request under real
      // contention instead of a quick, bounded retry.
      await new Promise((r) => setTimeout(r, 80 * attempt + Math.random() * 120));
    }
    const leads = await readAll();
    const idx = leads.findIndex((l) => String(l.id) === String(id));
    if (idx === -1) return null;
    // A prior attempt's write can land durably even when that attempt's own
    // verification read raced a concurrent writer and looked like it
    // failed. If the desired end state is already true, stop here instead
    // of writing (and re-applying mutate's change) again.
    if (verify(leads[idx])) return leads[idx];
    let patch = mutate(leads[idx]);
    if (patch.phone !== undefined) patch = { ...patch, phone: formatPhone(patch.phone) || patch.phone };
    leads[idx] = { ...leads[idx], ...patch, updated_at: new Date().toISOString() };
    await writeAll(leads);
    const after = await readAll();
    const final = after.find((l) => String(l.id) === String(id));
    if (final && verify(final)) return final;
  }
  return null;
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
  const updated = await updateLeadSafely(
    id,
    (current) => (current.doc_token ? {} : { doc_token: token }),
    (finalLead) => !!finalLead.doc_token
  );
  // A concurrent call (e.g. the Documents tab loading at the same moment a
  // quotation is being sent) can win the write instead of this one — return
  // whichever token actually ended up persisted, so every caller converges
  // on the same value rather than a stale, orphaned one.
  return updated?.doc_token || token;
}

export async function deleteLead(id) {
  try {
    return await writeSafely(
      (leads) => {
        const next = leads.filter((l) => String(l.id) !== String(id));
        return { next, result: next.length !== leads.length };
      },
      (after) => !after.some((l) => String(l.id) === String(id))
    );
  } catch {
    return false;
  }
}

// Merge-insert leads coming from the website (Formidable Forms), skipping
// anything already imported (matched by frm_item_id).
export async function importWebsiteLeads(newLeads) {
  const result = await writeSafely(
    (leads) => {
      const existingFrmIds = new Set(leads.filter((l) => l.frm_item_id).map((l) => l.frm_item_id));
      const additions = [];
      let imported = 0;
      for (const raw of newLeads) {
        if (raw.frm_item_id && existingFrmIds.has(raw.frm_item_id)) continue;
        const numericId = nextId(leads) + imported;
        additions.push({
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
      const next = additions.length > 0 ? [...leads, ...additions] : leads;
      return { next, result: { scanned: newLeads.length, imported, addedIds: additions.map((a) => a.id) } };
    },
    (after, result) => result.addedIds.every((id) => after.some((l) => l.id === id))
  );
  return { scanned: result.scanned, imported: result.imported };
}
