// Renders the HTML body of the quotation email. `baseUrl` is the site's
// own origin (e.g. https://project.vercel.app) so the logo image resolves
// to an absolute URL — email clients can't load a relative "/logo.png".
export function quotationEmailHtml(quotation, acceptUrl, baseUrl = "") {
  const logoUrl = baseUrl ? `${baseUrl}/logo.png` : "/logo.png";
  const font = `'Inter','Helvetica Neue',Helvetica,Arial,sans-serif`;

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

  return `
  <div style="font-family:${font};max-width:560px;margin:0 auto;background:#eef1f7;padding:32px 16px;">
    <div style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e4e8f1;box-shadow:0 4px 20px rgba(16,24,40,0.08);">

      <!-- Header: logo + company name. Plain white band, not a CSS blend-mode
           background — email clients don't reliably support mix-blend-mode,
           so the logo's own square badge is left as-is here (it renders fine
           on white, unlike on a colored band). -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-bottom:3px solid #e0a82e;">
        <tr>
          <td style="padding:22px 26px;">
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding-right:12px;">
                  <img src="${logoUrl}" width="40" height="40" alt="DS Permitting Services" style="display:block;width:40px;height:40px;object-fit:contain;border-radius:9px;" />
                </td>
                <td>
                  <div style="color:#0f1b33;font-weight:800;font-size:15px;line-height:1.2;">DS Permitting Services</div>
                  <div style="color:#667085;font-size:12px;margin-top:2px;">Fort McCoy, FL</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <div style="padding:24px 26px 0;">
        <div style="font-size:11px;letter-spacing:0.07em;color:#667085;text-transform:uppercase;font-weight:700;margin-bottom:14px;">
          Quotation ${escapeHtml(quotation.number)}
        </div>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13.5px;color:#374151;margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid #eef1f7;">
          <tr><td style="padding:4px 0;color:#667085;width:110px;">Client</td><td style="padding:4px 0;color:#101828;font-weight:600;">${escapeHtml(quotation.client_name || "")}</td></tr>
          <tr><td style="padding:4px 0;color:#667085;">Project</td><td style="padding:4px 0;color:#101828;font-weight:600;">${escapeHtml(quotation.project_description || "")}</td></tr>
          <tr><td style="padding:4px 0;color:#667085;">Location</td><td style="padding:4px 0;color:#101828;font-weight:600;">${escapeHtml(quotation.address || "")}</td></tr>
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

      <div style="padding:14px 26px 0;font-size:12px;color:#667085;">Quotation valid until <strong style="color:#101828;">${escapeHtml(quotation.valid_until || "")}</strong></div>

      <div style="padding:20px 26px 0;">
        <a href="${acceptUrl}" style="display:block;text-align:center;background:linear-gradient(135deg,#e0a82e,#b9821c);background-color:#e0a82e;color:#16130a;text-decoration:none;padding:13px 24px;border-radius:11px;font-weight:700;font-size:14px;">Accept Quotation</a>
      </div>

      <!-- Footer -->
      <div style="margin-top:22px;padding:18px 26px 22px;text-align:center;font-size:11px;color:#98a2b3;border-top:1px solid #eef1f7;">
        DS Permitting Services &middot; Fort McCoy, FL &middot; (352) 809-1717 &middot; dspermitting.com
      </div>
    </div>
  </div>`;
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
