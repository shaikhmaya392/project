"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PRIORITIES, NEXT_ACTIONS, statusLabel } from "../../lib/leadMeta";
import Select from "../Select";

function fmtDate(s) {
  if (!s) return "-";

  const d = new Date(s);
  const pad = (n) => String(n).padStart(2, "0");

  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()}`;
}

export default function LeadsPage() {
  const [leads, setLeads] = useState([]);
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");

  function load() {
    setLoading(true);
    setError(null);

    fetch("/api/leads")
      .then(async (res) => {
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to load leads");
        }

        setLeads(Array.isArray(data) ? data : []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

    fetch("/api/team")
      .then((r) => r.json())
      .then((d) => setTeam(Array.isArray(d) ? d : []))
      .catch(() => {});
  }

  useEffect(() => {
    load();
  }, []);

  // Inline edits on the list write straight through, so the same value shows
  // on the lead detail page and the dashboard.
  async function patchField(leadId, field, value) {
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, [field]: value } : l))
    );

    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });

      if (!res.ok) {
        throw new Error(`Failed to update ${field}`);
      }
    } catch (err) {
      console.error(err);
    }
  }

  const filtered = useMemo(() => {
    if (!query.trim()) {
      return leads;
    }

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
        </div>

        <Link href="/leads/new" className="btn gold">
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
            placeholder="Search business, person, email or phone..."
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
          <div className="table-scroll">
            <table style={{ minWidth: 1260 }}>
              <colgroup>
                <col style={{ width: 110 }} />
                <col style={{ width: 130 }} />
                <col style={{ width: 190 }} />
                <col style={{ width: 110 }} />
                <col style={{ width: 130 }} />
                <col style={{ width: 170 }} />
                <col style={{ width: 150 }} />
                <col style={{ width: 110 }} />
                <col style={{ width: 170 }} />
              </colgroup>

              <thead>
                <tr>
                  <th>Date</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Work Location</th>
                  <th>Status</th>
                  <th>Assigned To</th>
                  <th>Priority</th>
                  <th>Next Action</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((lead) => (
                  <tr
                    key={lead.id}
                    onClick={() => (window.location.href = `/leads/${lead.id}`)}
                  >
                    {/* DATE */}
                    <td>{fmtDate(lead.created_at)}</td>

                    {/* NAME */}
                    <td className="name-primary">{lead.name || "(no name)"}</td>

                    {/* EMAIL */}
                    <td>
                      {lead.email ? (
                        <a
                          href={`mailto:${lead.email}`}
                          onClick={(e) => e.stopPropagation()}
                          className="contact-email"
                        >
                          {lead.email}
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M7 17L17 7M8 7h9v9" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>

                    {/* PHONE */}
                    <td>{lead.phone || "-"}</td>

                    {/* WORK LOCATION */}
                    <td>{lead.address || "-"}</td>

                    {/* STATUS — read-only here; changed from the lead's own page */}
                    <td onClick={(e) => e.stopPropagation()}>
                      <span className={`badge status-${lead.status || "new"}`}>{statusLabel(lead.status || "new")}</span>
                    </td>

                    {/* ASSIGNED TO */}
                    <td onClick={(e) => e.stopPropagation()}>
                      <Select
                        className="compact"
                        value={lead.assigned_to || ""}
                        onChange={(v) => patchField(lead.id, "assigned_to", v)}
                        options={[
                          { value: "", label: "Unassigned" },
                          ...team.map((t) => ({ value: t.name, label: t.name })),
                          ...(lead.assigned_to && !team.some((t) => t.name === lead.assigned_to) ? [{ value: lead.assigned_to, label: lead.assigned_to }] : []),
                        ]}
                      />
                    </td>

                    {/* PRIORITY */}
                    <td onClick={(e) => e.stopPropagation()}>
                      <Select
                        className="compact"
                        value={lead.priority || "Medium"}
                        onChange={(v) => patchField(lead.id, "priority", v)}
                        options={PRIORITIES}
                      />
                    </td>

                    {/* NEXT ACTION */}
                    <td onClick={(e) => e.stopPropagation()}>
                      <Select
                        className="compact"
                        value={lead.next_action || ""}
                        onChange={(v) => patchField(lead.id, "next_action", v)}
                        placeholder="Select Action"
                        options={[
                          ...NEXT_ACTIONS.map((a) => ({ value: a, label: a })),
                          ...(lead.next_action && !NEXT_ACTIONS.includes(lead.next_action) ? [{ value: lead.next_action, label: lead.next_action }] : []),
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
