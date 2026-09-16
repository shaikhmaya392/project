export function permitEmailHtml(permit, acceptUrl) {
  const rows = permit.services.map((s) => `<li style="margin-bottom:6px;">${s}</li>`).join("");
  const feeRows = permit.fees
    .map(
      (f) => `
    <tr>
      <td style="padding:8px 0;color:#374151;">${f.label}</td>
      <td style="padding:8px 0;text-align:right;color:#111827;">$${Number(f.amount || 0).toLocaleString()}</td>
    </tr>`
    )
    .join("");

  return `
  <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;background:#f5f6f9;padding:32px 16px;">
    <div style="background:#ffffff;border-radius:14px;padding:32px;border:1px solid #e6e8ee;">
      <div style="font-size:12px;letter-spacing:0.06em;color:#6b7086;text-transform:uppercase;margin-bottom:6px;">Permit ${permit.number}</div>
      <h1 style="font-size:20px;margin:0 0 20px;color:#111827;">DS Permitting Services</h1>

      <table style="width:100%;font-size:14px;color:#374151;margin-bottom:20px;">
        <tr><td style="padding:4px 0;color:#6b7086;width:120px;">Client</td><td style="padding:4px 0;">${permit.client_name}</td></tr>
        <tr><td style="padding:4px 0;color:#6b7086;">Project</td><td style="padding:4px 0;">${permit.project_description}</td></tr>
        <tr><td style="padding:4px 0;color:#6b7086;">Location</td><td style="padding:4px 0;">${permit.address}</td></tr>
      </table>

      <h3 style="font-size:14px;margin:0 0 10px;color:#111827;">Services</h3>
      <ul style="font-size:14px;color:#374151;padding-left:20px;margin:0 0 20px;">${rows}</ul>

      <h3 style="font-size:14px;margin:0 0 10px;color:#111827;">Fees</h3>
      <table style="width:100%;font-size:14px;border-top:1px solid #e6e8ee;">
        ${feeRows}
        <tr>
          <td style="padding:10px 0 0;font-weight:700;color:#111827;border-top:1px solid #e6e8ee;">Total</td>
          <td style="padding:10px 0 0;font-weight:700;text-align:right;color:#111827;border-top:1px solid #e6e8ee;">$${permit.total.toLocaleString()}</td>
        </tr>
      </table>

      <p style="font-size:13px;color:#6b7086;margin:20px 0;">Permit valid until <strong>${permit.valid_until}</strong></p>

      <a href="${acceptUrl}" style="display:inline-block;background:#3457ff;color:#fff;text-decoration:none;padding:12px 24px;border-radius:9px;font-weight:600;font-size:14px;">Accept Permit</a>

      <p style="font-size:12px;color:#9298ac;margin-top:28px;">DS Permitting Services &middot; Fort McCoy, FL &middot; 352-809-1717</p>
    </div>
  </div>`;
}
