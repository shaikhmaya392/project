"use client";

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function money(n) {
  return `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// The branded quotation document — shared by the "View" popup in the
// quotation builder, the public accept page, the emailed quotation and the
// PDF, so every place a client or staff member sees a quotation is the
// exact same invoice-style layout: logo + title header, a Quotation No#/
// Date/Valid Until strip beside a boxed total, a Bill To block, and a
// fully itemized table (each service and fee as its own line item).
export default function QuoteCard({
  number,
  status,
  clientName,
  clientEmail,
  projectDescription,
  address,
  services,
  fees,
  total,
  validUntil,
  createdAt,
  acceptedAt,
  onAccept,
  accepting,
}) {
  const accepted = status === "accepted";
  const items = [
    ...((services || []).map((s) => ({ desc: s, price: null, amount: null }))),
    ...((fees || []).map((f) => ({ desc: f.label, price: f.amount, amount: f.amount }))),
  ];

  return (
    <div className="qc-card">
      <div className="qc-head">
        <img src="/logo-color.png" alt="DS Permitting Services" className="qc-logo" />
        <div className="qc-head-right">
          <div className="qc-title">QUOTATION</div>
          {status && (
            <span className={`qc-status${accepted ? " accepted" : ""}`}>{accepted ? "Accepted" : "Awaiting Response"}</span>
          )}
          <div className="qc-company-name">DS Permitting Services</div>
          <div className="qc-company-line">Fort McCoy, FL</div>
          <div className="qc-company-line">(352) 809-1717</div>
          <div className="qc-company-line">dspermitting.com&nbsp;|&nbsp;info@dspermitting.com</div>
        </div>
      </div>

      <div className="qc-rule" />

      <div className="qc-info-strip">
        <div className="qc-meta-block">
          <div className="qc-meta-row"><span>Quotation No#:</span><b>{number}</b></div>
          <div className="qc-meta-row"><span>Date:</span><b>{fmtDate(createdAt)}</b></div>
          <div className="qc-meta-row"><span>Valid Until:</span><b>{validUntil}</b></div>
        </div>
        <div className="qc-total-box">
          <div className="qc-total-box-amount">{money(total)}</div>
          <div className="qc-total-box-label">QUOTATION TOTAL</div>
        </div>
      </div>

      <div className="qc-billto">
        <div className="qc-billto-label">BILL TO</div>
        <div className="qc-billto-name">{clientName || "—"}</div>
        {clientEmail && <div className="qc-billto-email">{clientEmail}</div>}
        {projectDescription && <div className="qc-billto-line">{projectDescription}</div>}
        {address && <div className="qc-billto-line">{address}</div>}
      </div>

      <table className="qc-items">
        <thead>
          <tr>
            <th>#</th>
            <th>Description</th>
            <th className="qc-ta-c">Qty</th>
            <th className="qc-ta-r">Price</th>
            <th className="qc-ta-r">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr><td colSpan={5} className="qc-items-empty">No services or fees added yet</td></tr>
          ) : (
            items.map((r, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td>{r.desc}</td>
                <td className="qc-ta-c">1</td>
                <td className="qc-ta-r">{r.price == null ? "—" : money(r.price)}</td>
                <td className="qc-ta-r qc-amount">{r.amount == null ? "—" : money(r.amount)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div className="qc-totals">
        <div className="qc-totals-row"><span>Subtotal</span><b>{money(total)}</b></div>
        <div className="qc-totals-rule" />
        <div className="qc-totals-row total"><span>TOTAL</span><b>{money(total)}</b></div>
      </div>

      <div className="qc-valid-banner">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" strokeLinecap="round" /></svg>
        <span>Quotation valid until <b>{validUntil}</b></span>
      </div>

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

      <div className="qc-notes">
        <div className="qc-notes-label">Notes</div>
        <div className="qc-notes-text">
          This quotation is an estimate based on the information provided and is not a final invoice.
          Pricing may be adjusted if project scope or municipality requirements change.
          Please reach out with any questions before accepting.
        </div>
      </div>

      <div className="qc-footer">
        <img src="/logo-color.png" alt="" className="qc-footer-logo" />
        <div className="qc-footer-text">
          <div className="qc-footer-name">DS Permitting Services</div>
          <div className="qc-footer-line">Fort McCoy, FL &middot; (352) 809-1717</div>
          <div className="qc-footer-line">dspermitting.com &middot; info@dspermitting.com</div>
          <div className="qc-footer-tag">Licensed &amp; insured permit expediting for Central &amp; North Florida</div>
        </div>
      </div>
    </div>
  );
}
