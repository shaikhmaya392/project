"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const STATUS_LABELS = {
  new: "New",
  contacted: "Contacted",
  in_progress: "In Progress",
  quote_sent: "Quotation Sent",
  quote_accepted: "Quotation Accepted",
};
const STATUSES = Object.keys(STATUS_LABELS);
const PRIORITIES = ["High", "Medium", "Low"];
const NEXT_ACTIONS = [
  "Call client", "Follow up with client", "Send quotation", "Schedule inspection",
  "Await documents", "Review corrections", "Submit permit application", "Close lead",
];
const PROJECT_TYPES = [
  "Residential Renovation", "Commercial", "Window / Door", "Solar Panels",
  "Shutters", "Sign Permit", "Office Remodel", "Permit Renewal", "Code Violation",
];
const TABS = ["Overview", "Documents", "Messages", "Quotes", "Notes", "Activity"];

const I = {
  back: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  dots: <svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg>,
  person: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="3.4" /><path d="M5 20c0-3.6 3.1-6.4 7-6.4s7 2.8 7 6.4" strokeLinecap="round" /></svg>,
  pin: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 21s7-5.6 7-11a7 7 0 10-14 0c0 5.4 7 11 7 11z" strokeLinejoin="round" /><circle cx="12" cy="10" r="2.5" /></svg>,
  phone: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h4l2 5-2.5 1.5a11 11 0 005 5L14 13l5 2v4a2 2 0 01-2 2A16 16 0 014 6a2 2 0 012-2z" /></svg>,
  mail: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>,
  home: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 11l8-6 8 6" strokeLinecap="round" strokeLinejoin="round" /><path d="M6 10v9h12v-9" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  doc: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z" strokeLinejoin="round" /><path d="M14 3v5h5M9 13h6M9 17h4" strokeLinecap="round" /></svg>,
  dollar: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v18M16 7.5C16 6 14.2 5 12 5S8 6 8 7.5 9.8 10 12 10.5s4 1 4 2.5-1.8 3-4 3-4-1-4-3" strokeLinecap="round" /></svg>,
  clock: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" strokeLinecap="round" /></svg>,
  globe: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 010 18M12 3a15 15 0 000 18" /></svg>,
  flag: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 21V4M5 4h11l-1.5 3.5L16 11H5" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  gear: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 00-.1-1l2-1.6-2-3.4-2.4 1a7 7 0 00-1.7-1L14.5 3h-4l-.3 2.6a7 7 0 00-1.7 1l-2.4-1-2 3.4 2 1.6a7 7 0 000 2l-2 1.6 2 3.4 2.4-1a7 7 0 001.7 1l.3 2.4h4l.3-2.4a7 7 0 001.7-1l2.4 1 2-3.4-2-1.6a7 7 0 00.1-1z" /></svg>,
  edit: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 20h4L18.5 9.5a2 2 0 000-3l-1-1a2 2 0 00-3 0L4 16v4z" strokeLinejoin="round" /></svg>,
  plus: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 5v14M5 12h14" strokeLinecap="round" /></svg>,
  msg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H8l-4 4V5a2 2 0 012-2h13a2 2 0 012 2z" strokeLinejoin="round" /></svg>,
  upload: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 15V4M8 8l4-4 4 4" strokeLinecap="round" strokeLinejoin="round" /><path d="M5 15v3a2 2 0 002 2h10a2 2 0 002-2v-3" strokeLinecap="round" /></svg>,
  trash: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M6 7l1 13a1 1 0 001 1h8a1 1 0 001-1l1-13" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  cal: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" strokeLinecap="round" /></svg>,
};

function statusText(s) { return STATUS_LABELS[s] || String(s || "new").replace(/_/g, " "); }
function cap(s) { return statusText(s); }
function money(n) { return `$${Number(n || 0).toLocaleString()}`; }
function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function relTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return d.toDateString() === new Date().toDateString() ? `${h} hour${h > 1 ? "s" : ""} ago` : "Today";
  const days = Math.floor(h / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return fmtDate(iso);
}

export default function LeadDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [lead, setLead] = useState(null);
  const [team, setTeam] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [tab, setTab] = useState("Overview");
  const [editing, setEditing] = useState(false);
  const [editPermit, setEditPermit] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [newMsg, setNewMsg] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savedAt, setSavedAt] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    fetch(`/api/leads/${id}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load lead");
        setLead(data);
        setNoteDraft(data.notes || "");
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
    fetch("/api/team").then((r) => r.json()).then((d) => setTeam(Array.isArray(d) ? d : [])).catch(() => {});
    fetch("/api/quotations").then((r) => r.json()).then((d) => setQuotes(Array.isArray(d) ? d : [])).catch(() => {});
  }, [id]);

  const leadQuotes = useMemo(() => {
    if (!lead) return [];
    return quotes
      .filter((q) => q.lead_id === lead.id || (lead.email && q.client_email && q.client_email.toLowerCase() === lead.email.toLowerCase()))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [quotes, lead]);

  const activityFeed = useMemo(() => {
    const items = [];
    (lead?.activity || []).forEach((a) => items.push({ text: a.text, at: a.at, kind: a.kind || "note" }));
    leadQuotes.forEach((q) => {
      items.push({ text: `Quote ${q.number} sent to client`, at: q.created_at, kind: "quote" });
      if (q.accepted_at) items.push({ text: `Quote ${q.number} accepted by client`, at: q.accepted_at, kind: "quote" });
    });
    return items.sort((a, b) => new Date(b.at) - new Date(a.at));
  }, [lead, leadQuotes]);

  async function patchLead(patch, activityText) {
    let full = { ...lead, ...patch };
    if (activityText) {
      const activity = Array.isArray(lead.activity) ? [...lead.activity] : [];
      activity.push({ text: activityText, at: new Date().toISOString(), kind: patch.__kind || "update" });
      full.activity = activity;
      patch = { ...patch, activity };
    }
    delete patch.__kind;
    setLead(full);
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (res.ok) { setLead(data); setSavedAt(Date.now()); }
    } catch {}
  }

  function set(field, value) { setLead((l) => ({ ...l, [field]: value })); }

  function saveCustomer() {
    patchLead({ name: lead.name, phone: lead.phone, email: lead.email, address: lead.address, service_type: lead.service_type }, "Customer details updated");
    setEditing(false);
  }
  function savePermit() {
    patchLead({ permit_request: lead.permit_request || {} }, "Permit request updated");
    setEditPermit(false);
  }
  function addTask() {
    const title = (lead.next_action || "").trim();
    if (!title) return;
    const tasks = Array.isArray(lead.tasks) ? [...lead.tasks] : [];
    tasks.push({ id: `t-${Date.now()}`, title, due_date: lead.due_date || "", done: false, at: new Date().toISOString() });
    patchLead({ tasks }, `Task added: ${title}${lead.due_date ? ` (due ${fmtDate(lead.due_date)})` : ""}`);
  }
  function sendMessage() {
    const text = newMsg.trim();
    if (!text) return;
    const messages = Array.isArray(lead.messages) ? [...lead.messages] : [];
    messages.push({ id: `m-${Date.now()}`, from: "staff", author: "Staff", text, at: new Date().toISOString() });
    patchLead({ messages }, "Message sent to client");
    setNewMsg("");
  }
  async function uploadDoc(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    fd.append("uploaded_by", "Staff");
    try {
      const res = await fetch(`/api/leads/${id}/files`, { method: "POST", body: fd });
      const entry = await res.json();
      if (res.ok) {
        setLead((l) => ({
          ...l,
          documents: [...(l.documents || []), entry],
          activity: [...(l.activity || []), { text: `Staff uploaded document: ${entry.name}`, at: entry.uploaded_at, kind: "document" }],
        }));
      }
    } catch {}
    e.target.value = "";
  }
  async function deleteDoc(fileId) {
    setLead((l) => ({ ...l, documents: (l.documents || []).filter((f) => f.id !== fileId) }));
    await fetch(`/api/leads/${id}/files?fileId=${fileId}`, { method: "DELETE" });
  }
  function saveNote() { patchLead({ notes: noteDraft }, "Notes updated"); }
  async function handleDelete() {
    if (!confirm("Delete this lead permanently?")) return;
    const res = await fetch(`/api/leads/${id}`, { method: "DELETE" });
    if (res.ok) router.push("/leads");
  }

  if (loading) return <p style={{ color: "var(--muted)" }}>Loading…</p>;
  if (!lead) return <div className="error-banner">{error || "Lead not found"}</div>;

  const priority = lead.priority || "Medium";
  const assigned = lead.assigned_to || "Unassigned";
  const sourceLabel = lead.source === "website_form" ? "Website" : "Manual";
  const permit = lead.permit_request || {};
  const primaryQuote = leadQuotes[0];
  const docs = lead.documents || [];
  const msgs = lead.messages || [];

  // Due Date pulls from the linked quotation (its valid-until / issue date) until staff overrides it.
  const quoteDate = primaryQuote ? (primaryQuote.valid_until || primaryQuote.created_at || "") : "";
  const dueValue = lead.due_date || (quoteDate ? String(quoteDate).slice(0, 10) : "");

  // Messages thread starts with what the customer submitted through the website form.
  const thread = [];
  if (lead.message && lead.message.trim()) {
    thread.push({ id: "form-msg", from: "client", author: lead.name || "Customer", text: lead.message, at: lead.created_at });
  }
  msgs.forEach((m) => thread.push(m));

  return (
    <div className="lead-detail">
      {/* nav row (below topbar) */}
      <div className="ld-nav">
        <button className="ld-round" onClick={() => router.push("/leads")} title="Back to leads">{I.back}</button>
        <span className="ld-nav-title">Leads</span>
        <span style={{ flex: 1 }} />
        <div className="ld-menu-wrap">
          <button className="ld-round" onClick={() => setMenuOpen((v) => !v)} title="More">{I.dots}</button>
          {menuOpen && (
            <div className="ld-menu">
              <button onClick={() => { setMenuOpen(false); router.push(`/leads/${id}/quotation`); }}>{I.doc} Send Quotation</button>
              <button className="danger" onClick={() => { setMenuOpen(false); handleDelete(); }}>{I.trash} Delete lead</button>
            </div>
          )}
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="ld-card">
        {/* header */}
        <div className="ld-head">
          <div className="ld-avatar">{I.person}</div>
          <div className="ld-head-main">
            <div className="ld-name-row">
              <h1>{lead.name || "(no name)"}</h1>
              <span className={`ld-name-badge status-${lead.status || "new"}`}><span className="dot" />{statusText(lead.status)}</span>
            </div>
            <div className="ld-addr">{I.pin}{lead.address || "No address on file"}</div>
          </div>
          <div className="ld-head-actions">
            {editing ? (
              <>
                <button className="btn-outline" onClick={saveCustomer}>Save</button>
                <button className="btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
              </>
            ) : (
              <button className="btn-outline" onClick={() => setEditing(true)}>{I.edit} Edit</button>
            )}
            <button className="btn-navy" onClick={() => router.push(`/leads/${id}/quotation`)}>{I.plus} Create Quote</button>
          </div>
        </div>

        {/* pills */}
        <div className="ld-pills">
          <span className="ld-pill"><i className="pi">{I.phone}</i>{cap(lead.status)}</span>
          <span className="ld-pill"><i className="pi">{I.person}</i>Assigned: {assigned}</span>
          <span className="ld-pill"><i className="pi">{I.globe}</i>Source: {sourceLabel}</span>
          <span className="ld-pill"><i className="pi">{I.flag}</i>Priority: {priority}</span>
        </div>

        {/* tabs */}
        <div className="ld-tabs">
          {TABS.map((t) => (
            <button key={t} className={`ld-tab${tab === t ? " active" : ""}`} onClick={() => setTab(t)}>
              {t}
              {t === "Documents" && docs.length > 0 && <span className="tab-count">{docs.length}</span>}
              {t === "Messages" && msgs.length > 0 && <span className="tab-count">{msgs.length}</span>}
              {t === "Quotes" && leadQuotes.length > 0 && <span className="tab-count">{leadQuotes.length}</span>}
            </button>
          ))}
        </div>

        <div className="ld-body">
          {/* ============ OVERVIEW ============ */}
          {tab === "Overview" && (
            <div className="ld-overview">
              <div className="ld-col">
                {/* Customer Information */}
                <div className="ld-panel">
                  <div className="ld-panel-head"><span className="ld-ic">{I.person}</span><h3>Customer Information</h3></div>
                  {editing ? (
                    <div className="ld-fields">
                      <label>Name<input value={lead.name || ""} onChange={(e) => set("name", e.target.value)} /></label>
                      <label>Phone<input value={lead.phone || ""} onChange={(e) => set("phone", e.target.value)} /></label>
                      <label>Email<input value={lead.email || ""} onChange={(e) => set("email", e.target.value)} /></label>
                    </div>
                  ) : (
                    <div className="ld-info">
                      <div>{I.person}<span>{lead.name || "—"}</span></div>
                      <div>{I.phone}<span>{lead.phone || "—"}</span></div>
                      <div>{I.mail}<span>{lead.email || "—"}</span></div>
                    </div>
                  )}
                </div>

                {/* Property */}
                <div className="ld-panel">
                  <div className="ld-panel-head"><span className="ld-ic">{I.home}</span><h3>Property</h3></div>
                  {editing ? (
                    <div className="ld-fields">
                      <label>Work Location<input value={lead.address || ""} onChange={(e) => set("address", e.target.value)} /></label>
                    </div>
                  ) : (
                    <div className="ld-plain">{lead.address || "No address on file"}</div>
                  )}
                </div>

                {/* Permit Request (staff editable) */}
                <div className="ld-panel">
                  <div className="ld-panel-head">
                    <span className="ld-ic">{I.doc}</span><h3>Permit Request</h3>
                    <button className="ld-edit-mini" onClick={() => (editPermit ? savePermit() : setEditPermit(true))}>
                      {editPermit ? "Save" : I.edit}
                    </button>
                  </div>
                  {editPermit ? (
                    <div className="ld-fields">
                      <label>Work Description<input value={permit.work || lead.service_type || ""} onChange={(e) => set("permit_request", { ...permit, work: e.target.value })} placeholder="e.g. Roof Replacement" /></label>
                      <label>Permit Type<input list="pt" value={permit.permit_type || ""} onChange={(e) => set("permit_request", { ...permit, permit_type: e.target.value })} placeholder="e.g. Roofing Permit" />
                        <datalist id="pt">{PROJECT_TYPES.map((p) => <option key={p} value={p} />)}</datalist>
                      </label>
                      <label>Estimated Job Value<input value={permit.job_value || ""} onChange={(e) => set("permit_request", { ...permit, job_value: e.target.value })} placeholder="e.g. 25000" /></label>
                    </div>
                  ) : (
                    <div className="ld-permit">
                      <div className="pr-work">{permit.work || lead.service_type || "No work described"}</div>
                      <div className="pr-type">{permit.permit_type || "Permit type not set"}</div>
                      <div className="pr-val">Estimated Job Value: <b>{permit.job_value ? money(permit.job_value) : "—"}</b></div>
                    </div>
                  )}
                </div>

                {/* Quote */}
                <div className="ld-panel">
                  <div className="ld-panel-head"><span className="ld-ic">{I.dollar}</span><h3>Quote</h3></div>
                  {primaryQuote ? (
                    <div className="ld-quote-row" onClick={() => router.push(`/quotations/${primaryQuote.token}`)}>
                      <b>{primaryQuote.number}</b><span className="sep">|</span>
                      <b>{money(primaryQuote.total)}</b><span className="sep">|</span>
                      <span className={`ld-badge status-${primaryQuote.status === "accepted" ? "won" : "contacted"}`}><span className="dot" />{primaryQuote.status === "accepted" ? "Accepted" : "Sent"}</span>
                    </div>
                  ) : (
                    <div className="ld-plain muted">No quotation yet. <a onClick={() => router.push(`/leads/${id}/quotation`)}>Create one →</a></div>
                  )}
                </div>

                {/* Recent Activity */}
                <div className="ld-panel">
                  <div className="ld-panel-head"><span className="ld-ic">{I.clock}</span><h3>Recent Activity</h3></div>
                  {activityFeed.length === 0 ? (
                    <div className="ld-plain muted">No activity yet.</div>
                  ) : (
                    <ul className="ld-activity">
                      {activityFeed.slice(0, 5).map((a, i) => (
                        <li key={i}><span className="ad" /><span className="at">{a.text}</span><span className="atime">{relTime(a.at)}</span></li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Lead Management */}
              <div className="ld-col ld-side">
                <div className="ld-panel ld-manage">
                  <div className="ld-panel-head"><span className="ld-ic navy">{I.gear}</span><h3>Lead Management</h3></div>
                  <label className="ld-field">Status
                    <select value={lead.status || "new"} onChange={(e) => patchLead({ status: e.target.value }, `Status changed to ${statusText(e.target.value)}`)}>
                      {STATUSES.map((s) => <option key={s} value={s}>{statusText(s)}</option>)}
                    </select>
                  </label>
                  <label className="ld-field">Assigned To
                    <select value={lead.assigned_to || ""} onChange={(e) => patchLead({ assigned_to: e.target.value }, `Assigned to ${e.target.value || "Unassigned"}`)}>
                      <option value="">Unassigned</option>
                      {team.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
                      {lead.assigned_to && !team.some((t) => t.name === lead.assigned_to) && <option value={lead.assigned_to}>{lead.assigned_to}</option>}
                    </select>
                  </label>
                  <label className="ld-field">Priority
                    <select value={priority} onChange={(e) => patchLead({ priority: e.target.value }, `Priority set to ${e.target.value}`)}>
                      {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </label>
                  <label className="ld-field">Next Action
                    <select value={lead.next_action || ""} onChange={(e) => patchLead({ next_action: e.target.value }, e.target.value ? `Next action: ${e.target.value}` : undefined)}>
                      <option value="">Select next action…</option>
                      {NEXT_ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
                      {lead.next_action && !NEXT_ACTIONS.includes(lead.next_action) && <option value={lead.next_action}>{lead.next_action}</option>}
                    </select>
                  </label>
                  <label className="ld-field">Due Date
                    <input type="date" value={dueValue} onChange={(e) => patchLead({ due_date: e.target.value })} />
                  </label>
                  <button className="btn-navy full" onClick={addTask}>{I.plus} Add Task</button>

                  {Array.isArray(lead.tasks) && lead.tasks.length > 0 && (
                    <ul className="ld-tasks">
                      {lead.tasks.slice().reverse().map((t) => (
                        <li key={t.id}><span className="td" />{t.title}{t.due_date && <em>· {fmtDate(t.due_date)}</em>}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ============ DOCUMENTS ============ */}
          {tab === "Documents" && (
            <div className="ld-tabpane">
              <div className="ld-pane-head">
                <h3>Documents</h3>
                <button className="btn-navy" onClick={() => fileRef.current?.click()}>{I.upload} Upload</button>
                <input ref={fileRef} type="file" hidden onChange={uploadDoc} />
              </div>
              {docs.length === 0 ? (
                <div className="ld-empty">{I.doc}<p>No documents yet.</p><span>Files the customer uploads, or that you add here, will appear in this list.</span></div>
              ) : (
                <div className="ld-doclist">
                  {docs.map((d) => (
                    <div className="ld-docitem" key={d.id}>
                      <span className="ld-ic">{I.doc}</span>
                      <div className="dm">
                        <a href={d.url} target="_blank" rel="noreferrer">{d.name}</a>
                        <span>{d.uploaded_by || "Staff"} · {relTime(d.uploaded_at)}</span>
                      </div>
                      <button className="ld-del" onClick={() => deleteDoc(d.id)} title="Remove">{I.trash}</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ============ MESSAGES ============ */}
          {tab === "Messages" && (
            <div className="ld-tabpane">
              <div className="ld-pane-head"><h3>Messages</h3></div>
              {thread.length === 0 ? (
                <div className="ld-empty">{I.msg}<p>No messages yet.</p><span>The customer&apos;s form message appears here, and you can reply below.</span></div>
              ) : (
                <div className="ld-thread">
                  {thread.map((m) => (
                    <div className={`ld-bubble ${m.from === "staff" ? "out" : "in"}`} key={m.id}>
                      <div className="mb-author">{m.author || (m.from === "staff" ? "Staff" : lead.name)}</div>
                      <div className="mb-text">{m.text}</div>
                      <div className="mb-time">{relTime(m.at)}</div>
                    </div>
                  ))}
                </div>
              )}
              <div className="ld-compose">
                <input value={newMsg} onChange={(e) => setNewMsg(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMessage()} placeholder="Type a message to the customer…" />
                <button className="btn-navy" onClick={sendMessage}>Send</button>
              </div>
            </div>
          )}

          {/* ============ QUOTES ============ */}
          {tab === "Quotes" && (
            <div className="ld-tabpane">
              <div className="ld-pane-head">
                <h3>Quotes</h3>
                <button className="btn-navy" onClick={() => router.push(`/leads/${id}/quotation`)}>{I.plus} Create Quote</button>
              </div>
              {leadQuotes.length === 0 ? (
                <div className="ld-empty">{I.dollar}<p>No quotations yet.</p><span>Create a quotation to email the customer a PDF they can accept online.</span></div>
              ) : (
                <div className="ld-doclist">
                  {leadQuotes.map((q) => (
                    <div className="ld-quoteitem" key={q.id || q.token} onClick={() => router.push(`/quotations/${q.token}`)}>
                      <span className="ld-ic navy">{I.dollar}</span>
                      <div className="dm">
                        <b>{q.number} · {money(q.total)}</b>
                        <span>{fmtDate(q.created_at)}{q.accepted_at ? ` · accepted ${fmtDate(q.accepted_at)}` : ""}</span>
                      </div>
                      <span className={`ld-badge status-${q.status === "accepted" ? "won" : "contacted"}`}><span className="dot" />{q.status === "accepted" ? "Accepted" : "Sent"}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ============ NOTES ============ */}
          {tab === "Notes" && (
            <div className="ld-tabpane">
              <div className="ld-pane-head"><h3>Internal Notes</h3>{savedAt && <span className="ld-saved">Saved</span>}</div>
              <textarea className="ld-notes" rows={10} value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} placeholder="Staff-only notes about this lead…" />
              <div><button className="btn-navy" onClick={saveNote}>Save Notes</button></div>
            </div>
          )}

          {/* ============ ACTIVITY ============ */}
          {tab === "Activity" && (
            <div className="ld-tabpane">
              <div className="ld-pane-head"><h3>Activity</h3></div>
              {activityFeed.length === 0 ? (
                <div className="ld-empty">{I.clock}<p>No activity yet.</p><span>Every change, quote and message is logged here automatically.</span></div>
              ) : (
                <ul className="ld-timeline">
                  {activityFeed.map((a, i) => (
                    <li key={i}>
                      <span className={`tl-dot k-${a.kind}`} />
                      <div className="tl-body"><span>{a.text}</span><em>{relTime(a.at)}</em></div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
