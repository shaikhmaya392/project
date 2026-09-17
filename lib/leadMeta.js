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

export const PROJECT_TYPES = [
  "Residential Renovation", "Commercial", "Window / Door", "Solar Panels",
  "Shutters", "Sign Permit", "Office Remodel", "Permit Renewal", "Code Violation",
];

export function statusLabel(s) {
  return STATUS_LABELS[s] || String(s || "new").replace(/_/g, " ");
}
