"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function LeadDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

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

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lead),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      setLead(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this lead permanently?")) return;
    const res = await fetch(`/api/leads/${id}`, { method: "DELETE" });
    if (res.ok) router.push("/leads");
  }

  if (loading) return <p>Loading...</p>;
  if (!lead) return <div className="error-banner">{error || "Lead not found"}</div>;

  return (
    <div>
      <div className="page-header">
        <h2>{lead.name || "Lead"} #{lead.id}</h2>
        <span className="source-tag">
          {lead.source === "website_form" ? `From website form: ${lead.form_name || ""}` : "Manually added"}
        </span>
      </div>
      {error && <div className="error-banner">{error}</div>}
      <form className="card" onSubmit={handleSave}>
        <div className="form-grid">
          <div>
            <label>Name</label>
            <input value={lead.name || ""} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div>
            <label>Phone</label>
            <input value={lead.phone || ""} onChange={(e) => set("phone", e.target.value)} />
          </div>
          <div>
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
          <div>
            <label>Status</label>
            <select value={lead.status || "new"} onChange={(e) => set("status", e.target.value)}>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="in_progress">In Progress</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
            </select>
          </div>
          <div>
            <label>Assigned To</label>
            <input value={lead.assigned_to || ""} onChange={(e) => set("assigned_to", e.target.value)} />
          </div>
          <div className="full">
            <label>Internal Notes</label>
            <textarea rows={3} value={lead.notes || ""} onChange={(e) => set("notes", e.target.value)} />
          </div>
        </div>
        <div className="actions-row">
          <button className="btn" type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
          <button type="button" className="btn danger" onClick={handleDelete}>
            Delete Lead
          </button>
        </div>
      </form>
    </div>
  );
}
