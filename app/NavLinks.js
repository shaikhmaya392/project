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
            <circle cx="9" cy="8" r="3.6" />
            <path d="M2.5 20.5c0-3.6 2.9-6.3 6.5-6.3s6.5 2.7 6.5 6.3" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M19 8v6M22 11h-6" strokeLinecap="round" />
          </svg>
        ),
      },
      {
        href: "/quotations",
        label: "Quotations",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" strokeLinejoin="round" />
            <path d="M14 3v5h5" strokeLinejoin="round" />
            <path d="M9 13h6M9 17h6" strokeLinecap="round" />
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
