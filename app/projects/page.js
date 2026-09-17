"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

const STATUS_BADGE = {
  active: "status-new",
  on_hold: "status-contacted",
  completed: "status-won",
  cancelled: "status-lost",
};
const STATUSES = ["all", "active", "on_hold", "completed", "cancelled"];

function label(s) {
  return (s || "").replace("_", " ");
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
      if (status !== "all" && (p.status || "active") !== status) return false;
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        (p.project_name || "").toLowerCase().includes(q) ||
        (p.property_address || "").toLowerCase().includes(q) ||
        (p.client_name || "").toLowerCase().includes(q) ||
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
          + New Project
        </Link>
      </div>

      {error && <div className="error-banner">Couldn&apos;t load projects: {error}</div>}

      <div className="toolbar">
        <div className="search-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
          </svg>
          <input placeholder="Search by project, address, client..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="filter-pills">
          {STATUSES.map((s) => (
            <button key={s} type="button" className={`pill${status === s ? " active" : ""}`} onClick={() => setStatus(s)}>
              {s === "all" ? "All" : label(s)}
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
            Convert a lead into a project, or create one with &quot;+ New Project&quot;.
          </div>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <colgroup>
              <col style={{ width: "22%" }} />
              <col style={{ width: "22%" }} />
              <col style={{ width: "18%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "13%" }} />
              <col style={{ width: "13%" }} />
            </colgroup>
            <thead>
              <tr>
                <th>Project</th>
                <th>Property Address</th>
                <th>Client</th>
                <th>Job Value</th>
                <th>Assigned</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} onClick={() => (window.location.href = `/projects/${p.id}`)}>
                  <td>
                    <div className="name-primary">{p.project_name || "(untitled)"}</div>
                    <span className="source-tag">{p.number}</span>
                  </td>
                  <td>{p.property_address || "-"}</td>
                  <td>{p.client_name || "-"}</td>
                  <td>{p.job_value ? `$${Number(p.job_value).toLocaleString()}` : "-"}</td>
                  <td className="source-tag">{p.assigned_to || "Unassigned"}</td>
                  <td>
                    <span className={`badge ${STATUS_BADGE[p.status] || "status-new"}`}>{label(p.status || "active")}</span>
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
