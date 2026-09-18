"use client";

import { Fragment, useEffect, useState } from "react";
import { useToast } from "../ToastProvider";
import { onPhoneChange } from "../../lib/formatPhone";

const ROLES = ["admin", "agent", "marketing", "support"];

function initials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

const emptyForm = { name: "", email: "", password: "", role: "agent", phone: "", address: "" };

export default function StaffPage() {
  const { showToast } = useToast();
  const [me, setMe] = useState(null);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [needsBootstrap, setNeedsBootstrap] = useState(false);

  function load() {
    setLoading(true);
    setError(null);
    setNeedsBootstrap(false);
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => setMe(data.user))
      .catch(() => {});
    fetch("/api/staff")
      .then(async (res) => {
        const data = await res.json();
        if (res.status === 403) {
          setNeedsBootstrap(true);
          return;
        }
        if (!res.ok) throw new Error(data.error || "Failed to load staff");
        setStaff(Array.isArray(data) ? data : []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleBootstrap() {
    if (!me) return;
    const res = await fetch(`/api/staff/${me.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      return;
    }
    load();
  }

  function startEdit(user) {
    setEditingId(user.id);
    setEditForm({ ...user, password: "" });
  }

  async function saveEdit() {
    setSaving(true);
    const payload = { ...editForm };
    if (!payload.password) delete payload.password;
    const res = await fetch(`/api/staff/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      showToast(data.error, { type: "error" });
      return;
    }
    setEditingId(null);
    load();
    showToast("Staff member updated", { type: "success" });
  }

  async function handleRemove(id) {
    if (!confirm("Remove this staff member?")) return;
    const res = await fetch(`/api/staff/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error, { type: "error" });
      return;
    }
    load();
    showToast("Staff member removed", { type: "success" });
  }

  async function handleAdd(e) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(addForm),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      showToast(data.error, { type: "error" });
      return;
    }
    setShowAdd(false);
    setAddForm(emptyForm);
    load();
    showToast("Staff member added", { type: "success" });
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Staff</h2>
          <p className="subtitle">Everyone with access to this CRM, and what they can do.</p>
        </div>
        {!needsBootstrap && (
          <button type="button" className="btn" onClick={() => setShowAdd((v) => !v)}>
            + Add Staff
          </button>
        )}
      </div>

      {error && <div className="error-banner">{error}</div>}

      {needsBootstrap ? (
        <div className="card">
          <div className="panel-title">No admin yet</div>
          <p style={{ fontSize: 13.5, color: "var(--muted)", marginBottom: 16 }}>
            Nobody is set as admin, so staff management is locked. Since you&apos;re signed in, you can make
            yourself the admin now.
          </p>
          <button type="button" className="btn" onClick={handleBootstrap}>
            Make me the admin
          </button>
        </div>
      ) : loading ? (
        <p style={{ color: "var(--muted)" }}>Loading...</p>
      ) : (
        <>
          {showAdd && (
            <form className="card" onSubmit={handleAdd} style={{ marginBottom: 16 }}>
              <div className="panel-title">New staff member</div>
              <div className="form-grid">
                <div>
                  <label>Name</label>
                  <input value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} required />
                </div>
                <div>
                  <label>Role</label>
                  <select value={addForm.role} onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}>
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>Email</label>
                  <input type="email" value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} required />
                </div>
                <div>
                  <label>Temporary Password</label>
                  <input type="password" value={addForm.password} onChange={(e) => setAddForm({ ...addForm, password: e.target.value })} minLength={6} required />
                </div>
                <div>
                  <label>Phone</label>
                  <input value={addForm.phone} onChange={(e) => onPhoneChange(e, (v) => setAddForm({ ...addForm, phone: v }))} placeholder="+1 (123) 456-7890" />
                </div>
                <div>
                  <label>Address</label>
                  <input value={addForm.address} onChange={(e) => setAddForm({ ...addForm, address: e.target.value })} />
                </div>
              </div>
              <div className="actions-row">
                <button className="btn" type="submit" disabled={saving}>
                  {saving ? "Adding..." : "Add Staff Member"}
                </button>
                <button type="button" className="btn secondary" onClick={() => setShowAdd(false)}>
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="table-wrap">
            <table>
              <colgroup>
                <col style={{ width: "26%" }} />
                <col style={{ width: "32%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "56px" }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Contact</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {staff.map((u) => (
                  <Fragment key={u.id}>
                    <tr onClick={() => (editingId === u.id ? setEditingId(null) : startEdit(u))}>
                      <td>
                        <div className="name-cell">
                          <div className="avatar">{initials(u.name)}</div>
                          <div className="name-primary">{u.name}{u.id === me?.id ? " (you)" : ""}</div>
                        </div>
                      </td>
                      <td>
                        {u.email}
                        <br />
                        <span className="source-tag">{u.phone || "-"}</span>
                      </td>
                      <td>
                        <span className={`badge ${u.role === "admin" ? "status-won" : "status-new"}`}>{u.role}</span>
                      </td>
                      <td className="source-tag">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "-"}</td>
                      <td>
                        <div className="row-actions">
                          {u.id !== me?.id && (
                            <button
                              type="button"
                              className="icon-btn danger"
                              title="Remove"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemove(u.id);
                              }}
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0l-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {editingId === u.id && (
                      <tr>
                        <td colSpan={5} style={{ background: "#fafbfd" }}>
                          <div className="form-grid" style={{ padding: "12px 4px" }}>
                            <div>
                              <label>Name</label>
                              <input value={editForm.name || ""} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                            </div>
                            <div>
                              <label>Role</label>
                              <select value={editForm.role || "agent"} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}>
                                {ROLES.map((r) => (
                                  <option key={r} value={r}>{r}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label>Email</label>
                              <input type="email" value={editForm.email || ""} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
                            </div>
                            <div>
                              <label>New Password (optional)</label>
                              <input type="password" placeholder="Leave blank to keep current" value={editForm.password || ""} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} />
                            </div>
                            <div>
                              <label>Phone</label>
                              <input value={editForm.phone || ""} onChange={(e) => onPhoneChange(e, (v) => setEditForm({ ...editForm, phone: v }))} placeholder="+1 (123) 456-7890" />
                            </div>
                            <div>
                              <label>Address</label>
                              <input value={editForm.address || ""} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} />
                            </div>
                          </div>
                          <div className="actions-row" style={{ padding: "0 4px 12px" }}>
                            <button type="button" className="btn" onClick={saveEdit} disabled={saving}>
                              {saving ? "Saving..." : "Save"}
                            </button>
                            <button type="button" className="btn secondary" onClick={() => setEditingId(null)}>
                              Cancel
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
