"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const groups = [
  {
    label: "Main",
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
                <Link key={link.href} href={link.href} className={`nav-link${active ? " active" : ""}`} title={link.label}>
                  {link.icon}
                  <span className="nav-label">{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      ))}
    </>
  );
}
