"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import "../login/auth.css";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Signup failed");
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-visual">
        <div className="auth-visual-inner">
          <img src="/logo.png" alt="DS Permitting Services" className="auth-logo-badge" />
          <h1>Create your account</h1>
          <p>Join your team&apos;s workspace to start tracking leads and permits.</p>
        </div>
      </div>
      <div className="auth-panel">
        <form className="auth-card" onSubmit={handleSubmit}>
          <h2>Create your account</h2>
          <p className="auth-sub">Join the DS Permitting workspace</p>
          {error && <div className="error-banner">{error}</div>}
          <label>Full Name</label>
          <input value={form.name} onChange={(e) => set("name", e.target.value)} required autoFocus />
          <label>Email</label>
          <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required />
          <label>Password</label>
          <input
            type="password"
            value={form.password}
            onChange={(e) => set("password", e.target.value)}
            required
            minLength={6}
          />
          <button className="btn" type="submit" disabled={loading} style={{ width: "100%", justifyContent: "center", marginTop: 8 }}>
            {loading ? "Creating account..." : "Create Account"}
          </button>
          <p className="auth-switch">
            Already have an account? <Link href="/login">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
