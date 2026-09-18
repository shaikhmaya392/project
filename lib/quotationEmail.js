// Renders the HTML body of the quotation email. `baseUrl` is the site's
// own origin (e.g. https://project.vercel.app) so the logo image resolves
// to an absolute URL — email clients can't load a relative path.
export function quotationEmailHtml(quotation, acceptUrl, baseUrl = "") {
  const logoUrl = baseUrl ? `${baseUrl}/logo-color.png` : "/logo-color.png";
  const font = `'Inter','Helvetica Neue',Helvetica,Arial,sans-serif`;
  const sentDate = quotation.created_at
    ? new Date(quotation.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "";

  const serviceRows = (quotation.services || [])
    .map((s) => `<li style="margin-bottom:6px;">${escapeHtml(s)}</li>`)
    .join("");

  const feeRows = (quotation.fees || [])
    .map(
      (f) => `
    <tr>
      <td style="padding:9px 0;color:#4a5677;font-size:13.5px;border-bottom:1px dashed #e4e8f1;">${escapeHtml(f.label)}</td>
      <td style="padding:9px 0;text-align:right;color:#101828;font-size:13.5px;font-weight:600;border-bottom:1px dashed #e4e8f1;">$${Number(f.amount || 0).toLocaleString()}</td>
    </tr>`
    )
    .join("");

  const metaRow = (label, value) =>
    value ? `<tr><td style="padding:4px 0;color:#667085;width:110px;vertical-align:top;">${label}</td><td style="padding:4px 0;color:#101828;font-weight:600;">${escapeHtml(value)}</td></tr>` : "";

  return `
  <div style="font-family:${font};max-width:560px;margin:0 auto;background:#eef1f7;padding:32px 16px;">
    <div style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e4e8f1;box-shadow:0 4px 20px rgba(16,24,40,0.08);">

      <!-- Header: logo + company name, on a plain white band with a gold rule. -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-bottom:3px solid #e0a82e;">
        <tr>
          <td style="padding:24px 26px;">
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding-right:14px;">
                  <img src="${logoUrl}" width="52" height="52" alt="DS Permitting Services" style="display:block;width:52px;height:52px;object-fit:contain;border-radius:11px;" />
                </td>
                <td>
                  <div style="color:#0f1b33;font-weight:800;font-size:16px;line-height:1.2;">DS Permitting Services</div>
                  <div style="color:#667085;font-size:12px;margin-top:2px;">Fort McCoy, FL</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <div style="padding:24px 26px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;">
          <tr>
            <td style="font-size:11px;letter-spacing:0.07em;color:#667085;text-transform:uppercase;font-weight:700;">Quotation ${escapeHtml(quotation.number)}</td>
            <td style="text-align:right;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin-left:auto;">
                <tr><td style="font-size:11px;font-weight:700;padding:4px 11px;border-radius:999px;background:#fdf1e0;color:#c77706;white-space:nowrap;">Awaiting Response</td></tr>
              </table>
            </td>
          </tr>
        </table>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13.5px;color:#374151;margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid #eef1f7;">
          ${metaRow("Client", quotation.client_name)}
          ${metaRow("Email", quotation.client_email)}
          ${metaRow("Project", quotation.project_description)}
          ${metaRow("Location", quotation.address)}
          ${metaRow("Date", sentDate)}
        </table>

        <div style="font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#16296e;margin-bottom:9px;">Services</div>
        <ul style="font-size:13.5px;color:#101828;padding-left:20px;margin:0 0 20px;">${serviceRows}</ul>

        <div style="font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#16296e;margin-bottom:4px;">Fees</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13.5px;">
          ${feeRows}
        </table>
      </div>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f9fc;margin-top:14px;">
        <tr>
          <td style="padding:14px 26px;font-weight:800;font-size:15.5px;color:#0f1b33;">Total</td>
          <td style="padding:14px 26px;text-align:right;font-weight:800;font-size:15.5px;color:#0f1b33;">$${Number(quotation.total || 0).toLocaleString()}</td>
        </tr>
      </table>

      <!-- Highlighted validity banner — this is the one date a customer must not miss -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 26px 0;width:calc(100% - 52px);background:#eaf0fb;border:1px solid #c3d6f2;border-radius:10px;">
        <tr>
          <td style="padding:11px 14px;font-size:12.5px;font-weight:600;color:#2c4f96;">
            &#128197; Quotation valid until <strong style="color:#16296e;">${escapeHtml(quotation.valid_until || "")}</strong>
          </td>
        </tr>
      </table>

      <div style="padding:20px 26px 0;">
        <a href="${acceptUrl}" style="display:block;text-align:center;background:linear-gradient(135deg,#e0a82e,#b9821c);background-color:#e0a82e;color:#16130a;text-decoration:none;padding:13px 24px;border-radius:11px;font-weight:700;font-size:14px;">Accept Quotation</a>
      </div>

      <!-- Footer -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:22px;background:#f7f9fc;border-top:1px solid #eef1f7;">
        <tr>
          <td style="padding:18px 26px 22px;">
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding-right:12px;vertical-align:top;">
                  <img src="${logoUrl}" width="30" height="30" alt="" style="display:block;width:30px;height:30px;object-fit:contain;opacity:0.85;" />
                </td>
                <td>
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
