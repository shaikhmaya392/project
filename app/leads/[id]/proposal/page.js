"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const COMMON_SERVICES = [
  "Permit research",
  "Application preparation",
  "Permit submission",
  "Government coordination",
  "Plan-review coordination",
  "Correction coordination",
  "Permit issuance",
];

function defaultValidUntil() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

export default function NewProposalPage() {
  const { id } = useParams();
  const router = useRouter();
  const [lead, setLead] = useState(null);
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [address, setAddress] = useState("");
  const [services, setServices] = useState([]);
  const [customService, setCustomService] = useState("");
  const [fees, setFees] = useState([
    { label: "Permit Service Fee", amount: "" },
    { label: "Estimated Municipality Fees", amount: "" },
  ]);
  const [validUntil, setValidUntil] = useState(defaultValidUntil());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`/api/leads/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setLead(data);
        setClientName(data.name || "");
        setClientEmail(data.email || "");
        setAddress(data.address || "");
        setProjectDescription(data.service_type || "");
      })
      .catch(() => {});
  }, [id]);

  function toggleService(s) {
    setServices((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  function addCustomService() {
    if (!customService.trim()) return;
    setServices((prev) => [...prev, customService.trim()]);
    setCustomService("");
  }

  function removeService(s) {
    setServices((prev) => prev.filter((x) => x !== s));
  }

  function updateFee(idx, field, value) {
    setFees((prev) => prev.map((f, i) => (i === idx ? { ...f, [field]: value } : f)));
  }

  function addFeeRow() {
    setFees((prev) => [...prev, { label: "", amount: "" }]);
  }

  function removeFeeRow(idx) {
    setFees((prev) => prev.filter((_, i) => i !== idx));
  }

  const total = fees.reduce((sum, f) => sum + (Number(f.amount) || 0), 0);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_id: id,
          client_name: clientName,
          client_email: clientEmail,
          project_description: projectDescription,
          address,
          services,
          fees: fees.filter((f) => f.label),
          valid_until: validUntil,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send proposal");
      if (data.warning) {
        alert(data.warning);
      } else {
        alert(`Proposal ${data.proposal.number} sent to ${clientEmail}`);
      }
      router.push("/leads");
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  if (!lead) return <p style={{ color: "var(--muted)" }}>Loading...</p>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Send Proposal</h2>
          <p className="subtitle">For {lead.name || "this lead"} &middot; emailed with an Accept link</p>
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
        <div className="panel-title">Client &amp; project</div>
        <div className="form-grid" style={{ marginBottom: 20 }}>
          <div>
            <label>Client Name</label>
            <input value={clientName} onChange={(e) => setClientName(e.target.value)} required />
          </div>
          <div>
            <label>Client Email</label>
            <input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} required />
          </div>
          <div className="full">
            <label>Project</label>
            <input
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
              placeholder="e.g. 123 Main Street Renovation"
            />
          </div>
          <div className="full">
            <label>Location</label>
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g. Tampa, FL" />
          </div>
        </div>

        <div className="panel-title">Services</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          {COMMON_SERVICES.map((s) => (
            <button
              type="button"
              key={s}
              className={`pill${services.includes(s) ? " active" : ""}`}
              onClick={() => toggleService(s)}
            >
              {s}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <input
            placeholder="Add a custom service..."
            value={customService}
            onChange={(e) => setCustomService(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustomService();
              }
            }}
          />
          <button type="button" className="btn secondary" onClick={addCustomService}>
            Add
          </button>
        </div>
        {services.length > 0 && (
          <ul style={{ marginBottom: 20, paddingLeft: 18, fontSize: 13.5 }}>
            {services.map((s) => (
              <li key={s} style={{ marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ flex: 1 }}>{s}</span>
                <button
                  type="button"
                  onClick={() => removeService(s)}
                  style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", fontSize: 12 }}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="panel-title">Fees</div>
        {fees.map((f, idx) => (
          <div key={idx} style={{ display: "flex", gap: 10, marginBottom: 10, alignItems: "center" }}>
            <input
              placeholder="Fee label"
              value={f.label}
              onChange={(e) => updateFee(idx, "label", e.target.value)}
              style={{ flex: 2 }}
            />
            <input
              type="number"
              placeholder="Amount"
              value={f.amount}
              onChange={(e) => updateFee(idx, "amount", e.target.value)}
              style={{ flex: 1 }}
            />
            <button
              type="button"
              className="icon-btn danger"
              onClick={() => removeFeeRow(idx)}
              title="Remove"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        ))}
        <button type="button" className="btn secondary" onClick={addFeeRow} style={{ marginBottom: 16 }}>
          + Add fee line
        </button>

        <div className="meta-list" style={{ marginBottom: 20 }}>
          <div className="meta-row" style={{ fontSize: 15, fontWeight: 700 }}>
            <span>Total</span>
            <span>${total.toLocaleString()}</span>
          </div>
        </div>

        <div className="form-grid" style={{ marginBottom: 8 }}>
          <div>
            <label>Proposal Valid Until</label>
            <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} required />
          </div>
        </div>

        <div className="actions-row">
          <button className="btn" type="submit" disabled={saving || services.length === 0}>
            {saving ? "Sending..." : "Send Proposal"}
          </button>
          <button type="button" className="btn secondary" onClick={() => router.push("/leads")}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
