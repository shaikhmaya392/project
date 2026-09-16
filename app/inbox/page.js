"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function InboxPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/leads").then((r) => r.json()),
      fetch("/api/permits").then((r) => r.json()),
    ])
      .then(([leads, permits]) => {
        const items = [];
        (leads || []).forEach((l) => {
          items.push({
            type: "lead_created",
            time: l.created_at,
            title: `New lead: ${l.name || "(no name)"}`,
            detail: l.source === "website_form" ? `Submitted via ${l.form_name || "website form"}` : "Added manually",
            href: `/leads/${l.id}`,
          });
          if (l.updated_at && l.updated_at !== l.created_at) {
            items.push({
              type: "lead_updated",
              time: l.updated_at,
              title: `${l.name || "Lead"} updated`,
              detail: `Status: ${(l.status || "new").replace("_", " ")}`,
              href: `/leads/${l.id}`,
            });
          }
        });
        (permits || []).forEach((p) => {
          items.push({
            type: "permit_sent",
            time: p.sent_at,
            title: `Permit ${p.number} sent to ${p.client_name}`,
            detail: `$${p.total.toLocaleString()} · valid until ${p.valid_until}`,
            href: `/permits`,
          });
          if (p.accepted_at) {
            items.push({
              type: "permit_accepted",
              time: p.accepted_at,
              title: `Permit ${p.number} accepted`,
              detail: `${p.client_name} · $${p.total.toLocaleString()}`,
              href: `/permits`,
            });
          }
        });
        items.sort((a, b) => new Date(b.time) - new Date(a.time));
        setEvents(items.slice(0, 60));
      })
      .finally(() => setLoading(false));
  }, []);

  const iconFor = (type) => {
    if (type === "permit_accepted") return { bg: "var(--green-soft)", color: "var(--green)" };
    if (type === "permit_sent") return { bg: "var(--blue-soft)", color: "var(--blue-dark)" };
    if (type === "lead_updated") return { bg: "var(--amber-soft)", color: "var(--amber)" };
    return { bg: "var(--blue-soft)", color: "var(--blue-dark)" };
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Inbox</h2>
          <p className="subtitle">A live feed of everything happening across leads and permits.</p>
        </div>
      </div>

      {loading ? (
        <p style={{ color: "var(--muted)" }}>Loading...</p>
      ) : events.length === 0 ? (
        <div className="table-wrap">
          <div className="empty-state">
            <div className="big">Nothing yet</div>
            Activity will appear here as leads come in and permits go out.
          </div>
        </div>
      ) : (
        <div className="card">
          {events.map((e, i) => {
            const colors = iconFor(e.type);
            return (
              <Link
                key={i}
                href={e.href}
                style={{
                  display: "flex",
                  gap: 12,
                  padding: "12px 8px",
                  textDecoration: "none",
                  borderBottom: i < events.length - 1 ? "1px solid var(--border-soft)" : "none",
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: colors.color,
                    marginTop: 6,
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="name-primary" style={{ fontSize: 13.5 }}>{e.title}</div>
                  <div className="name-secondary">{e.detail}</div>
                </div>
                <div className="source-tag" style={{ flexShrink: 0 }}>{timeAgo(e.time)}</div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
