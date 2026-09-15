"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function LeadsPage() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [syncing, setSyncing] = useState(false);

  async function loadLeads() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/leads");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load leads");
      setLeads(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLeads();
  }, []);

  async function handleBackfill() {
    setSyncing(true);
    try {
      const res = await fetch("/api/leads/backfill", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Backfill failed");
      await loadLeads();
      alert(`Scanned ${data.scanned} website entries, imported ${data.imported} new leads.`);
    } catch (err) {
      alert(err.message);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h2>Leads</h2>
        <div className="actions-row" style={{ marginTop: 0 }}>
          <button className="btn secondary" onClick={handleBackfill} disabled={syncing}>
            {syncing ? "Syncing..." : "Sync from website"}
          </button>
          <Link href="/leads/new" className="btn">
            + New Lead
          </Link>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          Website se connect nahi ho paaya: {error}
          <br />
          Pehle WordPress par <code>wordpress/dscrm-leads-api.php</code> snippet install/activate karein (WPCode ke zariye).
        </div>
      )}

      {loading ? (
        <p>Loading...</p>
      ) : leads.length === 0 && !error ? (
        <div className="card empty-state">Abhi koi lead nahi hai. "Sync from website" try karein ya naya lead add karein.</div>
      ) : leads.length > 0 ? (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Contact</th>
              <th>Service</th>
              <th>Source</th>
              <th>Status</th>
              <th>Received</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id} onClick={() => (window.location.href = `/leads/${lead.id}`)}>
                <td>{lead.name || "(no name)"}</td>
                <td>
                  {lead.phone || "-"}
                  <br />
                  <span className="source-tag">{lead.email}</span>
                </td>
                <td>{lead.service_type || "-"}</td>
                <td>
                  <span className="source-tag">
                    {lead.source === "website_form" ? `Website: ${lead.form_name || "form"}` : "Manual"}
                  </span>
                </td>
                <td>
                  <span className={`badge status-${lead.status || "new"}`}>{lead.status || "new"}</span>
                </td>
                <td>{lead.created_at ? new Date(lead.created_at.replace(" ", "T")).toLocaleString() : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}
