"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

const STATUS_FILTERS = ["all", "new", "contacted", "in_progress", "won", "lost"];

function fmtDate(s) {
  if (!s) return "-";
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function LeadsPage() {
  const [leads, setLeads] = useState([]);
  const [quoteByLead, setQuoteByLead] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");

  function load() {
    setLoading(true);
    fetch("/api/leads")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load leads");
        setLeads(Array.isArray(data) ? data : []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

    fetch("/api/quotations")
      .then((r) => r.json())
      .then((data) => {
        if (!Array.isArray(data)) return;
        const map = {};
        for (const q of data) {
          if (!q.lead_id) continue;
          if (!map[q.lead_id]) map[q.lead_id] = q;
        }
        setQuoteByLead(map);
      })
      .catch(() => {});
  }

  useEffect(() => {
    load();
  }, []);

  function statusFor(lead) {
    const q = quoteByLead[lead.id];
    if (q && q.status === "accepted") return { label: "Quote Accepted", cls: "status-won" };
    if (q) return { label: "Quote Sent", cls: "status-contacted" };
    const s = lead.status || "new";
    return { label: s.replace("_", " "), cls: `status-${s}` };
  }

  const filtered = useMemo(() => {
    return leads.filter((lead) => {
      if (status !== "all" && (lead.status || "new") !== status) return false;
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        (lead.name || "").toLowerCase().includes(q) ||
        (lead.email || "").toLowerCase().includes(q) ||
        (lead.phone || "").toLowerCase().includes(q) ||
        (lead.address || "").toLowerCase().includes(q) ||
        (lead.service_type || "").toLowerCase().includes(q)
      );
    });
  }, [leads, query, status]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Leads</h2>
          <p className="subtitle">{loading ? "Loading..." : `${filtered.length} of ${leads.length} leads`}</p>
        </div>
        <Link href="/leads/new" className="btn">+ New Lead</Link>
      </div>

      {error && <div className="error-banner">Couldn&apos;t load leads: {error}</div>}

      <div className="toolbar">
        <div className="search-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
          </svg>
          <input placeholder="Search business, person, email or phone..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="filter-pills">
          {STATUS_FILTERS.map((s) => (
            <button key={s} type="button" className={`pill${status === s ? " active" : ""}`} onClick={() => setStatus(s)}>
              {s === "all" ? "All" : s.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p style={{ color: "var(--muted)" }}>Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="table-wrap">
          <div className="empty-state">
            <div className="big">No leads found</div>
            {leads.length === 0 ? 'Waiting on leads from the website, or add one with "+ New Lead".' : "Try clearing your search."}
          </div>
        </div>
      ) : (
        <div className="table-wrap">
          <div className="table-scroll">
            <table style={{ minWidth: 1040 }}>
              <colgroup>
                <col style={{ width: 92 }} />
                <col style={{ width: 168 }} />
                <col style={{ width: 190 }} />
                <col style={{ width: 150 }} />
                <col style={{ width: 130 }} />
                <col style={{ width: 96 }} />
                <col style={{ width: 110 }} />
                <col style={{ width: 118 }} />
                <col style={{ width: 130 }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Lead</th>
                  <th>Contact</th>
                  <th>Work Location</th>
                  <th>Project Type</th>
                  <th>Source</th>
                  <th>Assigned To</th>
                  <th>Status</th>
                  <th>Next Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((lead) => {
                  const st = statusFor(lead);
                  return (
                    <tr key={lead.id} onClick={() => (window.location.href = `/leads/${lead.id}`)}>
                      <td className="source-tag">{fmtDate(lead.created_at)}</td>
                      <td className="name-primary">{lead.name || "(no name)"}</td>
                      <td>
                        <div>{lead.phone || "-"}</div>
                        {lead.email && (
                          <a href={`mailto:${lead.email}`} onClick={(e) => e.stopPropagation()} className="contact-email">
                            {lead.email}
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 17L17 7M8 7h9v9" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          </a>
                        )}
                      </td>
                      <td>{lead.address || "-"}</td>
                      <td>{lead.service_type || "-"}</td>
                      <td>
                        <span className={`source-chip ${lead.source === "website_form" ? "website" : "manual"}`}>
                          <span className="dot" /> {lead.source === "website_form" ? "Website" : "Manual"}
                        </span>
                      </td>
                      <td>{lead.assigned_to || <span className="source-tag">Unassigned</span>}</td>
                      <td><span className={`badge ${st.cls}`}>{st.label}</span></td>
                      <td>{lead.next_action ? lead.next_action : <span className="source-tag">—</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
