"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import "../../login/auth.css";

export default function PermitAcceptPage() {
  const { token } = useParams();
  const [permit, setPermit] = useState(null);
  const [error, setError] = useState(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    fetch(`/api/permits/${token}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Permit not found");
        setPermit(data);
      })
      .catch((err) => setError(err.message));
  }, [token]);

  async function handleAccept() {
    setAccepting(true);
    const res = await fetch(`/api/permits/${token}`, { method: "POST" });
    const data = await res.json();
    if (res.ok) setPermit(data);
    setAccepting(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "40px 16px" }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <img src="/logo.png" alt="DS Permitting Services" style={{ width: 44, height: 44, borderRadius: 12, background: "#0b0b10", padding: 6 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>DS Permitting Services</div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>Fort McCoy, FL</div>
          </div>
        </div>

        {error && <div className="error-banner">{error}</div>}

        {!permit ? (
          !error && <p style={{ color: "var(--muted)" }}>Loading permit...</p>
        ) : (
          <div className="auth-card" style={{ maxWidth: "100%" }}>
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted)", marginBottom: 6 }}>
              Permit {permit.number}
            </div>
            <h2 style={{ marginBottom: 20 }}>
              {permit.status === "accepted" ? "Permit Accepted" : "Review Your Permit"}
            </h2>

            <div className="meta-list" style={{ marginBottom: 20 }}>
              <div className="meta-row"><span>Client</span><span>{permit.client_name}</span></div>
              <div className="meta-row"><span>Project</span><span>{permit.project_description || "-"}</span></div>
              <div className="meta-row"><span>Location</span><span>{permit.address || "-"}</span></div>
            </div>

            <div className="panel-title">Services</div>
            <ul style={{ paddingLeft: 18, fontSize: 13.5, marginBottom: 20, color: "var(--text)" }}>
              {permit.services.map((s) => (
                <li key={s} style={{ marginBottom: 4 }}>{s}</li>
              ))}
            </ul>

            <div className="panel-title">Fees</div>
            <div className="meta-list" style={{ marginBottom: 8 }}>
              {permit.fees.map((f, i) => (
                <div className="meta-row" key={i}>
                  <span>{f.label}</span>
                  <span>${Number(f.amount).toLocaleString()}</span>
                </div>
              ))}
            </div>
            <div className="meta-list" style={{ marginBottom: 20, borderTop: "1px solid var(--border-soft)", paddingTop: 10 }}>
              <div className="meta-row" style={{ fontWeight: 700, fontSize: 15 }}>
                <span>Total</span>
                <span>${permit.total.toLocaleString()}</span>
              </div>
            </div>

            <p style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 20 }}>
              Valid until {permit.valid_until}
            </p>

            {permit.status === "accepted" ? (
              <div style={{ background: "var(--green-soft)", color: "var(--green)", padding: "12px 16px", borderRadius: 10, fontSize: 13.5, fontWeight: 600 }}>
                Accepted on {new Date(permit.accepted_at).toLocaleString()}. We&apos;ll be in touch shortly.
              </div>
            ) : (
              <button className="btn" style={{ width: "100%", justifyContent: "center" }} onClick={handleAccept} disabled={accepting}>
                {accepting ? "Accepting..." : "Accept Permit"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
