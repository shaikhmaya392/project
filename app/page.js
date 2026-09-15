"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STATUS_ORDER = ["new", "contacted", "in_progress", "won", "lost"];

function initials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export default function DashboardPage() {
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

  const total = leads.length;
  const byStatus = STATUS_ORDER.reduce((acc, s) => {
    acc[s] = leads.filter((l) => (l.status || "new") === s).length;
    return acc;
  }, {});
  const fromWebsite = leads.filter((l) => l.source === "website_form").length;
  const fromManual = total - fromWebsite;
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const thisWeek = leads.filter((l) => new Date(l.created_at).getTime() > weekAgo).length;
  const maxStatus = Math.max(1, ...STATUS_ORDER.map((s) => byStatus[s]));
  const recent = leads.slice(0, 6);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Dashboard</h2>
          <p className="subtitle">Overview of every lead coming in from dspermitting.com and manual entries.</p>
        </div>
        <Link href="/leads/new" className="btn">
          + New Lead
        </Link>
      </div>

      {error && (
        <div className="error-banner">
          Leads load nahi ho sake: {error}
        </div>
      )}

      <div className="stat-grid">
        <div className="stat-card accent">
          <div className="stat-label">Total Leads</div>
          <div className="stat-value">{loading ? "-" : total}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">New this week</div>
          <div className="stat-value">{loading ? "-" : thisWeek}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">From Website</div>
          <div className="stat-value">{loading ? "-" : fromWebsite}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Manually Added</div>
          <div className="stat-value">{loading ? "-" : fromManual}</div>
        </div>
      </div>

      <div className="two-col">
        <div className="card">
          <h3 className="panel-title">Pipeline breakdown</h3>
          {STATUS_ORDER.map((s) => (
            <div className="bar-row" key={s}>
              <span className="bar-label">{s.replace("_", " ")}</span>
              <span className="bar-track">
                <span
                  className="bar-fill"
                  style={{ width: `${((byStatus[s] || 0) / maxStatus) * 100}%` }}
                />
              </span>
              <span className="bar-count">{byStatus[s] || 0}</span>
            </div>
          ))}
        </div>

        <div className="card">
          <h3 className="panel-title">
            Recent leads
            <Link href="/leads" className="btn ghost" style={{ padding: 0, fontSize: 12.5 }}>
              View all &rarr;
            </Link>
          </h3>
          {loading ? (
            <p style={{ color: "var(--muted)" }}>Loading...</p>
          ) : recent.length === 0 ? (
            <div className="empty-state">
              <div className="big">Abhi koi lead nahi hai</div>
              Website se sync hone ya manually add karne par yahan dikhega.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {recent.map((lead) => (
                <Link
                  key={lead.id}
                  href={`/leads/${lead.id}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 8px",
                    borderRadius: 10,
                    textDecoration: "none",
                  }}
                  className="lead-row"
                >
                  <div className="avatar">{initials(lead.name)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="name-primary" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {lead.name || "(no name)"}
                    </div>
                    <div className="name-secondary">{lead.service_type || lead.phone || lead.email || "-"}</div>
                  </div>
                  <span className={`badge status-${lead.status || "new"}`}>{(lead.status || "new").replace("_", " ")}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
