"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { onPhoneChange } from "../../../lib/formatPhone";
import { PROJECT_STATUSES, projectStatusLabel } from "../../../lib/leadMeta";
import { US_STATES, COMMON_CITIES, FLORIDA_COUNTIES, lookupZip } from "../../../lib/usGeo";

const empty = {
  project_name: "",
  first_name: "",
  last_name: "",
  phone: "",
  email: "",
  company_name: "",
  license_number: "",
  homeowner: { same_as_customer: false, first_name: "", last_name: "", phone: "", email: "" },
  property: { street: "", city: "", state: "", zip: "", county: "" },
  type_of_work: "",
  permit_type: "",
  work_description: "",
  scope_of_work: "",
  job_value: "",
  status: "new",
  assigned_to: "",
  notes: "",
};

function NewProjectForm() {
  const router = useRouter();
  const params = useSearchParams();
  const leadId = params.get("lead");
  const [form, setForm] = useState(empty);
  const [team, setTeam] = useState([]);
  const [carry, setCarry] = useState(null); // documents/quote pulled from the lead, sent through as-is on submit
  const [nameTouched, setNameTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("/api/team").then((r) => r.json()).then((d) => setTeam(Array.isArray(d) ? d : [])).catch(() => {});
    if (!leadId) return;
    Promise.all([
      fetch(`/api/leads/${leadId}`).then((r) => r.json()),
      fetch("/api/quotations").then((r) => r.json()).catch(() => []),
    ]).then(([lead, quotations]) => {
      if (!lead || lead.error) return;
      const acceptedQuote = (Array.isArray(quotations) ? quotations : [])
        .filter((q) => q.lead_id === leadId && q.status === "accepted")
        .sort((a, b) => new Date(b.accepted_at || b.created_at) - new Date(a.accepted_at || a.created_at))[0];

      setForm((f) => ({
        ...f,
        first_name: (lead.name || "").split(/\s+/)[0] || "",
        last_name: (lead.name || "").split(/\s+/).slice(1).join(" "),
        phone: lead.phone || "",
        email: lead.email || "",
        company_name: lead.company_name || "",
        license_number: lead.license_number || "",
        homeowner: lead.homeowner || f.homeowner,
        property: lead.property || f.property,
        type_of_work: lead.permit_request?.type_of_work || lead.service_type || "",
        permit_type: lead.permit_request?.permit_type || "",
        work_description: lead.permit_request?.work_description || "",
        scope_of_work: lead.permit_request?.scope_of_work || lead.message || "",
        job_value: lead.permit_request?.job_value || "",
        assigned_to: lead.assigned_to || "",
      }));
      setCarry({
        documents: Array.isArray(lead.documents) ? lead.documents : [],
        quote_id: acceptedQuote?.id || null,
        quote_number: acceptedQuote?.number || "",
      });
    }).catch(() => {});
  }, [leadId]);

  // Suggested name: "<Type of Work> – <Property Address>". Only auto-fills
  // until the employee edits the name themselves.
  const suggestedName = useMemo(() => {
    const work = form.type_of_work || form.work_description;
    const addr = form.property.street;
    if (work && addr) return `${work} – ${addr}`;
    return work || addr || "";
  }, [form.type_of_work, form.work_description, form.property.street]);

  useEffect(() => {
    if (!nameTouched) setForm((f) => ({ ...f, project_name: suggestedName }));
  }, [suggestedName, nameTouched]);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }
  function setHomeowner(patch) {
    setForm((f) => ({ ...f, homeowner: { ...f.homeowner, ...patch } }));
  }
  function setProperty(patch) {
    setForm((f) => ({ ...f, property: { ...f.property, ...patch } }));
  }
  async function handleZipChange(raw) {
    const zip = raw.replace(/\D/g, "").slice(0, 5);
    setProperty({ zip });
    if (zip.length === 5) {
      const place = await lookupZip(zip);
      if (place) setForm((f) => ({ ...f, property: { ...f.property, zip, city: f.property.city || place.city, state: f.property.state || place.state } }));
    }
  }
  function toggleSameAsCustomer(checked) {
    if (checked) setHomeowner({ same_as_customer: true, first_name: form.first_name, last_name: form.last_name, phone: form.phone, email: form.email });
    else setHomeowner({ same_as_customer: false });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const property_address = [
        form.property.street,
        [form.property.city, form.property.state].filter(Boolean).join(", "),
        form.property.zip,
      ].filter(Boolean).join(" ");

      const activity = [{ text: "Project created", at: new Date().toISOString(), kind: "create" }];
      if (carry?.quote_id) activity.push({ text: `Linked to accepted quote ${carry.quote_number}`, at: new Date().toISOString(), kind: "quote" });
      if (carry?.documents?.length) activity.push({ text: `${carry.documents.length} document(s) carried over from the lead`, at: new Date().toISOString(), kind: "document" });

      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          property_address,
          lead_id: leadId || null,
          quote_id: carry?.quote_id || null,
          quote_number: carry?.quote_number || "",
          documents: carry?.documents || [],
          activity,
        }),
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
          <h2>{leadId ? "Create Project from Lead" : "New Project"}</h2>
          <p className="subtitle">{leadId ? "Everything below was carried over from the lead — check it, then create the project." : "Set up the project, its client, homeowner and scope."}</p>
        </div>
        <button type="button" className="btn secondary" onClick={() => router.back()}>Close</button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <form className="card" onSubmit={handleSubmit}>
        <div className="panel-title">Project Information</div>
        <div className="form-grid" style={{ marginBottom: 20 }}>
          <div className="full">
            <label>Project Name</label>
            <input
              value={form.project_name}
              onChange={(e) => { setNameTouched(true); set("project_name", e.target.value); }}
              placeholder={suggestedName || "e.g. Roof Replacement – 123 Main Street"}
              required
            />
          </div>
          <div>
            <label>Project ID</label>
            <input value="Assigned automatically on creation" disabled />
          </div>
        </div>

        <div className="panel-title">Customer / Contractor Information</div>
        <div className="form-grid" style={{ marginBottom: 20 }}>
          <div>
            <label>First Name</label>
            <input value={form.first_name} onChange={(e) => set("first_name", e.target.value)} required />
          </div>
          <div>
            <label>Last Name</label>
            <input value={form.last_name} onChange={(e) => set("last_name", e.target.value)} />
          </div>
          <div>
            <label>Phone</label>
            <input value={form.phone} onChange={(e) => onPhoneChange(e, (v) => set("phone", v))} placeholder="+1 (123) 456-7890" />
          </div>
          <div>
            <label>Email</label>
            <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
          </div>
          <div>
            <label>Company Name</label>
            <input value={form.company_name} onChange={(e) => set("company_name", e.target.value)} />
          </div>
          <div>
            <label>License Number</label>
            <input value={form.license_number} onChange={(e) => set("license_number", e.target.value)} />
          </div>
        </div>

        <div className="panel-title">Homeowner Information</div>
        <div className="form-grid" style={{ marginBottom: 20 }}>
          <div className="full" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" id="same-as-customer" checked={!!form.homeowner.same_as_customer} onChange={(e) => toggleSameAsCustomer(e.target.checked)} style={{ width: "auto" }} />
            <label htmlFor="same-as-customer" style={{ margin: 0 }}>Same as Customer</label>
          </div>
          <div>
            <label>First Name</label>
            <input value={form.homeowner.first_name} disabled={form.homeowner.same_as_customer} onChange={(e) => setHomeowner({ first_name: e.target.value })} />
          </div>
          <div>
            <label>Last Name</label>
            <input value={form.homeowner.last_name} disabled={form.homeowner.same_as_customer} onChange={(e) => setHomeowner({ last_name: e.target.value })} />
          </div>
          <div>
            <label>Phone</label>
            <input value={form.homeowner.phone} disabled={form.homeowner.same_as_customer} onChange={(e) => onPhoneChange(e, (v) => setHomeowner({ phone: v }))} placeholder="+1 (123) 456-7890" />
          </div>
          <div>
            <label>Email</label>
            <input type="email" value={form.homeowner.email} disabled={form.homeowner.same_as_customer} onChange={(e) => setHomeowner({ email: e.target.value })} />
          </div>
        </div>

        <div className="panel-title">Property Information</div>
        <div className="form-grid" style={{ marginBottom: 20 }}>
          <div className="full">
            <label>Property Address</label>
            <input value={form.property.street} onChange={(e) => setProperty({ street: e.target.value })} />
          </div>
          <div>
            <label>City</label>
            <input list="np-cities" value={form.property.city} onChange={(e) => setProperty({ city: e.target.value })} />
          </div>
          <div>
            <label>State</label>
            <input list="np-states" value={form.property.state} onChange={(e) => setProperty({ state: e.target.value })} />
          </div>
          <div>
            <label>ZIP Code</label>
            <input value={form.property.zip} onChange={(e) => handleZipChange(e.target.value)} placeholder="e.g. 32202" />
          </div>
          <div>
            <label>County / Jurisdiction</label>
            <input list="np-counties" value={form.property.county} onChange={(e) => setProperty({ county: e.target.value })} />
          </div>
          <datalist id="np-cities">{COMMON_CITIES.map((c) => <option key={c} value={c} />)}</datalist>
          <datalist id="np-states">{US_STATES.map((s) => <option key={s} value={s} />)}</datalist>
          <datalist id="np-counties">{FLORIDA_COUNTIES.map((c) => <option key={c} value={c} />)}</datalist>
        </div>

        <div className="panel-title">Project / Work Information</div>
        <div className="form-grid" style={{ marginBottom: 20 }}>
          <div>
            <label>Type of Work</label>
            <input value={form.type_of_work} onChange={(e) => set("type_of_work", e.target.value)} />
          </div>
          <div>
            <label>Permit Type</label>
            <input value={form.permit_type} onChange={(e) => set("permit_type", e.target.value)} />
          </div>
          <div>
            <label>Work Description</label>
            <input value={form.work_description} onChange={(e) => set("work_description", e.target.value)} />
          </div>
          <div>
            <label>Estimated Job Value ($)</label>
            <input type="number" value={form.job_value} onChange={(e) => set("job_value", e.target.value)} />
          </div>
          <div className="full">
            <label>Scope of Work</label>
            <textarea rows={3} value={form.scope_of_work} onChange={(e) => set("scope_of_work", e.target.value)} />
          </div>
        </div>

        <div className="panel-title">Project Management</div>
        <div className="form-grid" style={{ marginBottom: 20 }}>
          <div>
            <label>Project Status</label>
            <select value={form.status} onChange={(e) => set("status", e.target.value)}>
              {PROJECT_STATUSES.map((s) => <option key={s} value={s}>{projectStatusLabel(s)}</option>)}
            </select>
          </div>
          <div>
            <label>Assigned Employee</label>
            <select value={form.assigned_to} onChange={(e) => set("assigned_to", e.target.value)}>
              <option value="">Unassigned</option>
              {team.map((t) => <option key={t.id} value={t.name}>{t.name} ({t.role})</option>)}
              {form.assigned_to && !team.some((t) => t.name === form.assigned_to) && <option value={form.assigned_to}>{form.assigned_to}</option>}
            </select>
          </div>
        </div>

        {carry && (carry.documents.length > 0 || carry.quote_id) && (
          <div className="panel-title">Carried Over From Lead</div>
        )}
        {carry?.quote_id && (
          <p style={{ fontSize: 13, color: "var(--muted)", marginTop: -10, marginBottom: 8 }}>
            Accepted quote <b>{carry.quote_number}</b> will be linked to this project.
          </p>
        )}
        {carry && carry.documents.length > 0 && (
          <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 0, marginBottom: 20 }}>
            {carry.documents.length} document{carry.documents.length === 1 ? "" : "s"} already uploaded to the lead will be carried over — no need to re-upload.
          </p>
        )}

        <div className="panel-title">Internal Notes</div>
        <div className="form-grid" style={{ marginBottom: 8 }}>
          <div className="full">
            <textarea rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Staff-only notes" />
          </div>
        </div>

        <div className="actions-row">
          <button className="btn" type="submit" disabled={saving}>{saving ? "Creating..." : "Create Project"}</button>
          <button type="button" className="btn secondary" onClick={() => router.back()}>Cancel</button>
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
