import { readJson, writeJson } from "./blobStore";
import { formatPhone } from "./formatPhone";

const PHONE_FIELDS = ["phone", "contractor_phone"];
function normalizePhones(obj) {
  const out = { ...obj };
  for (const key of PHONE_FIELDS) {
    if (out[key]) out[key] = formatPhone(out[key]) || out[key];
  }
  if (out.homeowner?.phone) out.homeowner = { ...out.homeowner, phone: formatPhone(out.homeowner.phone) || out.homeowner.phone };
  return out;
}

const BLOB_KEY = "projects.json";
const STARTING_NUMBER = 1001;

async function readAll() {
  return readJson(BLOB_KEY);
}

async function writeAll(projects) {
  await writeJson(BLOB_KEY, projects);
}

// Same race this store used to be exposed to as leads.json before it caused
// real data loss there: Vercel Blob's CDN can still serve a stale copy for a
// beat after another write lands, and a plain read-modify-write built on
// that stale copy silently reverts everything written in between. Every
// write here re-reads fresh on retry and confirms the result actually
// landed before returning.
async function writeSafely(mutate, verify) {
  let lastError = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, 80 * attempt + Math.random() * 120));
    }
    const projects = await readAll();
    const { next, result } = mutate(projects);
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

export async function getProjects() {
  const projects = await readAll();
  return projects.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

export async function getProject(id) {
  const projects = await readAll();
  return projects.find((p) => p.id === id) || null;
}

export async function getProjectByLead(leadId) {
  const projects = await readAll();
  return projects.find((p) => p.lead_id === leadId) || null;
}

export async function createProject(data) {
  data = normalizePhones(data);
  return writeSafely(
    (projects) => {
      const number = STARTING_NUMBER + projects.length;
      const now = new Date().toISOString();
      const project = {
        id: `proj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        number: `PRJ-${number}`,
        project_name: data.project_name || "",

        // Customer / Contractor — same person in this workflow.
        first_name: data.first_name || "",
        last_name: data.last_name || "",
        phone: data.phone || "",
        email: data.email || "",
        company_name: data.company_name || "",
        license_number: data.license_number || "",

        // Homeowner
        homeowner: data.homeowner || { same_as_customer: false, first_name: "", last_name: "", phone: "", email: "" },

        // Property
        property: data.property || { street: "", city: "", state: "", zip: "", county: "" },
        property_address: data.property_address || "",

        // Work Info
        type_of_work: data.type_of_work || "",
        permit_type: data.permit_type || "",
        work_description: data.work_description || "",
        scope_of_work: data.scope_of_work || "",
        job_value: data.job_value || "",

        // Project Management
        status: data.status || "new",
        assigned_to: data.assigned_to || "",

        // Links back to where this project came from
        lead_id: data.lead_id || null,
        quote_id: data.quote_id || null,
        quote_number: data.quote_number || "",

        // Carried over from the Lead at creation time
        documents: Array.isArray(data.documents) ? data.documents : [],
        files: [],
        permits: [],
        messages: [],
        activity: Array.isArray(data.activity) ? data.activity : [],

        notes: data.notes || "",
        created_at: now,
        updated_at: now,
      };
      return { next: [...projects, project], result: project };
    },
    (after, project) => after.some((p) => p.id === project.id)
  );
}

export async function updateProject(id, patch) {
  patch = normalizePhones(patch);
  try {
    return await writeSafely(
      (projects) => {
        const idx = projects.findIndex((p) => p.id === id);
        if (idx === -1) return { next: projects, result: null };
        const updated = { ...projects[idx], ...patch, updated_at: new Date().toISOString() };
        const next = [...projects];
        next[idx] = updated;
        return { next, result: updated };
      },
      (after, updated) => (updated === null ? true : after.some((p) => p.id === id && p.updated_at === updated.updated_at))
    );
  } catch {
    return null;
  }
}

export async function deleteProject(id) {
  try {
    return await writeSafely(
      (projects) => {
        const next = projects.filter((p) => p.id !== id);
        return { next, result: next.length !== projects.length };
      },
      (after) => !after.some((p) => p.id === id)
    );
  } catch {
    return false;
  }
}
