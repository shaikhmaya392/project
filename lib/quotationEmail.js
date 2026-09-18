// Renders the HTML body of the quotation email. `baseUrl` is the site's
// own origin (e.g. https://project.vercel.app) so the logo image resolves
// to an absolute URL — email clients can't load a relative path.
//
// Layout mirrors the company's own invoice format (logo + title header,
// a Quotation No#/Date/Valid Until strip beside a boxed total, a Bill To
// block, and a fully itemized table) so the PDF and the email read as the
// same document family.
export function quotationEmailHtml(quotation, acceptUrl, baseUrl = "") {
  const logoUrl = baseUrl ? `${baseUrl}/logo-color.png` : "/logo-color.png";
  const font = `'Inter','Helvetica Neue',Helvetica,Arial,sans-serif`;
  const sentDate = quotation.created_at
    ? new Date(quotation.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "";
  const money = (n) => `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const accepted = quotation.status === "accepted";

  const items = [
    ...(quotation.services || []).map((s) => ({ desc: s, price: null, amount: null })),
    ...(quotation.fees || []).map((f) => ({ desc: f.label, price: f.amount, amount: f.amount })),
  ];

  const itemRows = items
    .map(
      (r, i) => `
    <tr style="background:${i % 2 === 1 ? "#f9fafc" : "#ffffff"};">
      <td style="padding:9px 8px;font-size:11px;color:#98a2b3;border-bottom:1px solid #f1f3f8;">${i + 1}</td>
      <td style="padding:9px 8px;font-size:11.5px;color:#101828;border-bottom:1px solid #f1f3f8;">${escapeHtml(r.desc)}</td>
      <td style="padding:9px 8px;font-size:11.5px;color:#98a2b3;text-align:center;border-bottom:1px solid #f1f3f8;">1</td>
      <td style="padding:9px 8px;font-size:11.5px;color:#98a2b3;text-align:right;border-bottom:1px solid #f1f3f8;">${r.price == null ? "&mdash;" : money(r.price)}</td>
      <td style="padding:9px 8px;font-size:11.5px;font-weight:700;color:#101828;text-align:right;border-bottom:1px solid #f1f3f8;">${r.amount == null ? "&mdash;" : money(r.amount)}</td>
    </tr>`
    )
    .join("");

  const metaRow = (label, value) =>
    value
      ? `<tr><td style="padding:2px 0;font-size:10.5px;font-weight:700;color:#667085;width:104px;vertical-align:top;">${label}</td><td style="padding:2px 0;font-size:11px;color:#101828;">${escapeHtml(value)}</td></tr>`
      : "";

  return `
  <div style="font-family:${font};max-width:600px;margin:0 auto;background:#eef1f7;padding:32px 16px;">
    <div style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e4e8f1;box-shadow:0 4px 20px rgba(16,24,40,0.08);">

      <!-- Header: logo left, document title + company block right -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:26px 30px 0;width:calc(100% - 60px);">
        <tr>
          <td style="width:80px;vertical-align:top;">
            <img src="${logoUrl}" width="70" height="70" alt="DS Permitting Services" style="display:block;width:70px;height:70px;object-fit:contain;" />
          </td>
          <td style="text-align:right;vertical-align:top;">
            <div style="font-size:22px;font-weight:800;color:#16296e;letter-spacing:0.01em;">QUOTATION</div>
            <div style="margin-top:7px;">
              <span style="display:inline-block;font-size:10.5px;font-weight:700;padding:4px 11px;border-radius:999px;background:${accepted ? "#e8f8ee" : "#fdf1e0"};color:${accepted ? "#16a34a" : "#c77706"};white-space:nowrap;">${accepted ? "Accepted" : "Awaiting Response"}</span>
            </div>
            <div style="font-size:12.5px;font-weight:700;color:#101828;margin-top:10px;">DS Permitting Services</div>
            <div style="font-size:10.5px;color:#667085;margin-top:2px;">Fort McCoy, FL</div>
            <div style="font-size:10.5px;color:#667085;">(352) 809-1717</div>
            <div style="font-size:10.5px;color:#667085;">dspermitting.com&nbsp;|&nbsp;info@dspermitting.com</div>
          </td>
        </tr>
      </table>

      <div style="height:3px;background:#e0a82e;margin:20px 30px 0;"></div>

      <!-- Info strip: quotation meta (left) + boxed total (right) -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 30px 0;width:calc(100% - 60px);">
        <tr>
          <td style="vertical-align:top;">
            <table role="presentation" cellpadding="0" cellspacing="0">
              ${metaRow("Quotation No#:", quotation.number)}
              ${metaRow("Date:", sentDate)}
              ${metaRow("Valid Until:", quotation.valid_until)}
            </table>
          </td>
          <td style="text-align:right;vertical-align:top;">
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin-left:auto;background:#eaf0fb;border:1px solid #c3d6f2;border-radius:10px;">
              <tr>
                <td style="padding:13px 22px;text-align:center;">
                  <div style="font-size:19px;font-weight:800;color:#16296e;">${money(quotation.total)}</div>
                  <div style="font-size:8px;font-weight:700;letter-spacing:0.06em;color:#2c4f96;margin-top:4px;">QUOTATION TOTAL</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <!-- Bill To -->
      <div style="margin:22px 30px 0;">
        <div style="font-size:10.5px;font-weight:700;letter-spacing:0.05em;color:#16296e;">BILL TO</div>
        <div style="font-size:14px;font-weight:700;color:#101828;margin-top:6px;">${escapeHtml(quotation.client_name || "—")}</div>
        ${quotation.client_email ? `<div style="font-size:11.5px;color:#2c4f96;margin-top:2px;">${escapeHtml(quotation.client_email)}</div>` : ""}
        ${quotation.project_description ? `<div style="font-size:11.5px;color:#667085;margin-top:2px;">${escapeHtml(quotation.project_description)}</div>` : ""}
        ${quotation.address ? `<div style="font-size:11.5px;color:#667085;">${escapeHtml(quotation.address)}</div>` : ""}
      </div>

      <!-- Itemized table: services + fees as line items -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 30px 0;width:calc(100% - 60px);border-collapse:collapse;">
        <tr style="background:#16296e;">
          <td style="padding:9px 8px;font-size:9px;font-weight:700;color:#ffffff;">#</td>
          <td style="padding:9px 8px;font-size:9px;font-weight:700;color:#ffffff;">DESCRIPTION</td>
          <td style="padding:9px 8px;font-size:9px;font-weight:700;color:#ffffff;text-align:center;">QTY</td>
          <td style="padding:9px 8px;font-size:9px;font-weight:700;color:#ffffff;text-align:right;">PRICE</td>
          <td style="padding:9px 8px;font-size:9px;font-weight:700;color:#ffffff;text-align:right;">AMOUNT</td>
        </tr>
        ${itemRows || `<tr><td colspan="5" style="padding:14px 8px;font-size:11px;color:#98a2b3;font-style:italic;">No services or fees added yet</td></tr>`}
      </table>

      <!-- Totals -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:12px 30px 0;width:calc(100% - 60px);">
        <tr>
          <td style="text-align:right;padding:3px 8px;font-size:11px;color:#667085;">Subtotal</td>
          <td style="text-align:right;padding:3px 8px;font-size:11px;color:#101828;width:80px;">${money(quotation.total)}</td>
        </tr>
        <tr><td colspan="2" style="padding-top:8px;border-top:1px solid #eef1f7;"></td></tr>
        <tr>
          <td style="text-align:right;padding:8px 8px 0;font-size:14px;font-weight:800;color:#16296e;">TOTAL</td>
          <td style="text-align:right;padding:8px 8px 0;font-size:14px;font-weight:800;color:#16296e;width:80px;">${money(quotation.total)}</td>
        </tr>
      </table>

      <!-- Highlighted validity banner — this is the one date a customer must not miss -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 30px 0;width:calc(100% - 60px);background:#eaf0fb;border:1px solid #c3d6f2;border-radius:10px;">
        <tr>
          <td style="padding:13px 16px;font-size:12.5px;font-weight:600;color:#2c4f96;">
            &#128197; Quotation valid until <strong style="color:#16296e;">${escapeHtml(quotation.valid_until || "")}</strong>
          </td>
        </tr>
      </table>

      <div style="padding:22px 30px 0;">
        <a href="${acceptUrl}" style="display:block;text-align:center;background:linear-gradient(135deg,#e0a82e,#b9821c);background-color:#e0a82e;color:#16130a;text-decoration:none;padding:13px 24px;border-radius:11px;font-weight:700;font-size:14px;">Accept Quotation</a>
      </div>

      <!-- Notes -->
      <div style="margin:22px 30px 0;padding-bottom:6px;">
        <div style="font-size:10.5px;font-weight:700;color:#16296e;">NOTES</div>
        <div style="font-size:10.5px;color:#98a2b3;margin-top:6px;line-height:1.7;">
          This quotation is an estimate based on the information provided and is not a final invoice.<br />
          Pricing may be adjusted if project scope or municipality requirements change.<br />
          Please reach out with any questions before accepting.
        </div>
      </div>

      <!-- Footer -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:22px;background:#f7f9fc;border-top:1px solid #eef1f7;">
        <tr>
          <td style="padding:18px 26px 22px;">
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding-right:14px;vertical-align:top;">
                  <img src="${logoUrl}" width="70" height="70" alt="" style="display:block;width:70px;height:70px;object-fit:contain;opacity:0.9;" />
                </td>
                <td style="vertical-align:middle;">
                  <div style="font-size:12px;font-weight:700;color:#4a5677;">DS Permitting Services</div>
                  <div style="font-size:11px;color:#98a2b3;margin-top:2px;">Fort McCoy, FL &middot; (352) 809-1717</div>
                  <div style="font-size:11px;color:#98a2b3;">dspermitting.com &middot; info@dspermitting.com</div>
                  <div style="font-size:10.5px;color:#98a2b3;font-style:italic;margin-top:3px;">Licensed &amp; insured permit expediting for Central &amp; North Florida</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  </div>`;
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
