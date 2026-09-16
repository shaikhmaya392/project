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

  async function handleDelete(e, id) {
    e.stopPropagation();
    if (!confirm("Delete this lead permanently?")) return;
    const res = await fetch(`/api/leads/${id}`, { method: "DELETE" });
    if (res.ok) setLeads((prev) => prev.filter((l) => l.id !== id));
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
                <th></th>
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
                  <td>
                    <div className="row-actions">
                      <Link
                        href={`/leads/${lead.id}/permit`}
                        className="icon-btn"
                        title="Send Permit"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M14 3v6h6M9 13h6M9 17h6" strokeLinecap="round" />
                        </svg>
                      </Link>
                      <Link
                        href={`/leads/${lead.id}`}
                        className="icon-btn"
                        title="Edit"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 20h9" strokeLinecap="round" />
                          <path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </Link>
                      <button
                        type="button"
                        className="icon-btn danger"
                        title="Delete"
                        onClick={(e) => handleDelete(e, lead.id)}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0l-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </div>
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
