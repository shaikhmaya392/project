"use client";

import { useEffect, useState } from "react";

export default function ProposalsPage() {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("/api/proposals")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load proposals");
        setProposals(Array.isArray(data) ? data : []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Proposals</h2>
          <p className="subtitle">Every proposal sent to a client, and whether it&apos;s been accepted.</p>
        </div>
      </div>

      {error && <div className="error-banner">Couldn&apos;t load proposals: {error}</div>}

      {loading ? (
        <p style={{ color: "var(--muted)" }}>Loading...</p>
      ) : proposals.length === 0 ? (
        <div className="table-wrap">
          <div className="empty-state">
            <div className="big">No proposals sent yet</div>
            Open a lead and click &quot;Send Proposal&quot; to create one.
          </div>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Proposal</th>
                <th>Client</th>
                <th>Project</th>
                <th>Total</th>
                <th>Status</th>
                <th>Valid Until</th>
              </tr>
            </thead>
            <tbody>
              {proposals.map((p) => (
                <tr key={p.id} onClick={() => window.open(`/proposals/${p.token}`, "_blank")}>
                  <td className="name-primary">{p.number}</td>
                  <td>
                    {p.client_name}
                    <br />
                    <span className="source-tag">{p.client_email}</span>
                  </td>
                  <td>{p.project_description || "-"}</td>
                  <td>${p.total.toLocaleString()}</td>
                  <td>
                    <span className={`badge ${p.status === "accepted" ? "status-won" : "status-new"}`}>{p.status}</span>
                  </td>
                  <td className="source-tag">{p.valid_until}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
