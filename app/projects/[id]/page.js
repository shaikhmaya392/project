"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const STATUS_BADGE = {
  active: "status-new",
  on_hold: "status-contacted",
  completed: "status-won",
  cancelled: "status-lost",
};

export default function ProjectDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [project, setProject] = useState(null);
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [savedAt, setSavedAt] = useState(null);

  useEffect(() => {
    fetch(`/api/projects/${id}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load project");
        setProject(data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
    fetch("/api/team").then((r) => r.json()).then((d) => setTeam(Array.isArray(d) ? d : [])).catch(() => {});
  }, [id]);

  function set(field, value) {
    setProject((p) => ({ ...p, [field]: value }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(project),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      setProject(data);
      setSavedAt(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this project permanently?")) return;
    const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    if (res.ok) router.push("/projects");
  }

  if (loading) return <p style={{ color: "var(--muted)" }}>Loading...</p>;
  if (!project) return <div className="error-banner">{error || "Project not found"}</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>{project.project_name || "(untitled project)"}</h2>
          <p className="subtitle">
            {project.number}
            {project.property_address ? ` · ${project.property_address}` : ""}
            {" · "}
            <span className={`badge ${STATUS_BADGE[project.status] || "status-new"}`}>
              {(project.status || "active").replace("_", " ")}
            </span>
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" className="btn secondary" onClick={() => router.push("/projects")}>
            Close
          </button>
          <button type="button" className="btn danger" onClick={handleDelete}>
            Delete
          </button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="two-col">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card">
            <div className="panel-title">Client</div>
            <div className="meta-list">
              <div className="meta-row"><span>Name</span><span>{project.client_name || "-"}</span></div>
              <div className="meta-row"><span>Phone</span><span>{project.client_phone || "-"}</span></div>
              <div className="meta-row"><span>Email</span><span>{project.client_email || "-"}</span></div>
            </div>
          </div>
          <div className="card">
            <div className="panel-title">Homeowner</div>
            <div className="meta-list">
              <div className="meta-row"><span>Name</span><span>{project.homeowner_name || "-"}</span></div>
              <div className="meta-row"><span>Phone</span><span>{project.homeowner_phone || "-"}</span></div>
            </div>
          </div>
          <div className="card">
            <div className="panel-title">Contractor</div>
            <div className="meta-list">
              <div className="meta-row"><span>Name</span><span>{project.contractor_name || "-"}</span></div>
              <div className="meta-row"><span>License</span><span>{project.contractor_license || "-"}</span></div>
              <div className="meta-row"><span>Phone</span><span>{project.contractor_phone || "-"}</span></div>
            </div>
          </div>
          <div className="card">
            <div className="panel-title">Permits</div>
            <div className="empty-state" style={{ padding: "24px 8px" }}>
              <div className="big" style={{ fontSize: 14 }}>No permits yet</div>
              <span style={{ fontSize: 12.5 }}>Permit tracking is being added next.</span>
            </div>
          </div>
        </div>

        <form className="card" onSubmit={handleSave}>
          <div className="panel-title">Edit project</div>
          <div className="form-grid">
            <div>
              <label>Project Name</label>
              <input value={project.project_name || ""} onChange={(e) => set("project_name", e.target.value)} />
            </div>
            <div>
              <label>Job Value ($)</label>
              <input type="number" value={project.job_value || ""} onChange={(e) => set("job_value", e.target.value)} />
            </div>
            <div className="full">
              <label>Property Address</label>
              <input value={project.property_address || ""} onChange={(e) => set("property_address", e.target.value)} />
            </div>
            <div className="full">
              <label>Scope of Work</label>
              <textarea rows={3} value={project.scope_of_work || ""} onChange={(e) => set("scope_of_work", e.target.value)} />
            </div>
            <div>
              <label>Assigned Employee</label>
              <select value={project.assigned_to || ""} onChange={(e) => set("assigned_to", e.target.value)}>
                <option value="">Unassigned</option>
                {team.map((t) => (
                  <option key={t.id} value={t.name}>{t.name} ({t.role})</option>
                ))}
                {project.assigned_to && !team.some((t) => t.name === project.assigned_to) && (
                  <option value={project.assigned_to}>{project.assigned_to}</option>
                )}
              </select>
            </div>
            <div>
              <label>Status</label>
              <select value={project.status || "active"} onChange={(e) => set("status", e.target.value)}>
                <option value="active">Active</option>
                <option value="on_hold">On Hold</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label>Client Name</label>
              <input value={project.client_name || ""} onChange={(e) => set("client_name", e.target.value)} />
            </div>
            <div>
              <label>Client Phone</label>
              <input value={project.client_phone || ""} onChange={(e) => set("client_phone", e.target.value)} />
            </div>
            <div className="full">
              <label>Client Email</label>
              <input value={project.client_email || ""} onChange={(e) => set("client_email", e.target.value)} />
            </div>
            <div>
              <label>Homeowner Name</label>
              <input value={project.homeowner_name || ""} onChange={(e) => set("homeowner_name", e.target.value)} />
            </div>
            <div>
              <label>Homeowner Phone</label>
              <input value={project.homeowner_phone || ""} onChange={(e) => set("homeowner_phone", e.target.value)} />
            </div>
            <div>
              <label>Contractor Name</label>
              <input value={project.contractor_name || ""} onChange={(e) => set("contractor_name", e.target.value)} />
            </div>
            <div>
              <label>Contractor License #</label>
              <input value={project.contractor_license || ""} onChange={(e) => set("contractor_license", e.target.value)} />
            </div>
            <div className="full">
              <label>Contractor Phone</label>
              <input value={project.contractor_phone || ""} onChange={(e) => set("contractor_phone", e.target.value)} />
            </div>
            <div className="full">
              <label>Internal Notes</label>
              <textarea rows={3} value={project.notes || ""} onChange={(e) => set("notes", e.target.value)} />
            </div>
          </div>
          <div className="actions-row">
            <button className="btn" type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
            {savedAt && !saving && (
              <span style={{ color: "var(--success)", fontSize: 12.5, alignSelf: "center" }}>Saved</span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
