"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const empty = {
  project_name: "",
  property_address: "",
  client_name: "",
  client_email: "",
  client_phone: "",
  homeowner_name: "",
  homeowner_phone: "",
  contractor_name: "",
  contractor_license: "",
  contractor_phone: "",
  scope_of_work: "",
  job_value: "",
  assigned_to: "",
  status: "active",
  notes: "",
};

function NewProjectForm() {
  const router = useRouter();
  const params = useSearchParams();
  const leadId = params.get("lead");
  const [form, setForm] = useState(empty);
  const [team, setTeam] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("/api/team").then((r) => r.json()).then((d) => setTeam(Array.isArray(d) ? d : [])).catch(() => {});
    if (leadId) {
      fetch(`/api/leads/${leadId}`)
        .then((r) => r.json())
        .then((lead) => {
          if (!lead || lead.error) return;
          setForm((f) => ({
            ...f,
            lead_id: leadId,
            client_name: lead.name || "",
            client_email: lead.email || "",
            client_phone: lead.phone || "",
            property_address: lead.address || "",
            project_name: lead.address ? `${lead.address}` : lead.name || "",
            scope_of_work: lead.message || "",
          }));
        })
        .catch(() => {});
    }
  }, [leadId]);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, lead_id: leadId || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create project");
      router.push(`/projects/${data.id}`);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>{leadId ? "Convert Lead to Project" : "New Project"}</h2>
          <p className="subtitle">Set up the project, its client, contractor and scope.</p>
        </div>
        <button type="button" className="btn secondary" onClick={() => router.back()}>
          Close
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <form className="card" onSubmit={handleSubmit}>
        <div className="panel-title">Project</div>
        <div className="form-grid" style={{ marginBottom: 20 }}>
          <div>
            <label>Project Name</label>
            <input value={form.project_name} onChange={(e) => set("project_name", e.target.value)} required />
          </div>
          <div>
            <label>Job Value ($)</label>
            <input type="number" value={form.job_value} onChange={(e) => set("job_value", e.target.value)} />
          </div>
          <div className="full">
            <label>Property Address</label>
            <input value={form.property_address} onChange={(e) => set("property_address", e.target.value)} />
          </div>
          <div className="full">
            <label>Scope of Work</label>
            <textarea rows={3} value={form.scope_of_work} onChange={(e) => set("scope_of_work", e.target.value)} />
          </div>
          <div>
            <label>Assigned Employee</label>
            <select value={form.assigned_to} onChange={(e) => set("assigned_to", e.target.value)}>
              <option value="">Unassigned</option>
              {team.map((t) => (
                <option key={t.id} value={t.name}>{t.name} ({t.role})</option>
              ))}
            </select>
          </div>
          <div>
            <label>Status</label>
            <select value={form.status} onChange={(e) => set("status", e.target.value)}>
              <option value="active">Active</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <div className="panel-title">Client</div>
        <div className="form-grid" style={{ marginBottom: 20 }}>
          <div>
            <label>Client Name</label>
            <input value={form.client_name} onChange={(e) => set("client_name", e.target.value)} />
          </div>
          <div>
            <label>Client Phone</label>
            <input value={form.client_phone} onChange={(e) => set("client_phone", e.target.value)} />
          </div>
          <div className="full">
            <label>Client Email</label>
            <input type="email" value={form.client_email} onChange={(e) => set("client_email", e.target.value)} />
          </div>
        </div>

        <div className="panel-title">Homeowner</div>
        <div className="form-grid" style={{ marginBottom: 20 }}>
          <div>
            <label>Homeowner Name</label>
            <input value={form.homeowner_name} onChange={(e) => set("homeowner_name", e.target.value)} />
          </div>
          <div>
            <label>Homeowner Phone</label>
            <input value={form.homeowner_phone} onChange={(e) => set("homeowner_phone", e.target.value)} />
          </div>
        </div>

        <div className="panel-title">Contractor</div>
        <div className="form-grid" style={{ marginBottom: 20 }}>
          <div>
            <label>Contractor Name</label>
            <input value={form.contractor_name} onChange={(e) => set("contractor_name", e.target.value)} />
          </div>
          <div>
            <label>Contractor License #</label>
            <input value={form.contractor_license} onChange={(e) => set("contractor_license", e.target.value)} />
          </div>
          <div>
            <label>Contractor Phone</label>
            <input value={form.contractor_phone} onChange={(e) => set("contractor_phone", e.target.value)} />
          </div>
        </div>

        <div className="panel-title">Internal Notes</div>
        <div className="form-grid" style={{ marginBottom: 8 }}>
          <div className="full">
            <textarea rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Staff-only notes" />
          </div>
        </div>

        <div className="actions-row">
          <button className="btn" type="submit" disabled={saving}>
            {saving ? "Creating..." : leadId ? "Create Project from Lead" : "Create Project"}
          </button>
          <button type="button" className="btn secondary" onClick={() => router.back()}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default function NewProjectPage() {
  return (
    <Suspense fallback={null}>
      <NewProjectForm />
    </Suspense>
  );
}
