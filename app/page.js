"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function DashboardPage() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("/api/leads")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load leads");
        setLeads(Array.isArray(data) ? data : []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const total = leads.length;

  const now = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const thisWeek = leads.filter((l) => now - new Date(l.created_at).getTime() < weekMs).length;
  const lastWeek = leads.filter((l) => {
    const age = now - new Date(l.created_at).getTime();
    return age >= weekMs && age < weekMs * 2;
  }).length;
  const weekTrend = lastWeek === 0 ? (thisWeek > 0 ? 100 : 0) : Math.round(((thisWeek - lastWeek) / lastWeek) * 100);

  const fromWebsite = leads.filter((l) => l.source === "website_form").length;
  const manual = total - fromWebsite;

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>{today}</h2>
          <p className="subtitle">
            {loading ? "Loading..." : `${total} total leads · ${fromWebsite} from the website`}
          </p>
        </div>
        <Link href="/leads/new" className="btn">
          + New Lead
        </Link>
      </div>

      {error && <div className="error-banner">Couldn&apos;t load leads: {error}</div>}

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Total Leads</div>
          <div className="stat-value">{loading ? "-" : total}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">New This Week</div>
          <div className="stat-value">{loading ? "-" : thisWeek}</div>
          {!loading && (
            <span className={`stat-trend ${weekTrend > 0 ? "up" : weekTrend < 0 ? "down" : "flat"}`}>
              {weekTrend > 0 ? "↑" : weekTrend < 0 ? "↓" : "→"} {Math.abs(weekTrend)}% vs last week
            </span>
          )}
        </div>
        <div className="stat-card">
          <div className="stat-label">From Website</div>
          <div className="stat-value">{loading ? "-" : fromWebsite}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Manually Added</div>
          <div className="stat-value">{loading ? "-" : manual}</div>
        </div>
      </div>
    </div>
  );
}
