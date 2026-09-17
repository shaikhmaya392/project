"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const STATUSES = ["new", "contacted", "in_progress", "won", "lost"];
const PROJECT_TYPES = [
  "Residential Renovation", "Commercial", "Window / Door", "Solar Panels",
  "Shutters", "Sign Permit", "Office Remodel", "Permit Renewal", "Code Violation",
];

export default function LeadDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [lead, setLead] = useState(null);
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [savedAt, setSavedAt] = useState(null);

  useEffect(() => {
    fetch(`/api/leads/${id}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load lead");
        setLead(data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
    fetch("/api/team").then((r) => r.json()).then((d) => setTeam(Array.isArray(d) ? d : [])).catch(() => {});
  }, [id]);

  function set(field, value) {
    setLead((l) => ({ ...l, [field]: value }));
  }

  async function persist(patch) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      setLead(data);
      setSavedAt(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function handleSave(e) {
    e.preventDefault();
    persist(lead);
  }

  function handleStatus(s) {
    set("status", s);
    persist({ ...lead, status: s });
  }

  async function handleDelete() {
    if (!confirm("Delete this lead permanently?")) return;
    const res = await fetch(`/api/leads/${id}`, { method: "DELETE" });
    if (res.ok) router.push("/leads");
  }

  if (loading) return <p style={{ color: "var(--muted)" }}>Loading...</p>;
  if (!lead) return <div className="error-banner">{error || "Lead not found"}</div>;

  return (
    <div>
      {/* Brand header strip */}
      <div className="lead-hero">
        <div className="lead-hero-main">
          <div className="lead-hero-name">{lead.name || "(no name)"}</div>
          <div className="lead-hero-sub">
            {lead.source === "website_form" ? `From website${lead.form_name ? ` · ${lead.form_name}` : ""}` : "Manually added"}
            {lead.created_at && ` · ${new Date(lead.created_at).toLocaleDateString()}`}
          </div>
        </div>
        <div className="lead-hero-actions">
          {lead.phone && (
            <a className="hero-btn" href={`tel:${lead.phone}`} title="Call">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h4l2 5-2.5 1.5a11 11 0 005 5L14 13l5 2v4a2 2 0 01-2 2A16 16 0 014 6a2 2 0 012-2z" /></svg>
              Call
            </a>
          )}
          {lead.email && (
            <a className="hero-btn" href={`mailto:${lead.email}`} title="Email">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>
              Email
            </a>
          )}
          <button type="button" className="btn gold" onClick={() => router.push(`/leads/${id}/quotation`)}>Send Quotation</button>
          <button type="button" className="btn" onClick={() => router.push(`/projects/new?lead=${id}`)}>Convert to Project</button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="two-col">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card">
            <div className="panel-title">Status</div>
            <div className="status-picker">
              {STATUSES.map((s) => (
                <button key={s} type="button" className={`status-option status-${s}${lead.status === s ? " selected" : ""}`} onClick={() => handleStatus(s)}>
                  {s.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="panel-title">Contact</div>
            <div className="contact-links">
              {lead.phone && (
                <a className="contact-link" href={`tel:${lead.phone}`}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h4l2 5-2.5 1.5a11 11 0 005 5L14 13l5 2v4a2 2 0 01-2 2A16 16 0 014 6a2 2 0 012-2z" /></svg>
                  {lead.phone}
                </a>
              )}
              {lead.email && (
                <a className="contact-link" href={`mailto:${lead.email}`}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>
                  {lead.email}
                </a>
              )}
              {!lead.phone && !lead.email && <p style={{ color: "var(--muted)" }}>No contact info</p>}
            </div>
          </div>

          {lead.message && (
            <div className="card">
              <div className="panel-title">Message</div>
              <div className="message-block">{lead.message}</div>
            </div>
          )}
        </div>

        <form className="card" onSubmit={handleSave}>
          <div className="panel-title">Lead details</div>
          <div className="form-grid">
            <div>
              <label>Name</label>
              <input value={lead.name || ""} onChange={(e) => set("name", e.target.value)} />
            </div>
            <div>
              <label>Phone</label>
              <input value={lead.phone || ""} onChange={(e) => set("phone", e.target.value)} />
            </div>
            <div className="full">
              <label>Email Address</label>
              <input value={lead.email || ""} onChange={(e) => set("email", e.target.value)} />
            </div>
            <div className="full">
              <label>Work Location</label>
              <input value={lead.address || ""} onChange={(e) => set("address", e.target.value)} />
            </div>
            <div>
              <label>Project Type</label>
              <input list="project-types" value={lead.service_type || ""} onChange={(e) => set("service_type", e.target.value)} placeholder="e.g. Residential Renovation" />
              <datalist id="project-types">
                {PROJECT_TYPES.map((p) => <option key={p} value={p} />)}
              </datalist>
            </div>
            <div>
              <label>Assigned To</label>
              <select value={lead.assigned_to || ""} onChange={(e) => set("assigned_to", e.target.value)}>
                <option value="">Unassigned</option>
                {team.map((t) => <option key={t.id} value={t.name}>{t.name} ({t.role})</option>)}
                {lead.assigned_to && !team.some((t) => t.name === lead.assigned_to) && <option value={lead.assigned_to}>{lead.assigned_to}</option>}
              </select>
            </div>
            <div className="full">
              <label>Next Action</label>
              <input value={lead.next_action || ""} onChange={(e) => set("next_action", e.target.value)} placeholder="e.g. Contact client, Follow up Friday" />
            </div>
            <div className="full">
              <label>Message / Details</label>
              <textarea rows={4} value={lead.message || ""} onChange={(e) => set("message", e.target.value)} />
            </div>
            <div className="full">
              <label>Internal Notes</label>
              <textarea rows={3} value={lead.notes || ""} onChange={(e) => set("notes", e.target.value)} placeholder="Staff-only notes" />
            </div>
          </div>
          <div className="actions-row">
            <button className="btn" type="submit" disabled={saving}>{saving ? "Saving..." : "Save Changes"}</button>
            <button type="button" className="btn secondary" onClick={() => router.push("/leads")}>Close</button>
            <button type="button" className="btn danger" onClick={handleDelete} style={{ marginLeft: "auto" }}>Delete</button>
            {savedAt && !saving && <span style={{ color: "var(--success)", fontSize: 12.5, alignSelf: "center" }}>Saved</span>}
          </div>
        </form>
      </div>
    </div>
  );
}
