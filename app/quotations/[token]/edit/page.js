"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "../../../ToastProvider";

const COMMON_SERVICES = [
  "Permit research",
  "Application preparation",
  "Permit submission",
  "Government coordination",
  "Plan-review coordination",
  "Correction coordination",
  "Permit issuance",
];

export default function EditQuotationPage() {
  const { token } = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const [quotation, setQuotation] = useState(null);
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [address, setAddress] = useState("");
  const [services, setServices] = useState([]);
  const [customService, setCustomService] = useState("");
  const [fees, setFees] = useState([]);
  const [validUntil, setValidUntil] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`/api/quotations/${token}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Quotation not found");
        setQuotation(data);
        setClientName(data.client_name || "");
        setClientEmail(data.client_email || "");
        setProjectDescription(data.project_description || "");
        setAddress(data.address || "");
        setServices(data.services || []);
        setFees(data.fees && data.fees.length ? data.fees : [{ label: "", amount: "" }]);
        setValidUntil(data.valid_until || "");
      })
      .catch((err) => setError(err.message));
  }, [token]);

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
      const res = await fetch(`/api/quotations/${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
      if (!res.ok) throw new Error(data.error || "Failed to save changes");
      showToast(`Quotation ${data.number} updated`, { type: "success" });
      router.push("/quotations");
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  if (!quotation && !error) return <p style={{ color: "var(--muted)" }}>Loading...</p>;
  if (error && !quotation) return <div className="error-banner">{error}</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Edit Quotation {quotation.number}</h2>
          <p className="subtitle">
            {quotation.status === "accepted"
              ? "Already accepted by the client - changes here won't resend the email automatically."
              : "Not yet accepted by the client."}
          </p>
        </div>
        <button type="button" className="btn secondary" onClick={() => router.push("/quotations")}>
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
            <input value={projectDescription} onChange={(e) => setProjectDescription(e.target.value)} />
          </div>
          <div className="full">
            <label>Location</label>
            <input value={address} onChange={(e) => setAddress(e.target.value)} />
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
            <button type="button" className="icon-btn danger" onClick={() => removeFeeRow(idx)} title="Remove">
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
            <label>Quotation Valid Until</label>
            <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} required />
          </div>
        </div>

        <div className="actions-row">
          <button className="btn" type="submit" disabled={saving || services.length === 0}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
          <button type="button" className="btn secondary" onClick={() => router.push("/quotations")}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
