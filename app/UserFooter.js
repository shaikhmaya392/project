"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function initials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export default function UserFooter() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => setUser(data.user))
      .catch(() => {});
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  if (!user) return null;

  return (
    <div className="user-footer">
      <div className="avatar" style={{ background: "linear-gradient(135deg, #f2b544, #c98a1f)" }}>
        {initials(user.name)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="user-footer-name">{user.name}</div>
        <div className="user-footer-role">{user.role === "team" ? "Team member" : user.role}</div>
      </div>
      <button type="button" className="user-footer-logout" onClick={handleLogout} title="Sign out">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
