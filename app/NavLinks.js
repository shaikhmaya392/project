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
            <circle cx="9" cy="8" r="3" />
            <path d="M3 20c0-3.2 2.7-5.6 6-5.6s6 2.4 6 5.6" strokeLinecap="round" />
            <path d="M16 3.4a3 3 0 010 5.8M18.5 19.6c0-2.2-1.1-3.9-2.9-4.8" strokeLinecap="round" />
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
