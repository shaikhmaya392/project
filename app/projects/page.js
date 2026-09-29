"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PROJECT_STATUSES, projectStatusLabel } from "../../lib/leadMeta";

const STATUS_BADGE = {
  new: "status-new",
  in_progress: "status-in_progress",
  waiting_on_documents: "status-contacted",
  permit_processing: "status-quote_sent",
  completed: "status-won",
  on_hold: "status-contacted",
  cancelled: "status-lost",
};

function relTime(iso) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function customerName(p) {
  return [p.first_name, p.last_name].filter(Boolean).join(" ") || p.company_name || "—";
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");

  useEffect(() => {
    fetch("/api/projects")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load projects");
        setProjects(Array.isArray(data) ? data : []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      if (status !== "all" && (p.status || "new") !== status) return false;
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        (p.project_name || "").toLowerCase().includes(q) ||
        (p.property_address || "").toLowerCase().includes(q) ||
        customerName(p).toLowerCase().includes(q) ||
        (p.number || "").toLowerCase().includes(q)
      );
    });
  }, [projects, query, status]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Projects</h2>
          <p className="subtitle">{loading ? "Loading..." : `${filtered.length} of ${projects.length} projects`}</p>
        </div>
        <Link href="/projects/new" className="btn">
          + Create Project
        </Link>
      </div>

      {error && <div className="error-banner">Couldn&apos;t load projects: {error}</div>}

      <div className="toolbar">
        <div className="search-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
          </svg>
          <input placeholder="Search by project, address, customer..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="filter-pills">
          <button type="button" className={`pill${status === "all" ? " active" : ""}`} onClick={() => setStatus("all")}>All</button>
          {PROJECT_STATUSES.map((s) => (
            <button key={s} type="button" className={`pill${status === s ? " active" : ""}`} onClick={() => setStatus(s)}>
              {projectStatusLabel(s)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p style={{ color: "var(--muted)" }}>Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="table-wrap">
          <div className="empty-state">
            <div className="big">No projects yet</div>
            Convert an accepted quote into a project from the lead page, or create one with &quot;+ Create Project&quot;.
          </div>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <colgroup>
              <col style={{ width: "26%" }} />
              <col style={{ width: "18%" }} />
              <col style={{ width: "22%" }} />
              <col style={{ width: "13%" }} />
              <col style={{ width: "11%" }} />
              <col style={{ width: "10%" }} />
            </colgroup>
            <thead>
              <tr>
                <th>Project</th>
                <th>Customer</th>
                <th>Property</th>
                <th>Status</th>
                <th>Assigned To</th>
                <th>Last Activity</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const lastActivity = Array.isArray(p.activity) && p.activity.length > 0 ? p.activity[p.activity.length - 1] : null;
                return (
                  <tr key={p.id} onClick={() => (window.location.href = `/projects/${p.id}`)}>
                    <td>
                      <div className="name-primary">{p.project_name || "(untitled)"}</div>
                      <span className="source-tag">{p.number}</span>
                    </td>
                    <td>{customerName(p)}</td>
                    <td>{p.property_address || "-"}</td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[p.status] || "status-new"}`}>{projectStatusLabel(p.status || "new")}</span>
                    </td>
                    <td className="source-tag">{p.assigned_to || "Unassigned"}</td>
                    <td className="source-tag">{lastActivity ? relTime(lastActivity.at) : relTime(p.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
