"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const empty = {
  name: "",
  email: "",
  phone: "",
  address: "",
  message: "",
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
        <div>
          <h2>New Lead</h2>
          <p className="subtitle">Same fields as the website&apos;s contact forms.</p>
        </div>
        <button type="button" className="btn secondary" onClick={() => router.push("/leads")}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 15, height: 15 }}>
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
          Close
        </button>
      </div>
      {error && <div className="error-banner">{error}</div>}
      <form className="card" onSubmit={handleSubmit}>
        <div className="panel-title">Lead details</div>
        <div className="form-grid">
          <div>
            <label>Name</label>
            <input value={form.name} onChange={(e) => set("name", e.target.value)} required />
          </div>
          <div>
            <label>Phone</label>
            <input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </div>
          <div className="full">
            <label>Email Address</label>
            <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
          </div>
          <div className="full">
            <label>Where is the work located?</label>
            <input value={form.address} onChange={(e) => set("address", e.target.value)} />
          </div>
          <div className="full">
            <label>Message</label>
            <textarea rows={4} value={form.message} onChange={(e) => set("message", e.target.value)} />
          </div>
        </div>
        <div className="actions-row">
          <button className="btn" type="submit" disabled={saving}>
            {saving ? "Saving..." : "Create Lead"}
          </button>
          <button type="button" className="btn secondary" onClick={() => router.push("/leads")}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
