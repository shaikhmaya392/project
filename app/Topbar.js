"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";

const TITLES = [
  [/^\/$/, "Dashboard"],
  [/^\/leads\/new/, "New Lead"],
  [/^\/leads\/[^/]+\/quotation/, "Send Quotation"],
  [/^\/leads\/[^/]+/, "Lead Details"],
  [/^\/leads/, "Leads"],
  [/^\/quotations\/[^/]+\/edit/, "Edit Quotation"],
  [/^\/quotations/, "Quotations"],
  [/^\/projects\/new/, "New Project"],
  [/^\/projects\/[^/]+/, "Project Details"],
  [/^\/projects/, "Projects"],
  [/^\/staff/, "Staff"],
  [/^\/settings/, "Settings"],
  [/^\/reports/, "Reports"],
  [/^\/inbox/, "Inbox"],
  [/^\/pipeline/, "Pipeline"],
];

function initials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function titleFor(pathname) {
  for (const [re, label] of TITLES) if (re.test(pathname)) return label;
  return "";
}

const TOP_LEVEL = ["/", "/leads", "/quotations", "/projects", "/staff", "/settings", "/reports", "/inbox", "/pipeline", "/workflows"];

export default function Topbar({ onToggle }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [notifs, setNotifs] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d.user))
      .catch(() => {});
    fetch("/api/quotations")
      .then((r) => r.json())
      .then((data) => {
        if (!Array.isArray(data)) return;
        const items = [];
        data.forEach((q) => {
          if (q.accepted_at) {
            items.push({ title: `Quotation ${q.number} accepted`, detail: `${q.client_name} · $${(q.total || 0).toLocaleString()}`, time: q.accepted_at });
          }
        });
        items.sort((a, b) => new Date(b.time) - new Date(a.time));
        setNotifs(items.slice(0, 8));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    function onDoc(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setMenuOpen(false);
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  // Lead detail renders its own back/nav row, so keep the topbar clean there.
  // Lead detail and the quotation builder render their own nav/back row,
  // so keep the topbar clean there.
  const isLeadDetail = (/^\/leads\/[^/]+$/.test(pathname) && pathname !== "/leads/new") || /^\/leads\/[^/]+\/quotation/.test(pathname);
  const showBack = !TOP_LEVEL.includes(pathname) && !isLeadDetail;

  return (
    <header className="topbar" ref={wrapRef}>
      <button type="button" className="topbar-toggle" onClick={onToggle} title="Toggle sidebar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
        </svg>
      </button>
      {showBack && (
        <button type="button" className="topbar-back" onClick={() => router.back()} title="Go back">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back
        </button>
      )}
      <span className="topbar-title">{isLeadDetail ? "" : titleFor(pathname)}</span>

      <span className="topbar-spacer" />

      <button
        type="button"
        className="topbar-bell"
        title="Notifications"
        onClick={() => {
          setNotifOpen((v) => !v);
          setMenuOpen(false);
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M13.7 21a2 2 0 01-3.4 0" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {notifs.length > 0 && <span className="bell-dot" />}
      </button>

      <div
        className="topbar-user"
        onClick={() => {
          setMenuOpen((v) => !v);
          setNotifOpen(false);
        }}
      >
        <div className="avatar" style={{ background: "linear-gradient(135deg,#16296e,#0a1650)" }}>
          {initials(user?.name)}
        </div>
        <span className="topbar-user-name">{user?.name || "…"}</span>
        <svg className="topbar-user-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {notifOpen && (
        <div className="notif-panel">
          <div className="notif-panel-head">Notifications</div>
          {notifs.length === 0 ? (
            <div className="notif-empty">No new notifications</div>
          ) : (
            notifs.map((n, i) => (
              <div className="notif-item" key={i}>
                <div className="nt">{n.title}</div>
                <div className="nd">{n.detail}</div>
              </div>
            ))
          )}
        </div>
      )}

      {menuOpen && (
        <div className="topbar-menu">
          <div className="topbar-menu-head">
            <div className="nm">{user?.name}</div>
            <div className="em">{user?.email}</div>
          </div>
          <Link href="/settings" onClick={() => setMenuOpen(false)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19 12a7 7 0 00-.1-1l2-1.6-2-3.4-2.4 1a7 7 0 00-1.7-1L14.5 3h-4l-.3 2.6a7 7 0 00-1.7 1l-2.4-1-2 3.4 2 1.6a7 7 0 000 2l-2 1.6 2 3.4 2.4-1a7 7 0 001.7 1l.3 2.4h4l.3-2.4a7 7 0 001.7-1l2.4 1 2-3.4-2-1.6a7 7 0 00.1-1z" />
            </svg>
            Settings
          </Link>
          {user?.role === "admin" && (
            <Link href="/staff" onClick={() => setMenuOpen(false)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="9" cy="8" r="3" />
                <path d="M3 20c0-3 2.7-5 6-5s6 2 6 5" strokeLinecap="round" />
                <path d="M16 3.5a3 3 0 010 6" strokeLinecap="round" />
              </svg>
              Staff
            </Link>
          )}
          <button type="button" className="danger" onClick={handleLogout}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Sign out
          </button>
        </div>
      )}
    </header>
  );
}
