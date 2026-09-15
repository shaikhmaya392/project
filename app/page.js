"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STATUS_ORDER = ["new", "contacted", "in_progress", "won", "lost"];
const STATUS_COLORS = {
  new: "var(--blue)",
  contacted: "var(--amber)",
  in_progress: "var(--purple)",
  won: "var(--green)",
  lost: "var(--red)",
};

function initials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function daysAgo(dateStr) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (24 * 60 * 60 * 1000));
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
  const maxStatus = Math.max(1, ...STATUS_ORDER.map((s) => byStatus[s]));

  const now = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const thisWeek = leads.filter((l) => now - new Date(l.created_at).getTime() < weekMs).length;
  const lastWeek = leads.filter((l) => {
    const age = now - new Date(l.created_at).getTime();
    return age >= weekMs && age < weekMs * 2;
  }).length;
  const weekTrend = lastWeek === 0 ? (thisWeek > 0 ? 100 : 0) : Math.round(((thisWeek - lastWeek) / lastWeek) * 100);

  const won = byStatus.won || 0;
  const lost = byStatus.lost || 0;
  const closeRate = won + lost > 0 ? Math.round((won / (won + lost)) * 100) : 0;

  const fromWebsite = leads.filter((l) => l.source === "website_form").length;

  const needsAttention = leads
    .filter((l) => (l.status || "new") === "new" && daysAgo(l.created_at) >= 2)
    .slice(0, 5);

  const recent = [...leads].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)).slice(0, 6);

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>{today}</h2>
          <p className="subtitle">
            {loading ? "Loading..." : `${total} total leads · ${fromWebsite} from the website`}
          </p>
        </div>
        <Link href="/leads/new" className="btn">
          + New Lead
        </Link>
      </div>

      {error && <div className="error-banner">Couldn&apos;t load leads: {error}</div>}

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Total Leads</div>
          <div className="stat-value">{loading ? "-" : total}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">New This Week</div>
          <div className="stat-value">{loading ? "-" : thisWeek}</div>
          {!loading && (
            <span className={`stat-trend ${weekTrend > 0 ? "up" : weekTrend < 0 ? "down" : "flat"}`}>
              {weekTrend > 0 ? "↑" : weekTrend < 0 ? "↓" : "→"} {Math.abs(weekTrend)}% vs last week
            </span>
          )}
        </div>
        <div className="stat-card">
          <div className="stat-label">Needs Follow-up</div>
          <div className="stat-value">{loading ? "-" : needsAttention.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Close Rate</div>
          <div className="stat-value">{loading ? "-" : `${closeRate}%`}</div>
        </div>
      </div>

      <div className="two-col">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card">
            <h3 className="panel-title">Pipeline by Stage</h3>
            {STATUS_ORDER.map((s) => (
              <div className="bar-row" key={s}>
                <span className="bar-label">{s.replace("_", " ")}</span>
                <span className="bar-track">
                  <span
                    className="bar-fill"
                    style={{ width: `${((byStatus[s] || 0) / maxStatus) * 100}%`, background: STATUS_COLORS[s] }}
                  />
                </span>
                <span className="bar-count">{byStatus[s] || 0}</span>
              </div>
            ))}
          </div>

          <div className="card">
            <h3 className="panel-title">Needs Attention</h3>
            {needsAttention.length === 0 ? (
              <p style={{ color: "var(--muted)", fontSize: 13 }}>Nothing untouched right now. Nice work.</p>
            ) : (
              needsAttention.map((lead) => (
                <Link key={lead.id} href={`/leads/${lead.id}`} className="attention-item">
                  <span className="attention-dot" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="name-primary" style={{ fontSize: 13 }}>
                      {lead.name || "(no name)"}
                    </div>
                    <div className="name-secondary">New for {daysAgo(lead.created_at)} days</div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="card">
          <h3 className="panel-title">
            Recent Activity
            <Link href="/leads" className="btn ghost" style={{ padding: 0, fontSize: 12.5 }}>
              View all leads &rarr;
            </Link>
          </h3>
          {loading ? (
            <p style={{ color: "var(--muted)" }}>Loading...</p>
          ) : recent.length === 0 ? (
            <div className="empty-state">
              <div className="big">No leads yet</div>
              New leads from the website will show up here, or add one manually.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {recent.map((lead) => (
                <Link key={lead.id} href={`/leads/${lead.id}`} className="lead-row" style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 8px", textDecoration: "none" }}>
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
