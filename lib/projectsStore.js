import { formatPhone } from "./formatPhone";
import { allDocs, getDoc, findDoc, insertDoc, replaceDoc, deleteDoc, countDocs } from "./db";

const TABLE = "projects";
const STARTING_NUMBER = 1001;

function normalizePhones(obj) {
  const out = { ...obj };
  if (out.phone) out.phone = formatPhone(out.phone) || out.phone;
  if (out.contractor_phone) out.contractor_phone = formatPhone(out.contractor_phone) || out.contractor_phone;
  if (out.homeowner?.phone) out.homeowner = { ...out.homeowner, phone: formatPhone(out.homeowner.phone) || out.homeowner.phone };
  return out;
}

export async function getProjects() {
  return allDocs(TABLE, "created_at", "DESC");
}

export async function getProject(id) {
  return getDoc(TABLE, id);
}

export async function getProjectByLead(leadId) {
  return findDoc(TABLE, "lead_id", leadId);
}

export async function createProject(data) {
  data = normalizePhones(data);
  const number = STARTING_NUMBER + (await countDocs(TABLE));
  const now = new Date().toISOString();
  const project = {
    id: `proj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    number: `PRJ-${number}`,
    project_name: data.project_name || "",

    first_name: data.first_name || "",
    last_name: data.last_name || "",
    phone: data.phone || "",
    email: data.email || "",
    company_name: data.company_name || "",
    license_number: data.license_number || "",

    homeowner: data.homeowner || { same_as_customer: false, first_name: "", last_name: "", phone: "", email: "" },

    property: data.property || { street: "", city: "", state: "", zip: "", county: "" },
    property_address: data.property_address || "",

    type_of_work: data.type_of_work || "",
    permit_type: data.permit_type || "",
    work_description: data.work_description || "",
    scope_of_work: data.scope_of_work || "",
    job_value: data.job_value || "",

    status: data.status || "new",
    assigned_to: data.assigned_to || "",

    lead_id: data.lead_id || null,
    quote_id: data.quote_id || null,
    quote_number: data.quote_number || "",

    documents: Array.isArray(data.documents) ? data.documents : [],
    files: [],
    permits: [],
    messages: [],
    activity: Array.isArray(data.activity) ? data.activity : [],

    notes: data.notes || "",
    created_at: now,
    updated_at: now,
  };
  return insertDoc(TABLE, project);
}

export async function updateProject(id, patch) {
  const project = await getProject(id);
  if (!project) return null;
  patch = normalizePhones(patch);
  const updated = { ...project, ...patch, updated_at: new Date().toISOString() };
  return replaceDoc(TABLE, updated);
}

export async function deleteProject(id) {
  return deleteDoc(TABLE, id);
}
