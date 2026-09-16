"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

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
  const [quotationsByLead, setQuotationsByLead] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [messagePreview, setMessagePreview] = useState(null);

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

    fetch("/api/quotations")
      .then((res) => res.json())
      .then((data) => {
        if (!Array.isArray(data)) return;
        const map = {};
        for (const q of data) {
          if (!q.lead_id) continue;
          if (!map[q.lead_id]) map[q.lead_id] = q;
        }
        setQuotationsByLead(map);
      })
      .catch(() => {});
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
    if (!query.trim()) return leads;
    const q = query.toLowerCase();
    return leads.filter(
      (lead) =>
        (lead.name || "").toLowerCase().includes(q) ||
        (lead.email || "").toLowerCase().includes(q) ||
        (lead.phone || "").toLowerCase().includes(q) ||
        (lead.address || "").toLowerCase().includes(q)
    );
  }, [leads, query]);

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

      {error && <div className="error-banner">Couldn&apos;t load leads: {error}</div>}

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
      </div>

      {loading ? (
        <p style={{ color: "var(--muted)" }}>Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="table-wrap">
          <div className="empty-state">
            <div className="big">No leads found</div>
            {leads.length === 0
              ? 'Waiting on leads from the website, or add one with "+ New Lead".'
              : "Try clearing your search."}
          </div>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <colgroup>
              <col style={{ width: "17%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "17%" }} />
              <col style={{ width: "15%" }} />
              <col style={{ width: "17%" }} />
              <col style={{ width: "132px" }} />
            </colgroup>
            <thead>
              <tr>
                <th>Name</th>
                <th>Date</th>
                <th>Phone</th>
                <th>Email Address</th>
                <th>Where Is The Work Located?</th>
                <th>Message</th>
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
                        {quotationsByLead[lead.id] && (
                          <span className={`quote-flag ${quotationsByLead[lead.id].status === "accepted" ? "accepted" : ""}`}>
                            {quotationsByLead[lead.id].status === "accepted" ? "Quotation accepted" : "Quotation sent"}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="source-tag">
                    {lead.created_at ? new Date(lead.created_at).toLocaleDateString() : "-"}
                  </td>
                  <td>{lead.phone || "-"}</td>
                  <td className="source-tag">{lead.email || "-"}</td>
                  <td>{lead.address || "-"}</td>
                  <td>
                    {lead.message ? (
                      <button
                        type="button"
                        className="message-preview-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMessagePreview(lead);
                        }}
                      >
                        {lead.message.length > 28 ? `${lead.message.slice(0, 28)}...` : lead.message}
                      </button>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td>
                    <div className="row-actions">
                      {lead.phone && (
                        <a
                          href={`tel:${lead.phone}`}
                          className="icon-btn"
                          title={`Call ${lead.phone}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M4 4h4l2 5-2.5 1.5a11 11 0 005 5L14 13l5 2v4a2 2 0 01-2 2A16 16 0 014 6a2 2 0 012-2z" />
                          </svg>
                        </a>
                      )}
                      <Link
                        href={`/leads/${lead.id}/quotation`}
                        className="icon-btn"
                        title="Send Quotation"
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

      {messagePreview && (
        <div className="msg-backdrop" onClick={() => setMessagePreview(null)}>
          <div className="msg-modal" onClick={(e) => e.stopPropagation()}>
            <div className="panel-title">
              Message from {messagePreview.name || "lead"}
              <button type="button" className="icon-btn" onClick={() => setMessagePreview(null)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="message-block">{messagePreview.message}</div>
          </div>
        </div>
      )}
    </div>
  );
}
