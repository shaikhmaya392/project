"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { formatPhone } from "../../../lib/formatPhone";

const STATUS_BADGE = {
  active: "status-new",
  on_hold: "status-contacted",
  completed: "status-won",
  cancelled: "status-lost",
};
const DEFAULT_DOCS = ["Plans", "Site Survey", "Contractor License", "Energy Calculations", "Notice of Commencement"];
const TABS = ["Overview", "Documents", "Files", "Communications", "Quotes & Invoices", "Edit"];

function fmtSize(n) {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export default function ProjectDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [project, setProject] = useState(null);
  const [team, setTeam] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [savedAt, setSavedAt] = useState(null);
  const [tab, setTab] = useState("Overview");

  const [newDoc, setNewDoc] = useState("");
  const [commType, setCommType] = useState("call");
  const [commBody, setCommBody] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadLabel, setUploadLabel] = useState("");
  const fileRef = useRef(null);

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

  function set(field, value) {
    setProject((p) => ({ ...p, [field]: value }));
  }

  async function patch(partial) {
    const res = await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(partial),
    });
    const data = await res.json();
    if (res.ok) setProject(data);
    return res.ok;
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const ok = await patch(project);
    setSaving(false);
    if (ok) setSavedAt(new Date());
    else setError("Failed to save");
  }

  async function handleDelete() {
    if (!confirm("Delete this project permanently?")) return;
    const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    if (res.ok) router.push("/projects");
  }

  // Documents
  function docList() {
    return Array.isArray(project.required_documents) ? project.required_documents : [];
  }
  async function addDoc(name) {
    const n = (name || "").trim();
    if (!n) return;
    const docs = [...docList(), { id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, name: n, status: "required" }];
    await patch({ required_documents: docs });
    setNewDoc("");
  }
  async function toggleDoc(docId) {
    const docs = docList().map((d) => (d.id === docId ? { ...d, status: d.status === "received" ? "required" : "received" } : d));
    await patch({ required_documents: docs });
  }
  async function removeDoc(docId) {
    await patch({ required_documents: docList().filter((d) => d.id !== docId) });
  }

  // Communications
  function commList() {
    return Array.isArray(project.communications) ? project.communications : [];
  }
  async function addComm() {
    if (!commBody.trim()) return;
    const entry = { id: `c-${Date.now()}`, type: commType, body: commBody.trim(), at: new Date().toISOString() };
    await patch({ communications: [entry, ...commList()] });
    setCommBody("");
  }
  async function removeComm(cid) {
    await patch({ communications: commList().filter((c) => c.id !== cid) });
  }

  // Files
  async function handleUpload(e) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    if (uploadLabel.trim()) fd.append("label", uploadLabel.trim());
    try {
      const res = await fetch(`/api/projects/${id}/files`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setUploadLabel("");
      if (fileRef.current) fileRef.current.value = "";
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setUploading(false);
    }
  }
  async function removeFile(fileId) {
    if (!confirm("Delete this file?")) return;
    await fetch(`/api/projects/${id}/files?fileId=${fileId}`, { method: "DELETE" });
    load();
  }

  if (loading) return <p style={{ color: "var(--muted)" }}>Loading...</p>;
  if (!project) return <div className="error-banner">{error || "Project not found"}</div>;

  const linkedQuotes = quotes.filter(
    (q) => (project.lead_id && q.lead_id === project.lead_id) || (project.client_email && q.client_email === project.client_email)
  );

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
          <button type="button" className="btn secondary" onClick={() => router.push("/projects")}>Close</button>
          <button type="button" className="btn danger" onClick={handleDelete}>Delete</button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="tabs">
        {TABS.map((t) => (
          <button key={t} type="button" className={`tab${tab === t ? " active" : ""}`} onClick={() => setTab(t)}>
            {t}
            {t === "Documents" && docList().length > 0 && <span className="tab-count">{docList().length}</span>}
            {t === "Files" && (project.files?.length > 0) && <span className="tab-count">{project.files.length}</span>}
          </button>
        ))}
      </div>

      {tab === "Overview" && (
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
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="card">
              <div className="panel-title">Project</div>
              <div className="meta-list">
                <div className="meta-row"><span>Job value</span><span>{project.job_value ? `$${Number(project.job_value).toLocaleString()}` : "-"}</span></div>
                <div className="meta-row"><span>Assigned</span><span>{project.assigned_to || "Unassigned"}</span></div>
              </div>
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 4 }}>Scope of work</div>
                <div className="message-block">{project.scope_of_work || "-"}</div>
              </div>
              {project.notes && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 4 }}>Internal notes</div>
                  <div className="message-block">{project.notes}</div>
                </div>
              )}
            </div>
            <div className="card">
              <div className="panel-title">Permits</div>
              <div className="empty-state" style={{ padding: "24px 8px" }}>
                <div className="big" style={{ fontSize: 14 }}>No permits yet</div>
                <span style={{ fontSize: 12.5 }}>Permit tracking is being added next.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "Documents" && (
        <div className="card">
          <div className="panel-title">Required Documents</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            {DEFAULT_DOCS.filter((d) => !docList().some((x) => x.name === d)).map((d) => (
              <button key={d} type="button" className="pill" onClick={() => addDoc(d)}>+ {d}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <input placeholder="Add a document..." value={newDoc} onChange={(e) => setNewDoc(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addDoc(newDoc); } }} />
            <button type="button" className="btn secondary" onClick={() => addDoc(newDoc)}>Add</button>
          </div>
          {docList().length === 0 ? (
            <p style={{ color: "var(--muted)", fontSize: 13 }}>No documents added yet.</p>
          ) : (
            <div className="meta-list">
              {docList().map((d) => (
                <div key={d.id} className="doc-row">
                  <button type="button" className={`doc-check${d.status === "received" ? " on" : ""}`} onClick={() => toggleDoc(d.id)}>
                    {d.status === "received" && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12l5 5L20 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    )}
                  </button>
                  <span style={{ flex: 1, textDecoration: d.status === "received" ? "line-through" : "none", color: d.status === "received" ? "var(--muted)" : "var(--text)" }}>{d.name}</span>
                  <span className={`badge ${d.status === "received" ? "status-won" : "status-contacted"}`}>{d.status}</span>
                  <button type="button" className="icon-btn danger" onClick={() => removeDoc(d.id)} title="Remove">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" /></svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "Files" && (
        <div className="card">
          <div className="panel-title">Uploaded Files</div>
          <form onSubmit={handleUpload} style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            <input ref={fileRef} type="file" style={{ maxWidth: 260 }} />
            <input placeholder="Label (optional)" value={uploadLabel} onChange={(e) => setUploadLabel(e.target.value)} style={{ maxWidth: 200 }} />
            <button className="btn" type="submit" disabled={uploading}>{uploading ? "Uploading..." : "Upload"}</button>
          </form>
          {(!project.files || project.files.length === 0) ? (
            <p style={{ color: "var(--muted)", fontSize: 13 }}>No files uploaded yet.</p>
          ) : (
            <div className="meta-list">
              {project.files.map((f) => (
                <div key={f.id} className="doc-row">
                  <svg viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" style={{ width: 18, height: 18 }}>
                    <path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z" /><path d="M14 3v6h6" />
                  </svg>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="name-primary" style={{ fontSize: 13 }}>{f.name}</div>
                    <div className="name-secondary">{fmtSize(f.size)} · {new Date(f.uploaded_at).toLocaleDateString()}</div>
                  </div>
                  <a href={f.url} target="_blank" rel="noreferrer" className="btn secondary" style={{ padding: "6px 12px", fontSize: 12.5 }}>Download</a>
                  <button type="button" className="icon-btn danger" onClick={() => removeFile(f.id)} title="Delete">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0l-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "Communications" && (
        <div className="card">
          <div className="panel-title">Client Communications</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <select value={commType} onChange={(e) => setCommType(e.target.value)} style={{ maxWidth: 130 }}>
              <option value="call">Call</option>
              <option value="email">Email</option>
              <option value="note">Note</option>
            </select>
            <input placeholder="Log a call, email or note..." value={commBody} onChange={(e) => setCommBody(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addComm(); } }} />
            <button type="button" className="btn secondary" onClick={addComm}>Log</button>
          </div>
          {commList().length === 0 ? (
            <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 12 }}>No communications logged yet.</p>
          ) : (
            <div style={{ marginTop: 12 }}>
              {commList().map((c) => (
                <div key={c.id} style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--border-soft)" }}>
                  <span className={`badge ${c.type === "call" ? "status-new" : c.type === "email" ? "status-contacted" : "status-in_progress"}`} style={{ height: "fit-content" }}>{c.type}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5 }}>{c.body}</div>
                    <div className="name-secondary">{new Date(c.at).toLocaleString()}</div>
                  </div>
                  <button type="button" className="icon-btn danger" onClick={() => removeComm(c.id)} title="Remove">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" /></svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "Quotes & Invoices" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card">
            <div className="panel-title">Quotations</div>
            {linkedQuotes.length === 0 ? (
              <p style={{ color: "var(--muted)", fontSize: 13 }}>No quotations linked to this project&apos;s client yet.</p>
            ) : (
              <div className="meta-list">
                {linkedQuotes.map((q) => (
                  <div key={q.id} className="meta-row">
                    <span>
                      <span className="name-primary">{q.number}</span>
                      <span className="source-tag" style={{ marginLeft: 8 }}>{new Date(q.created_at).toLocaleDateString()}</span>
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      ${q.total.toLocaleString()}
                      <span className={`badge ${q.status === "accepted" ? "status-won" : "status-new"}`}>{q.status}</span>
                      <a href={`/quotations/${q.token}`} target="_blank" rel="noreferrer" className="btn secondary" style={{ padding: "5px 10px", fontSize: 12 }}>View</a>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="card">
            <div className="panel-title">Invoices</div>
            <div className="empty-state" style={{ padding: "24px 8px" }}>
              <div className="big" style={{ fontSize: 14 }}>Invoicing coming soon</div>
              <span style={{ fontSize: 12.5 }}>DS fee, municipality fees, due date, balance and receipts.</span>
            </div>
          </div>
        </div>
      )}

      {tab === "Edit" && (
        <form className="card" onSubmit={handleSave}>
          <div className="panel-title">Edit project</div>
          <div className="form-grid">
            <div><label>Project Name</label><input value={project.project_name || ""} onChange={(e) => set("project_name", e.target.value)} /></div>
            <div><label>Job Value ($)</label><input type="number" value={project.job_value || ""} onChange={(e) => set("job_value", e.target.value)} /></div>
            <div className="full"><label>Property Address</label><input value={project.property_address || ""} onChange={(e) => set("property_address", e.target.value)} /></div>
            <div className="full"><label>Scope of Work</label><textarea rows={3} value={project.scope_of_work || ""} onChange={(e) => set("scope_of_work", e.target.value)} /></div>
            <div>
              <label>Assigned Employee</label>
              <select value={project.assigned_to || ""} onChange={(e) => set("assigned_to", e.target.value)}>
                <option value="">Unassigned</option>
                {team.map((t) => (<option key={t.id} value={t.name}>{t.name} ({t.role})</option>))}
                {project.assigned_to && !team.some((t) => t.name === project.assigned_to) && (<option value={project.assigned_to}>{project.assigned_to}</option>)}
              </select>
            </div>
            <div>
              <label>Status</label>
              <select value={project.status || "active"} onChange={(e) => set("status", e.target.value)}>
                <option value="active">Active</option><option value="on_hold">On Hold</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div><label>Client Name</label><input value={project.client_name || ""} onChange={(e) => set("client_name", e.target.value)} /></div>
            <div><label>Client Phone</label><input value={project.client_phone || ""} onChange={(e) => set("client_phone", formatPhone(e.target.value))} placeholder="+1 (123) 456-7890" /></div>
            <div className="full"><label>Client Email</label><input value={project.client_email || ""} onChange={(e) => set("client_email", e.target.value)} /></div>
            <div><label>Homeowner Name</label><input value={project.homeowner_name || ""} onChange={(e) => set("homeowner_name", e.target.value)} /></div>
            <div><label>Homeowner Phone</label><input value={project.homeowner_phone || ""} onChange={(e) => set("homeowner_phone", formatPhone(e.target.value))} placeholder="+1 (123) 456-7890" /></div>
            <div><label>Contractor Name</label><input value={project.contractor_name || ""} onChange={(e) => set("contractor_name", e.target.value)} /></div>
            <div><label>Contractor License #</label><input value={project.contractor_license || ""} onChange={(e) => set("contractor_license", e.target.value)} /></div>
            <div className="full"><label>Contractor Phone</label><input value={project.contractor_phone || ""} onChange={(e) => set("contractor_phone", formatPhone(e.target.value))} placeholder="+1 (123) 456-7890" /></div>
            <div className="full"><label>Internal Notes</label><textarea rows={3} value={project.notes || ""} onChange={(e) => set("notes", e.target.value)} /></div>
          </div>
          <div className="actions-row">
            <button className="btn" type="submit" disabled={saving}>{saving ? "Saving..." : "Save Changes"}</button>
            {savedAt && !saving && <span style={{ color: "var(--success)", fontSize: 12.5, alignSelf: "center" }}>Saved</span>}
          </div>
        </form>
      )}
    </div>
  );
}
