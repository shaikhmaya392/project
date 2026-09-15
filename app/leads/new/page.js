"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const empty = {
  name: "",
  email: "",
  phone: "",
  address: "",
  service_type: "",
  message: "",
  status: "new",
  assigned_to: "",
  notes: "",
};

export default function NewLeadPage() {
  const router = useRouter();
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create lead");
      router.push(`/leads/${data.id}`);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h2>New Lead</h2>
      </div>
      {error && <div className="error-banner">{error}</div>}
      <form className="card" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div>
            <label>Name</label>
            <input value={form.name} onChange={(e) => set("name", e.target.value)} required />
          </div>
          <div>
            <label>Phone</label>
            <input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </div>
          <div>
            <label>Email</label>
            <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
          </div>
          <div>
            <label>Service / Permit Type</label>
            <input value={form.service_type} onChange={(e) => set("service_type", e.target.value)} placeholder="e.g. Permit renewal, code violation" />
          </div>
          <div className="full">
            <label>Address</label>
            <input value={form.address} onChange={(e) => set("address", e.target.value)} />
          </div>
          <div className="full">
            <label>Message / Details</label>
            <textarea rows={4} value={form.message} onChange={(e) => set("message", e.target.value)} />
          </div>
          <div>
            <label>Status</label>
            <select value={form.status} onChange={(e) => set("status", e.target.value)}>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="in_progress">In Progress</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
            </select>
          </div>
          <div>
            <label>Assigned To</label>
            <input value={form.assigned_to} onChange={(e) => set("assigned_to", e.target.value)} />
          </div>
          <div className="full">
            <label>Internal Notes</label>
            <textarea rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>
        </div>
        <div className="actions-row">
          <button className="btn" type="submit" disabled={saving}>
            {saving ? "Saving..." : "Create Lead"}
          </button>
        </div>
      </form>
    </div>
  );
}
