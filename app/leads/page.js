"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { NEXT_ACTIONS, statusLabel } from "../../lib/leadMeta";
import Select from "../Select";

function fmtDate(s) {
  if (!s) return "-";

  const d = new Date(s);
  const pad = (n) => String(n).padStart(2, "0");

  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()}`;
}

const PAGE_SIZES = [10, 25, 50, 100];

export default function LeadsPage() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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

  // Reset back to page 1 whenever the search or page size changes, so we
  // never land on an out-of-range page with nothing to show.
  useEffect(() => { setPage(1); }, [query, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const pageEnd = Math.min(safePage * pageSize, filtered.length);
  const paginated = useMemo(
    () => filtered.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filtered, safePage, pageSize]
  );

  // A short window of page numbers around the current page, capped at 5.
  const pageWindow = useMemo(() => {
    const span = 5;
    let start = Math.max(1, safePage - Math.floor(span / 2));
    let end = Math.min(totalPages, start + span - 1);
    start = Math.max(1, end - span + 1);
    const nums = [];
    for (let i = start; i <= end; i++) nums.push(i);
    return nums;
  }, [safePage, totalPages]);

  return (
    <div>
      <div className="page-header">
        <div>

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
            <table style={{ minWidth: 1010 }}>
              <colgroup>
                <col style={{ width: 110 }} />
                <col style={{ width: 130 }} />
                <col style={{ width: 190 }} />
                <col style={{ width: 110 }} />
                <col style={{ width: 130 }} />
                <col style={{ width: 170 }} />
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
                  <th>Next Action</th>
                </tr>
              </thead>

              <tbody>
                {paginated.map((lead) => (
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

          <div className="pg-bar">
            <span className="pg-count">
              Showing <b>{pageStart}-{pageEnd}</b> of <b>{filtered.length}</b> leads
            </span>

            <div className="pg-pages">
              <button type="button" className="pg-arrow" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1} title="Previous page">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              {pageWindow[0] > 1 && <span className="pg-ellipsis">…</span>}
              {pageWindow.map((n) => (
                <button type="button" key={n} className={`pg-num${n === safePage ? " active" : ""}`} onClick={() => setPage(n)}>{n}</button>
              ))}
              {pageWindow[pageWindow.length - 1] < totalPages && <span className="pg-ellipsis">…</span>}
              <button type="button" className="pg-arrow" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} title="Next page">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </div>

            <div className="pg-size">
              <span>Go to Page</span>
              <Select
                className="compact pg-size-select"
                value={pageSize}
                onChange={(v) => setPageSize(Number(v))}
                options={PAGE_SIZES.map((n) => ({ value: n, label: String(n) }))}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
