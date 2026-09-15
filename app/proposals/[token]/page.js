"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import "../../login/auth.css";

export default function ProposalAcceptPage() {
  const { token } = useParams();
  const [proposal, setProposal] = useState(null);
  const [error, setError] = useState(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    fetch(`/api/proposals/${token}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Proposal not found");
        setProposal(data);
      })
      .catch((err) => setError(err.message));
  }, [token]);

  async function handleAccept() {
    setAccepting(true);
    const res = await fetch(`/api/proposals/${token}`, { method: "POST" });
    const data = await res.json();
    if (res.ok) setProposal(data);
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

        {!proposal ? (
          !error && <p style={{ color: "var(--muted)" }}>Loading proposal...</p>
        ) : (
          <div className="auth-card" style={{ maxWidth: "100%" }}>
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted)", marginBottom: 6 }}>
              Proposal {proposal.number}
            </div>
            <h2 style={{ marginBottom: 20 }}>
              {proposal.status === "accepted" ? "Proposal Accepted" : "Review Your Proposal"}
            </h2>

            <div className="meta-list" style={{ marginBottom: 20 }}>
              <div className="meta-row"><span>Client</span><span>{proposal.client_name}</span></div>
              <div className="meta-row"><span>Project</span><span>{proposal.project_description || "-"}</span></div>
              <div className="meta-row"><span>Location</span><span>{proposal.address || "-"}</span></div>
            </div>

            <div className="panel-title">Services</div>
            <ul style={{ paddingLeft: 18, fontSize: 13.5, marginBottom: 20, color: "var(--text)" }}>
              {proposal.services.map((s) => (
                <li key={s} style={{ marginBottom: 4 }}>{s}</li>
              ))}
            </ul>

            <div className="panel-title">Fees</div>
            <div className="meta-list" style={{ marginBottom: 8 }}>
              {proposal.fees.map((f, i) => (
                <div className="meta-row" key={i}>
                  <span>{f.label}</span>
                  <span>${Number(f.amount).toLocaleString()}</span>
                </div>
              ))}
            </div>
            <div className="meta-list" style={{ marginBottom: 20, borderTop: "1px solid var(--border-soft)", paddingTop: 10 }}>
              <div className="meta-row" style={{ fontWeight: 700, fontSize: 15 }}>
                <span>Total</span>
                <span>${proposal.total.toLocaleString()}</span>
              </div>
            </div>

            <p style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 20 }}>
              Valid until {proposal.valid_until}
            </p>

            {proposal.status === "accepted" ? (
              <div style={{ background: "var(--green-soft)", color: "var(--green)", padding: "12px 16px", borderRadius: 10, fontSize: 13.5, fontWeight: 600 }}>
                Accepted on {new Date(proposal.accepted_at).toLocaleString()}. We&apos;ll be in touch shortly.
              </div>
            ) : (
              <button className="btn" style={{ width: "100%", justifyContent: "center" }} onClick={handleAccept} disabled={accepting}>
                {accepting ? "Accepting..." : "Accept Proposal"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
