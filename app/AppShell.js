"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import NavLinks from "./NavLinks";
import Topbar from "./Topbar";

const NO_SHELL_PATHS = ["/login", "/signup"];

export default function AppShell({ children }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem("dscrm_sidebar_collapsed") === "1");
    } catch {}
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("dscrm_sidebar_collapsed", next ? "1" : "0");
      } catch {}
      return next;
    });
  }

  const noShell = NO_SHELL_PATHS.includes(pathname) || /^\/quotations\/[^/]+$/.test(pathname);
  if (noShell) return <>{children}</>;

  return (
    <div className={`app${collapsed ? " collapsed" : ""}`}>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-emblem">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 2l8 3v6c0 5-3.5 8.5-8 11-4.5-2.5-8-6-8-11V5z" strokeLinejoin="round" />
              <path d="M8.5 12l2.5 2.5 5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="brand-word">
            <div className="brand-name">DS PERMITTING</div>
            <div className="brand-sub">Services</div>
          </div>
        </div>
        <NavLinks />
      </aside>
      <div className="main-col">
        <Topbar onToggle={toggle} />
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
