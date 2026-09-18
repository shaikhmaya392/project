"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useToast } from "../ToastProvider";
import { formatPhone } from "../../lib/formatPhone";

export default function SettingsPage() {
  const { showToast } = useToast();
  const [status, setStatus] = useState(null);
  const [me, setMe] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/status").then((res) => res.json()).then(setStatus).catch(() => {});
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        setMe(data.user);
        setForm({ name: data.user?.name || "", phone: data.user?.phone || "", address: data.user?.address || "", password: "" });
      })
      .catch(() => {});
  }, []);

  async function handleSaveAccount(e) {
    e.preventDefault();
    if (!me) return;
    setSaving(true);
    setSaved(false);
    const payload = { name: form.name, phone: form.phone, address: form.address };
    if (form.password) payload.password = form.password;
    const res = await fetch(`/api/staff/${me.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      showToast(data.error, { type: "error" });
      return;
    }
    setMe(data);
    setForm((f) => ({ ...f, password: "" }));
    setSaved(true);
    showToast("Account updated", { type: "success" });
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Settings</h2>
          <p className="subtitle">Your account, business details, and website integration status.</p>
        </div>
      </div>

      <div className="two-col">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card">
            <h3 className="panel-title">My Account</h3>
            {!form ? (
              <p style={{ color: "var(--muted)", fontSize: 13 }}>Loading...</p>
            ) : (
              <form onSubmit={handleSaveAccount}>
                <div className="form-grid">
                  <div>
                    <label>Name</label>
                    <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </div>
                  <div>
                    <label>Role</label>
                    <input value={me?.role || ""} disabled style={{ opacity: 0.6, textTransform: "capitalize" }} />
                  </div>
                  <div>
                    <label>Email</label>
                    <input value={me?.email || ""} disabled style={{ opacity: 0.6 }} />
                  </div>
                  <div>
                    <label>Phone</label>
                    <input value={form.phone} onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })} placeholder="+1 (123) 456-7890" />
                  </div>
                  <div className="full">
                    <label>Address</label>
                    <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                  </div>
                  <div className="full">
                    <label>New Password</label>
                    <input
                      type="password"
                      placeholder="Leave blank to keep current password"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                    />
                  </div>
                </div>
                <div className="actions-row">
                  <button className="btn" type="submit" disabled={saving}>
                    {saving ? "Saving..." : "Save Account"}
                  </button>
                  {saved && <span style={{ color: "var(--success)", fontSize: 12.5, alignSelf: "center" }}>Saved</span>}
                </div>
              </form>
            )}
          </div>

          <div className="card">
            <h3 className="panel-title">
              Team
              <Link href="/staff" className="btn ghost" style={{ padding: 0, fontSize: 12.5 }}>
                Manage staff &rarr;
              </Link>
            </h3>
            <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6, marginBottom: 0 }}>
              {me?.role === "admin"
                ? "As the admin, you can add staff, change their roles, reset passwords, and remove access from the Staff page."
                : "Only an admin can add or manage other staff accounts."}
            </p>
          </div>

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
