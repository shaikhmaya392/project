const BASE_URL = process.env.WORDPRESS_API_URL;
const API_KEY = process.env.WORDPRESS_API_KEY;

async function wpFetch(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
      ...(options.headers || {}),
    },
    cache: "no-store",
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const message = (data && (data.message || data.code)) || `WordPress API error (${res.status})`;
    throw new Error(message);
  }
  return data;
}

export function getLeads() {
  return wpFetch("/leads");
}

export function getLead(id) {
  return wpFetch(`/leads/${id}`);
}

export function createLead(payload) {
  return wpFetch("/leads", { method: "POST", body: JSON.stringify(payload) });
}

export function updateLead(id, payload) {
  return wpFetch(`/leads/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function deleteLead(id) {
  return wpFetch(`/leads/${id}`, { method: "DELETE" });
}

export function backfillLeads() {
  return wpFetch("/backfill", { method: "POST" });
}
