"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { onPhoneChange } from "../../../lib/formatPhone";
import { PROJECT_STATUSES, projectStatusLabel } from "../../../lib/leadMeta";

const STATUS_BADGE = {
  new: "status-new",
  in_progress: "status-in_progress",
  waiting_on_documents: "status-contacted",
  permit_processing: "status-quote_sent",
  completed: "status-won",
  on_hold: "status-contacted",
  cancelled: "status-lost",
};
const TABS = ["Overview", "Permits", "Documents", "Messages", "Financials", "Activity"];

function money(n) {
  return n || n === 0 ? `$${Number(n).toLocaleString()}` : "-";
}
function fmtDate(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function relTime(iso) {
  if (!iso) return "-";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return fmtDate(iso);
}
function fullName(first, last) {
  return [first, last].filter(Boolean).join(" ") || "-";
}

export default function ProjectDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [project, setProject] = useState(null);
  const [team, setTeam] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("Overview");
  const [editOpen, setEditOpen] = useState(false);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  function load() {
    fetch(`/api/projects/${id}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load project");
        setProject(data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    fetch("/api/team").then((r) => r.json()).then((d) => setTeam(Array.isArray(d) ? d : [])).catch(() => {});
    fetch("/api/quotations").then((r) => r.json()).then((d) => setQuotes(Array.isArray(d) ? d : [])).catch(() => {});
  }, [id]);

  async function patch(partial, activityText) {
    const body = { ...partial };
    if (activityText) {
      const activity = Array.isArray(project.activity) ? [...project.activity] : [];
      activity.push({ text: activityText, at: new Date().toISOString() });
      body.activity = activity;
    }
    const res = await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) setProject(data);
    return res.ok;
  }

  function openEdit() {
    setDraft({
      project_name: project.project_name || "",
      first_name: project.first_name || "",
      last_name: project.last_name || "",
      phone: project.phone || "",
      email: project.email || "",
      company_name: project.company_name || "",
      license_number: project.license_number || "",
      homeowner: { ...(project.homeowner || {}) },
      property: { ...(project.property || {}) },
      type_of_work: project.type_of_work || "",
      permit_type: project.permit_type || "",
      work_description: project.work_description || "",
      scope_of_work: project.scope_of_work || "",
      job_value: project.job_value || "",
      status: project.status || "new",
      assigned_to: project.assigned_to || "",
    });
    setEditOpen(true);
  }
  function setDraftField(key, value) {
    setDraft((d) => ({ ...d, [key]: value }));
  }
  function setDraftHomeowner(patch) {
    setDraft((d) => ({ ...d, homeowner: { ...d.homeowner, ...patch } }));
  }
  function setDraftProperty(patch) {
    setDraft((d) => ({ ...d, property: { ...d.property, ...patch } }));
  }
  async function saveEdit() {
    setSaving(true);
    const property_address = [
      draft.property.street,
      [draft.property.city, draft.property.state].filter(Boolean).join(", "),
      draft.property.zip,
    ].filter(Boolean).join(" ");
    const ok = await patch({ ...draft, property_address }, "Project details updated");
    setSaving(false);
    if (ok) setEditOpen(false);
  }

  async function handleDelete() {
    const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    if (res.ok) router.push("/projects");
    else setDeleteOpen(false);
  }

  if (loading) return <p style={{ color: "var(--muted)" }}>Loading...</p>;
  if (!project) return <div className="error-banner">{error || "Project not found"}</div>;

  const linkedQuote = project.quote_id ? quotes.find((q) => q.id === project.quote_id) : null;
  const documents = Array.isArray(project.documents) ? project.documents : [];
  const activity = Array.isArray(project.activity) ? [...project.activity].reverse() : [];
  const homeowner = project.homeowner || {};
  const property = project.property || {};

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>{project.project_name || "(untitled project)"}</h2>
          <p className="subtitle">
            {project.number}
            {" · "}
            <span className={`badge ${STATUS_BADGE[project.status] || "status-new"}`}>
              {projectStatusLabel(project.status || "new")}
            </span>
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" className="btn secondary" onClick={openEdit}>Edit</button>
          <button type="button" className="btn" onClick={() => setTab("Permits")}>+ Add Permit</button>
          <button type="button" className="btn danger" onClick={() => setDeleteOpen(true)}>Delete</button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="tabs">
        {TABS.map((t) => (
          <button key={t} type="button" className={`tab${tab === t ? " active" : ""}`} onClick={() => setTab(t)}>
            {t}
            {t === "Documents" && documents.length > 0 && <span className="tab-count">{documents.length}</span>}
            {t === "Activity" && activity.length > 0 && <span className="tab-count">{activity.length}</span>}
          </button>
        ))}
      </div>

      {tab === "Overview" && (
        <div className="two-col">
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="card">
              <div className="panel-title">Customer / Contractor</div>
              <div className="meta-list">
                <div className="meta-row"><span>Name</span><span>{fullName(project.first_name, project.last_name)}</span></div>
                <div className="meta-row"><span>Phone</span><span>{project.phone || "-"}</span></div>
                <div className="meta-row"><span>Email</span><span>{project.email || "-"}</span></div>
                <div className="meta-row"><span>Company</span><span>{project.company_name || "-"}</span></div>
                <div className="meta-row"><span>License</span><span>{project.license_number || "-"}</span></div>
              </div>
            </div>
            <div className="card">
              <div className="panel-title">Homeowner</div>
              <div className="meta-list">
                <div className="meta-row"><span>Name</span><span>{fullName(homeowner.first_name, homeowner.last_name)}</span></div>
                <div className="meta-row"><span>Phone</span><span>{homeowner.phone || "-"}</span></div>
                <div className="meta-row"><span>Email</span><span>{homeowner.email || "-"}</span></div>
              </div>
            </div>
            <div className="card">
              <div className="panel-title">Property</div>
              <div className="meta-list">
                <div className="meta-row"><span>Address</span><span>{property.street || "-"}</span></div>
                <div className="meta-row"><span>City</span><span>{property.city || "-"}</span></div>
                <div className="meta-row"><span>State</span><span>{property.state || "-"}</span></div>
                <div className="meta-row"><span>ZIP</span><span>{property.zip || "-"}</span></div>
                <div className="meta-row"><span>County / Jurisdiction</span><span>{property.county || "-"}</span></div>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="card">
              <div className="panel-title">Work Information</div>
              <div className="meta-list">
                <div className="meta-row"><span>Type of Work</span><span>{project.type_of_work || "-"}</span></div>
                <div className="meta-row"><span>Permit Type</span><span>{project.permit_type || "-"}</span></div>
                <div className="meta-row"><span>Est. Job Value</span><span>{money(project.job_value)}</span></div>
              </div>
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 4 }}>Scope of work</div>
                <div className="message-block">{project.scope_of_work || project.work_description || "-"}</div>
              </div>
            </div>
            <div className="card">
              <div className="panel-title">Project Management</div>
              <div className="meta-list">
                <div className="meta-row"><span>Status</span><span className={`badge ${STATUS_BADGE[project.status] || "status-new"}`}>{projectStatusLabel(project.status || "new")}</span></div>
                <div className="meta-row"><span>Assigned Employee</span><span>{project.assigned_to || "Unassigned"}</span></div>
              </div>
            </div>
            <div className="card">
              <div className="panel-title">Quote</div>
              {linkedQuote ? (
                <div className="meta-list">
                  <div className="meta-row"><span>Number</span><span>{linkedQuote.number}</span></div>
                  <div className="meta-row"><span>Amount</span><span>{money(linkedQuote.total)}</span></div>
                  <div className="meta-row"><span>Status</span><span className={`badge ${linkedQuote.status === "accepted" ? "status-won" : "status-new"}`}>{linkedQuote.status}</span></div>
                  <div className="meta-row"><span>Accepted</span><span>{fmtDate(linkedQuote.accepted_at)}</span></div>
                  <a href={`/quotations/${linkedQuote.token}`} target="_blank" rel="noreferrer" className="btn secondary" style={{ marginTop: 10, display: "inline-block", padding: "6px 14px", fontSize: 12.5 }}>View Quote</a>
                </div>
              ) : (
                <p style={{ color: "var(--muted)", fontSize: 13 }}>No quote linked to this project.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === "Permits" && (
        <div className="card">
          <div className="panel-title">Permits</div>
          <div className="empty-state" style={{ padding: "24px 8px" }}>
            <div className="big" style={{ fontSize: 14 }}>No permits yet</div>
            <span style={{ fontSize: 12.5 }}>A project can hold multiple permits (building, electrical, plumbing, etc). Permit tracking is coming in a later phase.</span>
          </div>
        </div>
      )}

      {tab === "Documents" && (
        <div className="card">
          <div className="panel-title">Documents</div>
          {documents.length === 0 ? (
            <p style={{ color: "var(--muted)", fontSize: 13 }}>No documents yet. Files the client uploads on the lead&apos;s document link will appear here once carried over.</p>
          ) : (
            <div className="meta-list">
              {documents.map((d) => (
                <div key={d.id} className="doc-row">
                  <svg viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" style={{ width: 18, height: 18 }}>
                    <path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z" /><path d="M14 3v6h6" />
                  </svg>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <a className="name-primary" style={{ fontSize: 13 }} href={d.url} target="_blank" rel="noreferrer">{d.name}</a>
                    <div className="name-secondary">{d.category || "Document"} · {d.uploaded_by || "Client"} · {fmtDate(d.uploaded_at)}</div>
                  </div>
                  <span className="badge status-won">Received</span>
                </div>
              ))}
            </div>
          )}
          <p style={{ color: "var(--muted)", fontSize: 12.5, marginTop: 14 }}>Uploading new documents directly to a project is coming in a later phase.</p>
        </div>
      )}

      {tab === "Messages" && (
        <div className="card">
          <div className="panel-title">Messages</div>
          <div className="empty-state" style={{ padding: "24px 8px" }}>
            <div className="big" style={{ fontSize: 14 }}>No messages yet</div>
            <span style={{ fontSize: 12.5 }}>Client communication for this project is coming in a later phase.</span>
          </div>
        </div>
      )}

      {tab === "Financials" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card">
            <div className="panel-title">Quote</div>
            {linkedQuote ? (
              <div className="meta-list">
                <div className="meta-row"><span>Number</span><span>{linkedQuote.number}</span></div>
                <div className="meta-row"><span>Amount</span><span>{money(linkedQuote.total)}</span></div>
                <div className="meta-row"><span>Status</span><span>{linkedQuote.status}</span></div>
                <div className="meta-row"><span>Accepted</span><span>{fmtDate(linkedQuote.accepted_at)}</span></div>
              </div>
            ) : (
              <p style={{ color: "var(--muted)", fontSize: 13 }}>No quote linked yet.</p>
            )}
          </div>
          <div className="card">
            <div className="panel-title">Invoice</div>
            <div className="empty-state" style={{ padding: "24px 8px" }}>
              <div className="big" style={{ fontSize: 14 }}>Invoicing coming soon</div>
              <span style={{ fontSize: 12.5 }}>Invoice number, amount, status, amount paid and balance due.</span>
            </div>
          </div>
        </div>
      )}

      {tab === "Activity" && (
        <div className="card">
          <div className="panel-title">Activity</div>
          {activity.length === 0 ? (
            <p style={{ color: "var(--muted)", fontSize: 13 }}>No activity recorded yet.</p>
          ) : (
            <div className="meta-list">
              {activity.map((a, i) => (
                <div key={i} className="meta-row">
                  <span>{a.text}</span>
                  <span className="name-secondary">{relTime(a.at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {editOpen && draft && (
        <div className="toast-backdrop" onClick={() => !saving && setEditOpen(false)}>
          <div className="ld-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ld-modal-head">
              <div>
                <h3>Edit Project</h3>
                <p>Changes update everywhere as soon as you save.</p>
              </div>
              <button className="ld-modal-x" onClick={() => setEditOpen(false)} title="Close">×</button>
            </div>
            <div className="ld-modal-grid">
              <label className="full">Project Name<input value={draft.project_name} onChange={(e) => setDraftField("project_name", e.target.value)} /></label>

              <label className="full"><b>Customer / Contractor</b></label>
              <label>First Name<input value={draft.first_name} onChange={(e) => setDraftField("first_name", e.target.value)} /></label>
              <label>Last Name<input value={draft.last_name} onChange={(e) => setDraftField("last_name", e.target.value)} /></label>
              <label>Phone<input value={draft.phone} onChange={(e) => onPhoneChange(e, (v) => setDraftField("phone", v))} /></label>
              <label>Email<input value={draft.email} onChange={(e) => setDraftField("email", e.target.value)} /></label>
              <label>Company Name<input value={draft.company_name} onChange={(e) => setDraftField("company_name", e.target.value)} /></label>
              <label>License Number<input value={draft.license_number} onChange={(e) => setDraftField("license_number", e.target.value)} /></label>

              <label className="full"><b>Homeowner</b></label>
              <label>First Name<input value={draft.homeowner.first_name || ""} onChange={(e) => setDraftHomeowner({ first_name: e.target.value })} /></label>
              <label>Last Name<input value={draft.homeowner.last_name || ""} onChange={(e) => setDraftHomeowner({ last_name: e.target.value })} /></label>
              <label>Phone<input value={draft.homeowner.phone || ""} onChange={(e) => onPhoneChange(e, (v) => setDraftHomeowner({ phone: v }))} /></label>
              <label>Email<input value={draft.homeowner.email || ""} onChange={(e) => setDraftHomeowner({ email: e.target.value })} /></label>

              <label className="full"><b>Property</b></label>
              <label className="full">Address<input value={draft.property.street || ""} onChange={(e) => setDraftProperty({ street: e.target.value })} /></label>
              <label>City<input value={draft.property.city || ""} onChange={(e) => setDraftProperty({ city: e.target.value })} /></label>
              <label>State<input value={draft.property.state || ""} onChange={(e) => setDraftProperty({ state: e.target.value })} /></label>
              <label>ZIP Code<input value={draft.property.zip || ""} onChange={(e) => setDraftProperty({ zip: e.target.value })} /></label>
              <label>County / Jurisdiction<input value={draft.property.county || ""} onChange={(e) => setDraftProperty({ county: e.target.value })} /></label>

              <label className="full"><b>Work Information</b></label>
              <label>Type of Work<input value={draft.type_of_work} onChange={(e) => setDraftField("type_of_work", e.target.value)} /></label>
              <label>Permit Type<input value={draft.permit_type} onChange={(e) => setDraftField("permit_type", e.target.value)} /></label>
              <label>Work Description<input value={draft.work_description} onChange={(e) => setDraftField("work_description", e.target.value)} /></label>
              <label>Estimated Job Value<input value={draft.job_value} onChange={(e) => setDraftField("job_value", e.target.value)} /></label>
              <label className="full">Scope of Work<textarea rows={3} value={draft.scope_of_work} onChange={(e) => setDraftField("scope_of_work", e.target.value)} /></label>

              <label className="full"><b>Project Management</b></label>
              <label>
                Status
                <select value={draft.status} onChange={(e) => setDraftField("status", e.target.value)}>
                  {PROJECT_STATUSES.map((s) => <option key={s} value={s}>{projectStatusLabel(s)}</option>)}
                </select>
              </label>
              <label>
                Assigned Employee
                <select value={draft.assigned_to} onChange={(e) => setDraftField("assigned_to", e.target.value)}>
                  <option value="">Unassigned</option>
                  {team.map((t) => <option key={t.id} value={t.name}>{t.name} ({t.role})</option>)}
                  {draft.assigned_to && !team.some((t) => t.name === draft.assigned_to) && <option value={draft.assigned_to}>{draft.assigned_to}</option>}
                </select>
              </label>
            </div>
            <div className="ld-modal-actions">
              <button className="btn-outline" onClick={() => setEditOpen(false)} disabled={saving}>Cancel</button>
              <button className="btn-navy" onClick={saveEdit} disabled={saving}>{saving ? "Saving…" : "Save Changes"}</button>
            </div>
          </div>
        </div>
      )}

      {deleteOpen && (
        <div className="toast-backdrop" onClick={() => setDeleteOpen(false)}>
          <div className="ld-modal ld-modal-sm ld-modal-warn" onClick={(e) => e.stopPropagation()}>
            <div className="ld-modal-warn-bar" />
            <h3 className="ld-modal-center-title">Delete this project?</h3>
            <p className="ld-modal-center-text"><b>{project.project_name || "This project"}</b> will be permanently removed. This can&apos;t be undone.</p>
            <div className="ld-modal-actions stacked">
              <button className="btn-danger full" onClick={handleDelete}>Yes, delete this project</button>
              <button className="ld-modal-link" onClick={() => setDeleteOpen(false)}>Keep this project</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
