"use client";

import { usePathname } from "next/navigation";
import NavLinks from "./NavLinks";
import UserFooter from "./UserFooter";

const NO_SHELL_PATHS = ["/login", "/signup"];

export default function AppShell({ children }) {
  const pathname = usePathname();
  const noShell = NO_SHELL_PATHS.includes(pathname) || pathname.startsWith("/proposals/");

  if (noShell) return <>{children}</>;

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <img src="/logo.png" alt="DS Permitting Services" />
          <div className="brand-text">
            <div className="brand-name">DS Permitting</div>
            <div className="brand-sub">CRM</div>
          </div>
        </div>
        <NavLinks />
        <UserFooter />
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}
