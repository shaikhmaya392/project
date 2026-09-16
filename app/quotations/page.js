"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("/api/quotations")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load quotations");
        setQuotations(Array.isArray(data) ? data : []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Quotations</h2>
          <p className="subtitle">Every quotation sent to a client, and whether it&apos;s been accepted.</p>
        </div>
      </div>

      {error && <div className="error-banner">Couldn&apos;t load quotations: {error}</div>}

      {loading ? (
        <p style={{ color: "var(--muted)" }}>Loading...</p>
      ) : quotations.length === 0 ? (
        <div className="table-wrap">
          <div className="empty-state">
            <div className="big">No quotations sent yet</div>
            Open a lead and click &quot;Send Quotation&quot; to create one.
          </div>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <colgroup>
              <col style={{ width: "11%" }} />
              <col style={{ width: "22%" }} />
              <col style={{ width: "22%" }} />
              <col style={{ width: "11%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "13%" }} />
              <col style={{ width: "56px" }} />
            </colgroup>
            <thead>
              <tr>
                <th>Quotation</th>
                <th>Client</th>
                <th>Project</th>
                <th>Total</th>
                <th>Status</th>
                <th>Valid Until</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {quotations.map((q) => (
                <tr key={q.id} onClick={() => window.open(`/quotations/${q.token}`, "_blank")}>
                  <td className="name-primary">{q.number}</td>
                  <td>
                    {q.client_name}
                    <br />
                    <span className="source-tag">{q.client_email}</span>
                  </td>
                  <td>{q.project_description || "-"}</td>
                  <td>${q.total.toLocaleString()}</td>
                  <td>
                    <span className={`badge ${q.status === "accepted" ? "status-won" : "status-new"}`}>{q.status}</span>
                  </td>
                  <td className="source-tag">{q.valid_until}</td>
                  <td>
                    <Link
                      href={`/quotations/${q.token}/edit`}
                      className="icon-btn"
                      title="Edit"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 20h9" strokeLinecap="round" />
                        <path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
