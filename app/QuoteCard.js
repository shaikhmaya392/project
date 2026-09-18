"use client";

// The branded quotation card — shared by the "Preview" popup in the
// quotation builder and the public accept page, so what staff previews
// before sending is exactly what the client sees.
export default function QuoteCard({
  number,
  status,
  clientName,
  projectDescription,
  address,
  services,
  fees,
  total,
  validUntil,
  acceptedAt,
  onAccept,
  accepting,
}) {
  const accepted = status === "accepted";
  return (
    <div className="qc-card">
      <div className="qc-brand">
        <img src="/logo.png" alt="DS Permitting Services" className="qc-logo" />
        <div>
          <div className="qc-brand-name">DS Permitting Services</div>
          <div className="qc-brand-sub">Fort McCoy, FL</div>
        </div>
      </div>

      <div className="qc-tag-row">
        <span className="qc-tag">Quotation {number}</span>
        {status && <span className={`qc-status${accepted ? " accepted" : ""}`}>{accepted ? "Accepted" : "Awaiting Response"}</span>}
      </div>

      <div className="qc-meta">
        <div><span>Client</span><b>{clientName || "—"}</b></div>
        <div><span>Project</span><b>{projectDescription || "—"}</b></div>
        <div><span>Location</span><b>{address || "—"}</b></div>
      </div>

      <div className="qc-section">Services</div>
      {!services || services.length === 0 ? (
        <div className="qc-empty">No services selected yet</div>
      ) : (
        <ul className="qc-services">{services.map((s) => <li key={s}>{s}</li>)}</ul>
      )}

      <div className="qc-section">Fees</div>
      {!fees || fees.length === 0 ? (
        <div className="qc-empty">No fees added yet</div>
      ) : (
        <div className="qc-fees">
          {fees.map((f, i) => (
            <div className="qc-fee-row" key={i}><span>{f.label}</span><b>${Number(f.amount || 0).toLocaleString()}</b></div>
          ))}
        </div>
      )}

      <div className="qc-total-row"><span>Total</span><b>${Number(total || 0).toLocaleString()}</b></div>
      <div className="qc-valid">Quotation valid until <b>{validUntil}</b></div>

      {onAccept !== undefined && (
        accepted ? (
          <div className="qc-accepted-note">
            Accepted {acceptedAt ? `on ${new Date(acceptedAt).toLocaleString()}` : ""}. We&apos;ll be in touch shortly.
          </div>
        ) : (
          <button type="button" className="qc-accept-btn" onClick={onAccept} disabled={accepting}>
            {accepting ? "Accepting…" : "Accept Quotation"}
          </button>
        )
      )}
      {onAccept === undefined && <div className="qc-accept-btn qc-accept-btn-static">Accept Quotation</div>}

      <div className="qc-footer">DS Permitting Services · Fort McCoy, FL · (352) 809-1717 · dspermitting.com</div>
    </div>
  );
}
