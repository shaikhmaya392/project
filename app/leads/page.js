"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

const STATUSES = ["all", "new", "contacted", "in_progress", "won", "lost"];

function initials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export default function LeadsPage() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");

  function loadLeads() {
    setLoading(true);
    setError(null);
    fetch("/api/leads")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load leads");
        setLeads(Array.isArray(data) ? data : []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadLeads();
  }, []);

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
        <Link href="/leads/new" className="btn">
          + New Lead
        </Link>
      </div>

      {error && (
        <div className="error-banner">
          Couldn&apos;t load leads: {error}
        </div>
      )}

      <div className="toolbar">
        <div className="search-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
          </svg>
          <input
            placeholder="Search by name, phone, email, or address..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="filter-pills">
          {STATUSES.map((s) => (
            <button
              key={s}
              className={`pill${status === s ? " active" : ""}`}
              onClick={() => setStatus(s)}
              type="button"
            >
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
            {leads.length === 0
              ? 'Waiting on leads from the website, or add one with "+ New Lead".'
              : "Try clearing your search or filters."}
          </div>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Lead</th>
                <th>Contact</th>
                <th>Service</th>
                <th>Source</th>
                <th>Status</th>
                <th>Received</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead) => (
                <tr key={lead.id} onClick={() => (window.location.href = `/leads/${lead.id}`)}>
                  <td>
                    <div className="name-cell">
                      <div className="avatar">{initials(lead.name)}</div>
                      <div>
                        <div className="name-primary">{lead.name || "(no name)"}</div>
                        {lead.address && <div className="name-secondary">{lead.address}</div>}
                      </div>
                    </div>
                  </td>
                  <td>
                    {lead.phone || "-"}
                    <br />
                    <span className="source-tag">{lead.email}</span>
                  </td>
                  <td>{lead.service_type || "-"}</td>
                  <td>
                    {lead.source === "website_form" ? (
                      <span className="source-chip website">
                        <span className="dot" /> {lead.form_name || "Website"}
                      </span>
                    ) : (
                      <span className="source-chip manual">
                        <span className="dot" /> Manual
                      </span>
                    )}
                  </td>
                  <td>
                    <span className={`badge status-${lead.status || "new"}`}>{(lead.status || "new").replace("_", " ")}</span>
                  </td>
                  <td className="source-tag">
                    {lead.created_at ? new Date(lead.created_at).toLocaleDateString() : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
