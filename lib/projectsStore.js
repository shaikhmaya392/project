import crypto from "crypto";
import { readJson, writeJson } from "./blobStore";
import { formatPhone } from "./formatPhone";

const PHONE_FIELDS = ["client_phone", "homeowner_phone", "contractor_phone"];
function normalizePhones(obj) {
  const out = { ...obj };
  for (const key of PHONE_FIELDS) {
    if (out[key]) out[key] = formatPhone(out[key]) || out[key];
  }
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

export async function getProjects() {
  const projects = await readAll();
  return projects.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

export async function getProject(id) {
  const projects = await readAll();
  return projects.find((p) => p.id === id) || null;
}

export async function createProject(data) {
  data = normalizePhones(data);
  const projects = await readAll();
  const number = STARTING_NUMBER + projects.length;
  const now = new Date().toISOString();
  const project = {
    id: `proj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    number: `PRJ-${number}`,
    project_name: data.project_name || "",
    property_address: data.property_address || "",
    client_name: data.client_name || "",
    client_email: data.client_email || "",
    client_phone: data.client_phone || "",
    homeowner_name: data.homeowner_name || "",
    homeowner_phone: data.homeowner_phone || "",
    contractor_name: data.contractor_name || "",
    contractor_license: data.contractor_license || "",
    contractor_phone: data.contractor_phone || "",
    scope_of_work: data.scope_of_work || "",
    job_value: data.job_value || "",
    assigned_to: data.assigned_to || "",
    status: data.status || "active",
    notes: data.notes || "",
    lead_id: data.lead_id || null,
    created_at: now,
    updated_at: now,
  };
  projects.push(project);
  await writeAll(projects);
  return project;
}

export async function updateProject(id, patch) {
  patch = normalizePhones(patch);
  const projects = await readAll();
  const idx = projects.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  projects[idx] = { ...projects[idx], ...patch, updated_at: new Date().toISOString() };
  await writeAll(projects);
  return projects[idx];
}

export async function deleteProject(id) {
  const projects = await readAll();
  const filtered = projects.filter((p) => p.id !== id);
  await writeAll(filtered);
  return filtered.length !== projects.length;
}
