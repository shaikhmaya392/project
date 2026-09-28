"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { onPhoneChange } from "../../../lib/formatPhone";

const empty = {
  name: "",
  email: "",
  phone: "",
  contractor_name: "",
  property: { street: "", city: "", state: "", zip: "", county: "" },
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
  function setProperty(field, value) {
    setForm((f) => ({ ...f, property: { ...f.property, [field]: value } }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      // Address stays a plain string too, composed from the structured
      // fields — the leads list, search and dashboard all read it directly.
      const address = [
        form.property.street,
        [form.property.city, form.property.state].filter(Boolean).join(", "),
        form.property.zip,
      ].filter(Boolean).join(" ");

      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, address }),
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
            <input value={form.phone} onChange={(e) => onPhoneChange(e, (v) => set("phone", v))} placeholder="+1 (123) 456-7890" />
          </div>
          <div className="full">
            <label>Email Address</label>
            <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
          </div>
          <div className="full">
            <label>Contractor Name</label>
            <input value={form.contractor_name} onChange={(e) => set("contractor_name", e.target.value)} />
          </div>
          <div className="full">
            <label>Street Address</label>
            <input value={form.property.street} onChange={(e) => setProperty("street", e.target.value)} />
          </div>
          <div>
            <label>City</label>
            <input value={form.property.city} onChange={(e) => setProperty("city", e.target.value)} />
          </div>
          <div>
            <label>State</label>
            <input value={form.property.state} onChange={(e) => setProperty("state", e.target.value)} />
          </div>
          <div>
            <label>ZIP</label>
            <input value={form.property.zip} onChange={(e) => setProperty("zip", e.target.value)} />
          </div>
          <div>
            <label>County / Jurisdiction</label>
            <input value={form.property.county} onChange={(e) => setProperty("county", e.target.value)} />
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
