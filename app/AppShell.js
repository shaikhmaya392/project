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
          <img src="/logo.png" alt="DS Permitting Services" className="brand-logo" />
          <span className="brand-name">DS Permitting</span>
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
