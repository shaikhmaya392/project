"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

function initials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export default function LeadDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [lead, setLead] = useState(null);
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

  async function handleDelete() {
    if (!confirm("Delete this lead permanently?")) return;
    const res = await fetch(`/api/leads/${id}`, { method: "DELETE" });
    if (res.ok) router.push("/leads");
  }

  if (loading) return <p style={{ color: "var(--muted)" }}>Loading...</p>;
  if (!lead) return <div className="error-banner">{error || "Lead not found"}</div>;

  return (
    <div>
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div className="avatar" style={{ width: 44, height: 44, fontSize: 15 }}>
            {initials(lead.name)}
          </div>
          <div>
            <h2 style={{ marginBottom: 2 }}>{lead.name || "(no name)"}</h2>
            <p className="subtitle">
              {lead.source === "website_form" ? `From website: ${lead.form_name || "form"}` : "Manually added"}
              {lead.created_at && ` · ${new Date(lead.created_at).toLocaleString()}`}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" className="btn secondary" onClick={() => router.push("/leads")}>
            Close
          </button>
          <button type="button" className="btn danger" onClick={handleDelete}>
            Delete Lead
          </button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="two-col">
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div className="card">
            <div className="panel-title">Contact</div>
            <div className="contact-links">
              {lead.phone && (
                <a className="contact-link" href={`tel:${lead.phone}`}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h4l2 5-2.5 1.5a11 11 0 005 5L14 13l5 2v4a2 2 0 01-2 2A16 16 0 014 6a2 2 0 012-2z" />
                  </svg>
                  {lead.phone}
                </a>
              )}
              {lead.email && (
                <a className="contact-link" href={`mailto:${lead.email}`}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <path d="M3 7l9 6 9-6" />
                  </svg>
                  {lead.email}
                </a>
              )}
              {!lead.phone && !lead.email && <p style={{ color: "var(--muted)" }}>No contact info</p>}
            </div>
          </div>

          <div className="card">
            <div className="panel-title">Details</div>
            <div className="meta-list">
              <div className="meta-row">
                <span>Service type</span>
                <span>{lead.service_type || "-"}</span>
              </div>
              <div className="meta-row">
                <span>Address</span>
                <span>{lead.address || "-"}</span>
              </div>
              <div className="meta-row">
                <span>Source</span>
                <span>{lead.source === "website_form" ? lead.form_name || "Website form" : "Manual"}</span>
              </div>
            </div>
          </div>
        </div>

        <form className="card" onSubmit={handleSave}>
          <div className="panel-title">Edit lead</div>
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
              <label>Email</label>
              <input value={lead.email || ""} onChange={(e) => set("email", e.target.value)} />
            </div>
            <div>
              <label>Service / Permit Type</label>
              <input value={lead.service_type || ""} onChange={(e) => set("service_type", e.target.value)} />
            </div>
            <div className="full">
              <label>Address</label>
              <input value={lead.address || ""} onChange={(e) => set("address", e.target.value)} />
            </div>
            <div className="full">
              <label>Message / Details</label>
              <textarea rows={4} value={lead.message || ""} onChange={(e) => set("message", e.target.value)} />
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
