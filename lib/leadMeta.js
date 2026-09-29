// Single source of truth for lead pipeline vocabulary, shared by the leads
// list, the lead detail page, the dashboard and the API routes so every
// dropdown and badge reads the same labels.
export const STATUS_LABELS = {
  new: "New",
  contacted: "Contacted",
  in_progress: "In Progress",
  quote_sent: "Quotation Sent",
  quote_accepted: "Quotation Accepted",
};
export const STATUSES = Object.keys(STATUS_LABELS);

export const PRIORITIES = ["High", "Medium", "Low"];

export const NEXT_ACTIONS = [
  "Follow Up",
  "Call Back",
  "Send Email",
  "Send Quote",
  "Schedule Meeting",
  "Waiting for Client",
  "Check In",
  "Schedule Inspection",
  "Review Corrections",
  "No Action",
];

// The four document categories a client is asked to upload on their
// document-request link, shared by that public page and the lead's
// Documents tab (so an uploaded file's category badge reads the same
// label everywhere).
export const DOCUMENT_CATEGORIES = [
  "Photo ID",
  "Proof of Property Ownership",
  "Site Plan / Survey",
  "Additional Supporting Documents",
];

export const PROJECT_TYPES = [
  "Residential Renovation", "Commercial", "Window / Door", "Solar Panels",
  "Shutters", "Sign Permit", "Office Remodel", "Permit Renewal", "Code Violation",
];

// The actual permit being applied for — distinct from PROJECT_TYPES, which
// is the kind of job (used for "Type of Work").
export const PERMIT_TYPES = [
  "Building Permit", "Roofing Permit", "Electrical Permit", "Plumbing Permit",
  "Mechanical Permit", "HVAC Permit", "Demolition Permit", "Fence Permit",
  "Pool Permit", "Solar Permit", "Sign Permit", "Window / Door Permit",
];

export const LEAD_SOURCES = [
  "Website", "Manual", "Referral", "Phone Call", "Walk-in", "Repeat Client", "Other",
];

export function statusLabel(s) {
  return STATUS_LABELS[s] || String(s || "new").replace(/_/g, " ");
}
