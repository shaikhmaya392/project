"use client";

import { useEffect, useState } from "react";

/* Icons for the six pipeline cards (match the dashboard mockup) */
const ICONS = {
  document: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 3v5h5M9 13h6M9 17h4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  clock: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.5 2.5L16 9.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  upload: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 15V4M8 8l4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 15v3a2 2 0 002 2h10a2 2 0 002-2v-3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  warning: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3.5L2.5 20h19L12 3.5z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 10v4M12 17.5v.01" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  calendar: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 3v4M16 3v4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

export default function DashboardPage() {
  const [leads, setLeads] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/leads").then((r) => r.json()).catch(() => []),
      fetch("/api/quotations").then((r) => r.json()).catch(() => []),
      fetch("/api/projects").then((r) => r.json()).catch(() => []),
    ])
      .then(([l, q, p]) => {
        if (l && l.error) throw new Error(l.error);
        setLeads(Array.isArray(l) ? l : []);
        setQuotes(Array.isArray(q) ? q : []);
        setProjects(Array.isArray(p) ? p : []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const total = leads.length;
  const fromWebsite = leads.filter((l) => l.source === "website_form").length;
  const byStatus = (st) => leads.filter((l) => (l.status || "new") === st).length;
  const byNextAction = (a) => leads.filter((l) => l.next_action === a).length;

  // Live pipeline metrics — derived from real CRM data, refreshed on every load.
  // Statuses match lib/leadMeta so these agree with the leads list and detail page.
  // Approved counts leads marked "Quotation Accepted" plus any older accepted
  // quotes whose lead was never moved to that status.
  const acceptedLeadIds = new Set(quotes.filter((q) => q.status === "accepted" && q.lead_id).map((q) => q.lead_id));
  leads.forEach((l) => { if (l.status === "quote_accepted") acceptedLeadIds.add(l.id); });
  const cards = [
    { key: "new", label: "New Requests", value: byStatus("new"), icon: "document", color: "blue" },
    { key: "pending", label: "Pending Review", value: byStatus("contacted") + byStatus("quote_sent"), icon: "clock", color: "orange" },
    { key: "approved", label: "Approved", value: acceptedLeadIds.size, icon: "check", color: "green" },
    { key: "ready", label: "Ready to Submit", value: byStatus("in_progress"), icon: "upload", color: "purple" },
    { key: "corrections", label: "Corrections Required", value: byNextAction("Review Corrections"), icon: "warning", color: "red" },
    { key: "inspections", label: "Upcoming Inspections", value: projects.length + byNextAction("Schedule Inspection"), icon: "calendar", color: "cyan" },
  ];

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="dashboard">
      <h1 className="dash-greeting">{today}</h1>
      <p className="dash-sub">
        {loading ? "Loading your workspace…" : `${total} total leads · ${fromWebsite} from the website`}
      </p>

      {error && <div className="error-banner">Couldn&apos;t load data: {error}</div>}

      <div className="dash-grid">
        {cards.map((c) => (
          <div className="dash-card" key={c.key}>
            <div className="dash-card-top">
              <span className="dash-card-label">{c.label}</span>
              <span className={`dash-icon ${c.color}`}>{ICONS[c.icon]}</span>
            </div>
            <div className="dash-card-value">{loading ? "—" : c.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
