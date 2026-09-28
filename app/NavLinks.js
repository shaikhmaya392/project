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
            <circle cx="9" cy="8" r="3.5" />
            <path
              d="M2.5 20.5c0-3.6 2.9-6.3 6.5-6.3s6.5 2.7 6.5 6.3"
              strokeLinecap="round"
            />
            <path d="M19 8v6M22 11h-6" strokeLinecap="round" />
          </svg>
        ),
      },

      {
        href: "/clients",
        label: "Clients",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="8" cy="8" r="3" />
            <circle cx="16" cy="8" r="3" />
            <path d="M2.5 20c0-3 2.5-5.5 5.5-5.5S13.5 17 13.5 20" strokeLinecap="round" />
            <path d="M14.5 14.7c2.6.4 4.5 2.7 4.5 5.3" strokeLinecap="round" />
          </svg>
        ),
      },

      {
        href: "/projects",
        label: "Projects",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path
              d="M3 7.5A2.5 2.5 0 0 1 5.5 5h4l2 2h7A2.5 2.5 0 0 1 21 9.5v8A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5z"
              strokeLinejoin="round"
            />
          </svg>
        ),
      },

      {
        href: "/quotations",
        label: "Permits",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path
              d="M12 2l7 3v6c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V5z"
              strokeLinejoin="round"
            />
            <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ),
      },

      {
        href: "/documents",
        label: "Documents",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 3h9a1 1 0 0 1 1 1v13" strokeLinecap="round" strokeLinejoin="round" />
            <path
              d="M5 7h9a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z"
              strokeLinejoin="round"
            />
            <path d="M7 11h6M7 15h4" strokeLinecap="round" />
          </svg>
        ),
      },

      {
        href: "/inbox",
        label: "Messages",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path
              d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v9a2.5 2.5 0 0 1-2.5 2.5H10l-5 4v-4.5A2.5 2.5 0 0 1 3 14V5.5z"
              strokeLinejoin="round"
            />
            <path d="M7 8h10M7 12h6" strokeLinecap="round" />
          </svg>
        ),
      },

      {
        href: "/tasks",
        label: "Tasks",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="4" y="4" width="16" height="16" rx="2" />
            <path d="m8 12 2.5 2.5L16 9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ),
      },

      {
        href: "/invoices",
        label: "Invoices",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path
              d="M6 3h12v18l-3-2-3 2-3-2-3 2z"
              strokeLinejoin="round"
            />
            <path d="M9 8h6M9 12h6M9 16h4" strokeLinecap="round" />
          </svg>
        ),
      },

      {
        href: "/reports",
        label: "Reports",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 19V5M4 19h16" strokeLinecap="round" />
            <path d="M7 16v-4M11 16V8M15 16v-6M19 16V5" strokeLinecap="round" />
          </svg>
        ),
      },

      {
        href: "/settings",
        label: "Settings",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
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
              const active =
                link.href === "/"
                  ? pathname === "/"
                  : pathname === link.href ||
                    pathname.startsWith(`${link.href}/`);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`nav-link${active ? " active" : ""}`}
                  title={link.label}
                >
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
