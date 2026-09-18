"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "../../../ToastProvider";
import QuoteCard from "../../../QuoteCard";

const COMMON_SERVICES = [
  "Permit research",
  "Application preparation",
  "Permit submission",
  "Government coordination",
  "Plan-review coordination",
  "Correction coordination",
  "Permit issuance",
];

const I = {
  back: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  doc: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z" strokeLinejoin="round" /><path d="M14 3v5h5M9 13h6M9 17h4" strokeLinecap="round" /></svg>,
  check: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"><path d="M5 12.5l4.3 4.3L19 7.5" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  plus: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M12 5v14M5 12h14" strokeLinecap="round" /></svg>,
  trash: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M6 7l1 13a1 1 0 001 1h8a1 1 0 001-1l1-13" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  dollar: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v18M16 7.5C16 6 14.2 5 12 5S8 6 8 7.5 9.8 10 12 10.5s4 1 4 2.5-1.8 3-4 3-4-1-4-3" strokeLinecap="round" /></svg>,
  home: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 11l8-6 8 6" strokeLinecap="round" strokeLinejoin="round" /><path d="M6 10v9h12v-9" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  mail: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0122 16.92z" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  send: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M22 2L11 13" strokeLinecap="round" strokeLinejoin="round" /><path d="M22 2l-7 20-4-9-9-4 20-7z" strokeLinejoin="round" /></svg>,
  cal: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" strokeLinecap="round" /></svg>,
  eye: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12z" strokeLinecap="round" strokeLinejoin="round" /><circle cx="12" cy="12" r="3" /></svg>,
};

function defaultValidUntil() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

export default function NewQuotationPage() {
  const { id } = useParams();
  const router = useRouter();
  const { showToast } = useToast();
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
  const [previewOpen, setPreviewOpen] = useState(false);

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
  const goBack = () => router.push(`/leads/${id}`);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/quotations", {
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
      if (!res.ok) throw new Error(data.error || "Failed to send quotation");
      if (data.warning) {
        showToast(data.warning, { type: "error", duration: 7000 });
      } else {
        showToast(`Quotation ${data.quotation.number} sent to ${clientEmail}`, { type: "success" });
      }
      goBack();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  if (!lead) return <p style={{ color: "var(--muted)" }}>Loading…</p>;

  const customServices = services.filter((s) => !COMMON_SERVICES.includes(s));

  return (
    <div className="lead-detail quote-builder">
      {error && <div className="error-banner">{error}</div>}

      <form className="ld-card" onSubmit={handleSubmit}>
        {/* nav row */}
        <div className="ld-nav">
          <button type="button" className="ld-round" onClick={goBack} title="Back to lead">{I.back}</button>
          <span className="ld-nav-title">Send Quotation</span>
        </div>

        {/* hero */}
        <div className="ld-head">
          <div className="ld-avatar qb-avatar">{I.doc}</div>
          <div className="ld-head-main">
            <div className="ld-name-row"><h1>Quotation for {lead.name || "this lead"}</h1></div>
            <div className="ld-addr"><i className="pi sm">{I.mail}</i>Emailed to the client with a PDF and an Accept link</div>
          </div>
        </div>

        <div className="qb-body">
          <div className="qb-main">
            {/* Client & Project */}
            <div className="ld-panel">
              <div className="ld-panel-head"><span className="ld-ic">{I.home}</span><h3>Client &amp; Project</h3></div>
              <div className="ld-fields qb-grid">
                <label>Client Name<input value={clientName} onChange={(e) => setClientName(e.target.value)} required /></label>
                <label>Client Email<input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} required /></label>
                <label className="full">Project<input value={projectDescription} onChange={(e) => setProjectDescription(e.target.value)} placeholder="e.g. 123 Main Street Renovation" /></label>
                <label className="full">Location<input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g. Tampa, FL" /></label>
              </div>
            </div>

            {/* Services */}
            <div className="ld-panel">
              <div className="ld-panel-head"><span className="ld-ic">{I.check}</span><h3>Services Included</h3></div>
              <div className="qb-svc-grid">
                {COMMON_SERVICES.map((s) => {
                  const on = services.includes(s);
                  return (
                    <button type="button" key={s} className={`qb-svc${on ? " on" : ""}`} onClick={() => toggleService(s)}>
                      <span className="qb-svc-check">{on && I.check}</span>{s}
                    </button>
                  );
                })}
              </div>
              <div className="qb-add-row">
                <input
                  placeholder="Add a custom service…"
                  value={customService}
                  onChange={(e) => setCustomService(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomService(); } }}
                />
                <button type="button" className="btn-outline" onClick={addCustomService}>{I.plus} Add</button>
              </div>
              {customServices.length > 0 && (
                <div className="qb-chips">
                  {customServices.map((s) => (
                    <span className="qb-chip" key={s}>{s}<button type="button" onClick={() => removeService(s)}>×</button></span>
                  ))}
                </div>
              )}
              {services.length === 0 && <div className="qb-hint">Pick at least one service before sending.</div>}
            </div>

            {/* Fees */}
            <div className="ld-panel">
              <div className="ld-panel-head"><span className="ld-ic">{I.dollar}</span><h3>Fees</h3></div>
              <div className="qb-fees">
                {fees.map((f, idx) => (
                  <div className="qb-fee-row" key={idx}>
                    <input placeholder="Fee label" value={f.label} onChange={(e) => updateFee(idx, "label", e.target.value)} />
                    <div className="qb-amount">
                      <span>$</span>
                      <input type="number" placeholder="0" value={f.amount} onChange={(e) => updateFee(idx, "amount", e.target.value)} />
                    </div>
                    <button type="button" className="ld-del" onClick={() => removeFeeRow(idx)} title="Remove">{I.trash}</button>
                  </div>
                ))}
              </div>
              <button type="button" className="btn-outline" onClick={addFeeRow}>{I.plus} Add fee line</button>
            </div>
          </div>

          {/* Summary / send sidebar */}
          <div className="qb-side">
            <div className="ld-panel ld-manage qb-summary">
              <div className="ld-panel-head"><span className="ld-ic navy">{I.send}</span><h3>Summary</h3></div>

              <div className="qb-total-block">
                <span className="qb-total-label">Total</span>
                <span className="qb-total-value">${total.toLocaleString()}</span>
              </div>

              <div className="qb-summary-block">
                <div className="qb-summary-head">Services <b>{services.length}</b></div>
                {services.length === 0 ? (
                  <div className="qb-summary-empty">None selected yet</div>
                ) : (
                  <ul className="qb-summary-list">
                    {services.map((s) => <li key={s}>{s}</li>)}
                  </ul>
                )}
              </div>

              <div className="qb-summary-block">
                <div className="qb-summary-head">Fee lines <b>{fees.filter((f) => f.label).length}</b></div>
                {fees.filter((f) => f.label).length === 0 ? (
                  <div className="qb-summary-empty">None added yet</div>
                ) : (
                  <ul className="qb-summary-list qb-summary-fees">
                    {fees.filter((f) => f.label).map((f, i) => (
                      <li key={i}><span>{f.label}</span><b>${Number(f.amount || 0).toLocaleString()}</b></li>
                    ))}
                  </ul>
                )}
              </div>

              <label className="ld-field">Quotation Valid Until
                <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} required />
              </label>

              <button type="button" className="btn-outline full" onClick={() => setPreviewOpen(true)}>{I.eye} View</button>
              <button className="btn-navy full qb-send" type="submit" disabled={saving || services.length === 0}>
                {I.send}{saving ? "Sending…" : "Send Quotation"}
              </button>
              {services.length === 0 && <div className="qb-hint center">Select at least one service to enable sending</div>}
              <button type="button" className="btn-ghost full" onClick={goBack}>Cancel</button>
            </div>
          </div>
        </div>
      </form>

      {/* ============ PREVIEW ============ */}
      {previewOpen && (
        <div className="toast-backdrop" onClick={() => setPreviewOpen(false)}>
          <div className="qp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="qp-modal-head">
              <span>View — this is what the client will see</span>
              <button type="button" className="ld-modal-x" onClick={() => setPreviewOpen(false)} title="Close">×</button>
            </div>
            <div className="qp-scroll">
              <QuoteCard
                number="DRAFT"
                clientName={clientName || "—"}
                clientEmail={clientEmail}
                projectDescription={projectDescription || "—"}
                address={address || "—"}
                services={services}
                fees={fees.filter((f) => f.label)}
                total={total}
                validUntil={validUntil}
                createdAt={new Date().toISOString()}
              />
            </div>
            <div className="qp-modal-actions">
              <button type="button" className="btn-outline" onClick={() => setPreviewOpen(false)}>Close View</button>
              <button className="btn-navy" onClick={() => { setPreviewOpen(false); document.querySelector(".quote-builder form")?.requestSubmit(); }} disabled={services.length === 0}>
                {I.send} Send Quotation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
