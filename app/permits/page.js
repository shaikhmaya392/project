"use client";

import { useEffect, useState } from "react";

export default function PermitsPage() {
  const [permits, setPermits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("/api/permits")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load permits");
        setPermits(Array.isArray(data) ? data : []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Permits</h2>
          <p className="subtitle">Every permit sent to a client, and whether it&apos;s been accepted.</p>
        </div>
      </div>

      {error && <div className="error-banner">Couldn&apos;t load permits: {error}</div>}

      {loading ? (
        <p style={{ color: "var(--muted)" }}>Loading...</p>
      ) : permits.length === 0 ? (
        <div className="table-wrap">
          <div className="empty-state">
            <div className="big">No permits sent yet</div>
            Open a lead and click &quot;Send Permit&quot; to create one.
          </div>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <colgroup>
              <col style={{ width: "12%" }} />
              <col style={{ width: "24%" }} />
              <col style={{ width: "24%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "13%" }} />
              <col style={{ width: "15%" }} />
            </colgroup>
            <thead>
              <tr>
                <th>Permit</th>
                <th>Client</th>
                <th>Project</th>
                <th>Total</th>
                <th>Status</th>
                <th>Valid Until</th>
              </tr>
            </thead>
            <tbody>
              {permits.map((p) => (
                <tr key={p.id} onClick={() => window.open(`/permits/${p.token}`, "_blank")}>
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
