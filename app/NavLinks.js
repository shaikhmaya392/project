"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const groups = [
  {
    label: "Overview",
    links: [
      {
        href: "/",
        label: "Dashboard",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="8" height="8" rx="1.5" />
            <rect x="13" y="3" width="8" height="5" rx="1.5" />
            <rect x="13" y="12" width="8" height="9" rx="1.5" />
            <rect x="3" y="14" width="8" height="7" rx="1.5" />
          </svg>
        ),
      },
    ],
  },
  {
    label: "Sales",
    links: [
      {
        href: "/leads",
        label: "Leads",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="8" r="3.2" />
            <path d="M5 20c0-3.6 3.1-6.4 7-6.4s7 2.8 7 6.4" strokeLinecap="round" />
          </svg>
        ),
      },
      {
        href: "/pipeline",
        label: "Pipeline",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 6h16M4 6l5 6.5V19l6-2v-4.5L20 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ),
      },
    ],
  },
  {
    label: "Workspace",
    links: [
      {
        href: "/settings",
        label: "Settings",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.7 1.7 0 00.34 1.87l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.7 1.7 0 00-1.87-.34 1.7 1.7 0 00-1 1.55V21a2 2 0 11-4 0v-.09a1.7 1.7 0 00-1-1.55 1.7 1.7 0 00-1.87.34l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.7 1.7 0 00.34-1.87 1.7 1.7 0 00-1.55-1H3a2 2 0 110-4h.09a1.7 1.7 0 001.55-1 1.7 1.7 0 00-.34-1.87l-.06-.06a2 2 0 112.83-2.83l.06.06a1.7 1.7 0 001.87.34H9a1.7 1.7 0 001-1.55V3a2 2 0 114 0v.09a1.7 1.7 0 001 1.55 1.7 1.7 0 001.87-.34l.06-.06a2 2 0 112.83 2.83l-.06.06a1.7 1.7 0 00-.34 1.87V9a1.7 1.7 0 001.55 1H21a2 2 0 110 4h-.09a1.7 1.7 0 00-1.55 1z" />
          </svg>
        ),
      },
    ],
  },
];

export default function NavLinks() {
  const pathname = usePathname();
  return (
    <>
      {groups.map((group) => (
        <div key={group.label}>
          <div className="nav-section-label">{group.label}</div>
          <nav>
            {group.links.map((link) => {
              const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
              return (
                <Link key={link.href} href={link.href} className={`nav-link${active ? " active" : ""}`}>
                  {link.icon}
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      ))}
    </>
  );
}
