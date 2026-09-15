"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STATUSES = ["new", "contacted", "in_progress", "won", "lost"];

export default function PipelinePage() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("/api/leads")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load leads");
        setLeads(Array.isArray(data) ? data : []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Pipeline</h2>
          <p className="subtitle">Every lead grouped by where it stands. Click a card to open it.</p>
        </div>
        <Link href="/leads/new" className="btn">
          + New Lead
        </Link>
      </div>

      {error && <div className="error-banner">Couldn&apos;t load leads: {error}</div>}

      {loading ? (
        <p style={{ color: "var(--muted)" }}>Loading...</p>
      ) : (
        <div className="kanban">
          {STATUSES.map((status) => {
            const items = leads.filter((l) => (l.status || "new") === status);
            return (
              <div className="kanban-col" key={status}>
                <div className="kanban-col-header">
                  {status.replace("_", " ")}
                  <span className="count">{items.length}</span>
                </div>
                {items.length === 0 ? (
                  <p style={{ color: "var(--muted-soft)", fontSize: 12, padding: "0 4px" }}>No leads here</p>
                ) : (
                  items.map((lead) => (
                    <Link key={lead.id} href={`/leads/${lead.id}`} className="kanban-card">
                      <div className="kc-name">{lead.name || "(no name)"}</div>
                      <div className="kc-meta">{lead.service_type || lead.phone || lead.email || "-"}</div>
                    </Link>
                  ))
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
