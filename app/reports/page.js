"use client";

import { useEffect, useState } from "react";

const STATUS_ORDER = ["new", "contacted", "in_progress", "won", "lost"];
const STATUS_COLORS = {
  new: "var(--blue)",
  contacted: "var(--amber)",
  in_progress: "var(--purple)",
  won: "var(--green)",
  lost: "var(--red)",
};

function monthKey(dateStr) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key) {
  const [y, m] = key.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

export default function ReportsPage() {
  const [leads, setLeads] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/leads").then((r) => r.json()),
      fetch("/api/proposals").then((r) => r.json()),
    ])
      .then(([l, p]) => {
        setLeads(Array.isArray(l) ? l : []);
        setProposals(Array.isArray(p) ? p : []);
      })
      .finally(() => setLoading(false));
  }, []);

  const byStatus = STATUS_ORDER.reduce((acc, s) => {
    acc[s] = leads.filter((l) => (l.status || "new") === s).length;
    return acc;
  }, {});
  const maxStatus = Math.max(1, ...STATUS_ORDER.map((s) => byStatus[s]));

  const websiteCount = leads.filter((l) => l.source === "website_form").length;
  const manualCount = leads.length - websiteCount;
  const maxSource = Math.max(1, websiteCount, manualCount);

  const months = {};
  leads.forEach((l) => {
    const key = monthKey(l.created_at);
    months[key] = (months[key] || 0) + 1;
  });
  const sortedMonths = Object.keys(months).sort().slice(-6);
  const maxMonth = Math.max(1, ...sortedMonths.map((m) => months[m]));

  const proposalTotal = proposals.reduce((sum, p) => sum + p.total, 0);
  const acceptedProposals = proposals.filter((p) => p.status === "accepted");
  const acceptedTotal = acceptedProposals.reduce((sum, p) => sum + p.total, 0);
  const acceptRate = proposals.length > 0 ? Math.round((acceptedProposals.length / proposals.length) * 100) : 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Reports</h2>
          <p className="subtitle">A snapshot of leads and proposal performance.</p>
        </div>
      </div>

      {loading ? (
        <p style={{ color: "var(--muted)" }}>Loading...</p>
      ) : (
        <>
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-label">Total Leads</div>
              <div className="stat-value">{leads.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Proposals Sent</div>
              <div className="stat-value">{proposals.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Proposal Value</div>
              <div className="stat-value">${proposalTotal.toLocaleString()}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Accept Rate</div>
              <div className="stat-value">{acceptRate}%</div>
            </div>
          </div>

          <div className="two-col">
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="card">
                <h3 className="panel-title">Leads by Status</h3>
                {STATUS_ORDER.map((s) => (
                  <div className="bar-row" key={s}>
                    <span className="bar-label">{s.replace("_", " ")}</span>
                    <span className="bar-track">
                      <span className="bar-fill" style={{ width: `${((byStatus[s] || 0) / maxStatus) * 100}%`, background: STATUS_COLORS[s] }} />
                    </span>
                    <span className="bar-count">{byStatus[s] || 0}</span>
                  </div>
                ))}
              </div>

              <div className="card">
                <h3 className="panel-title">Lead Source</h3>
                <div className="bar-row">
                  <span className="bar-label">Website</span>
                  <span className="bar-track">
                    <span className="bar-fill" style={{ width: `${(websiteCount / maxSource) * 100}%`, background: "var(--blue)" }} />
                  </span>
                  <span className="bar-count">{websiteCount}</span>
                </div>
                <div className="bar-row">
                  <span className="bar-label">Manual</span>
                  <span className="bar-track">
                    <span className="bar-fill" style={{ width: `${(manualCount / maxSource) * 100}%`, background: "var(--amber)" }} />
                  </span>
                  <span className="bar-count">{manualCount}</span>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="panel-title">Leads per Month</h3>
              {sortedMonths.length === 0 ? (
                <p style={{ color: "var(--muted)", fontSize: 13 }}>Not enough data yet.</p>
              ) : (
                sortedMonths.map((m) => (
                  <div className="bar-row" key={m}>
                    <span className="bar-label">{monthLabel(m)}</span>
                    <span className="bar-track">
                      <span className="bar-fill" style={{ width: `${(months[m] / maxMonth) * 100}%`, background: "var(--blue)" }} />
                    </span>
                    <span className="bar-count">{months[m]}</span>
                  </div>
                ))
              )}

              <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--border-soft)" }}>
                <div className="meta-list">
                  <div className="meta-row"><span>Accepted proposals</span><span>{acceptedProposals.length}</span></div>
                  <div className="meta-row"><span>Accepted value</span><span>${acceptedTotal.toLocaleString()}</span></div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
