"use client";

import { useEffect, useState } from "react";

export default function SettingsPage() {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    fetch("/api/status")
      .then((res) => res.json())
      .then(setStatus)
      .catch(() => {});
  }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Settings</h2>
          <p className="subtitle">Business details and website integration status.</p>
        </div>
      </div>

      <div className="two-col">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card">
            <h3 className="panel-title">Business</h3>
            <div className="meta-list">
              <div className="meta-row"><span>Company</span><span>DS Permitting Services</span></div>
              <div className="meta-row"><span>Website</span><span>dspermitting.com</span></div>
              <div className="meta-row"><span>Phone</span><span>352-809-1717</span></div>
              <div className="meta-row"><span>Email</span><span>dspermitservices@gmail.com</span></div>
              <div className="meta-row"><span>Location</span><span>Fort McCoy, FL</span></div>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="panel-title">Website Integration</h3>
          <div className="meta-list" style={{ marginBottom: 16 }}>
            <div className="meta-row">
              <span>Live webhook</span>
              <span>
                {status ? (
                  <span className={`badge ${status.webhookConfigured ? "status-won" : "status-lost"}`}>
                    {status.webhookConfigured ? "Key configured" : "Not configured"}
                  </span>
                ) : (
                  "..."
                )}
              </span>
            </div>
            <div className="meta-row">
              <span>Leads from website</span>
              <span>{status ? status.websiteLeads : "..."}</span>
            </div>
            <div className="meta-row">
              <span>Manually added leads</span>
              <span>{status ? status.manualLeads : "..."}</span>
            </div>
            <div className="meta-row">
              <span>Last website lead</span>
              <span>{status?.lastWebsiteLeadAt ? new Date(status.lastWebsiteLeadAt).toLocaleString() : "-"}</span>
            </div>
          </div>
          <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>
            New form submissions on dspermitting.com are pushed here in real time via a small WordPress
            snippet (<code style={{ background: "#f0f1f5", padding: "1px 6px", borderRadius: 5 }}>wordpress/dscrm-leads-api.php</code>{" "}
            in the project repo). Historical entries were imported once during setup.
          </p>
        </div>
      </div>
    </div>
  );
}
