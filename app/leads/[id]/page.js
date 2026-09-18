"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { STATUS_LABELS, STATUSES, PRIORITIES, NEXT_ACTIONS, PROJECT_TYPES } from "../../../lib/leadMeta";
import Select from "../../Select";

const EDIT_FIELDS = [
  { key: "name", label: "Name" },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email Address", full: true },
  { key: "address", label: "Work Location", full: true },
  { key: "service_type", label: "Project Type", list: true },
  { key: "message", label: "Message / Details", full: true, textarea: true },
];
const TABS = ["Overview", "Documents", "Messages", "Quotes", "Notes", "Activity"];

const I = {
  back: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  dots: <svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg>,
  person: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="7" r="4" /><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  pin: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 21s7-5.6 7-11a7 7 0 10-14 0c0 5.4 7 11 7 11z" strokeLinejoin="round" /><circle cx="12" cy="10" r="2.5" /></svg>,
  phone: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0122 16.92z" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  mail: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>,
  home: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 11l8-6 8 6" strokeLinecap="round" strokeLinejoin="round" /><path d="M6 10v9h12v-9" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  doc: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z" strokeLinejoin="round" /><path d="M14 3v5h5M9 13h6M9 17h4" strokeLinecap="round" /></svg>,
  dollar: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v18M16 7.5C16 6 14.2 5 12 5S8 6 8 7.5 9.8 10 12 10.5s4 1 4 2.5-1.8 3-4 3-4-1-4-3" strokeLinecap="round" /></svg>,
  clock: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" strokeLinecap="round" /></svg>,
  globe: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3a15.3 15.3 0 014 9 15.3 15.3 0 01-4 9 15.3 15.3 0 01-4-9 15.3 15.3 0 014-9z" /></svg>,
  flag: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" strokeLinecap="round" strokeLinejoin="round" /><path d="M4 22V15" strokeLinecap="round" /></svg>,
  gear: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 00-.1-1l2-1.6-2-3.4-2.4 1a7 7 0 00-1.7-1L14.5 3h-4l-.3 2.6a7 7 0 00-1.7 1l-2.4-1-2 3.4 2 1.6a7 7 0 000 2l-2 1.6 2 3.4 2.4-1a7 7 0 001.7 1l.3 2.4h4l.3-2.4a7 7 0 001.7-1l2.4 1 2-3.4-2-1.6a7 7 0 00.1-1z" /></svg>,
  edit: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" strokeLinecap="round" strokeLinejoin="round" /><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  plus: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M12 5v14M5 12h14" strokeLinecap="round" /></svg>,
  msg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H8l-4 4V5a2 2 0 012-2h13a2 2 0 012 2z" strokeLinejoin="round" /></svg>,
  upload: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 15V4M8 8l4-4 4 4" strokeLinecap="round" strokeLinejoin="round" /><path d="M5 15v3a2 2 0 002 2h10a2 2 0 002-2v-3" strokeLinecap="round" /></svg>,
  trash: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M6 7l1 13a1 1 0 001 1h8a1 1 0 001-1l1-13" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  cal: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" strokeLinecap="round" /></svg>,
  save: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" strokeLinejoin="round" /><path d="M17 21v-8H7v8M7 3v5h8" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  warn: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3.2L2 20.5h20L12 3.2z" strokeLinecap="round" strokeLinejoin="round" /><path d="M12 10v4.2M12 17.6v.01" strokeLinecap="round" strokeLinejoin="round" /></svg>,
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
  const [editOpen, setEditOpen] = useState(false);
  const [draft, setDraft] = useState({});
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editPermit, setEditPermit] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [docDeleteId, setDocDeleteId] = useState(null);
  const menuRef = useRef(null);
  const [newMsg, setNewMsg] = useState("");
  const [taskHint, setTaskHint] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savedAt, setSavedAt] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    // A lead opened right after being created can 404 for a moment — the
    // blob store's write hasn't propagated to every edge yet. Retry a few
    // times before showing "not found" instead of failing on the first try.
    async function loadWithRetry() {
      for (let attempt = 0; attempt < 6; attempt++) {
        try {
          const res = await fetch(`/api/leads/${id}`, { cache: "no-store" });
          const data = await res.json();
          if (res.ok) {
            if (cancelled) return;
            setLead(data);
            setNoteDraft(data.notes || "");
            setLoading(false);
            return;
          }
          if (res.status !== 404 || attempt === 5) throw new Error(data.error || "Failed to load lead");
        } catch (err) {
          if (attempt === 5) {
            if (!cancelled) { setError(err.message); setLoading(false); }
            return;
          }
        }
        await sleep(600 * (attempt + 1));
      }
    }
    loadWithRetry();

    fetch("/api/team").then((r) => r.json()).then((d) => setTeam(Array.isArray(d) ? d : [])).catch(() => {});
    fetch("/api/quotations").then((r) => r.json()).then((d) => setQuotes(Array.isArray(d) ? d : [])).catch(() => {});
    return () => { cancelled = true; };
  }, [id]);

  // Close the ⋯ menu on an outside click, not just its own buttons.
  useEffect(() => {
    if (!menuOpen) return;
    function onDoc(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  const leadQuotes = useMemo(() => {
    if (!lead) return [];
    return quotes
      .filter((q) => q.lead_id === lead.id || (lead.email && q.client_email && q.client_email.toLowerCase() === lead.email.toLowerCase()))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [quotes, lead]);


  const activityFeed = useMemo(() => {
    const items = [];
    const logged = (lead?.activity || []).map((a) => a.text || "").join("\n");
    (lead?.activity || []).forEach((a) => items.push({ text: a.text, at: a.at, kind: a.kind || "note" }));
    // Older quotes were never written to lead.activity; derive those so the
    // feed stays complete without duplicating ones the API already logged.
    leadQuotes.forEach((q) => {
      if (!logged.includes(`${q.number} sent`)) items.push({ text: `Quotation ${q.number} sent to client`, at: q.created_at, kind: "quote" });
      if (q.accepted_at && !logged.includes(`${q.number} accepted`)) items.push({ text: `Quotation ${q.number} accepted by client`, at: q.accepted_at, kind: "quote" });
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

  function openEdit() {
    const d = {};
    EDIT_FIELDS.forEach((f) => { d[f.key] = lead[f.key] || ""; });
    setDraft(d);
    setEditOpen(true);
  }
  function saveEdit() {
    patchLead({ ...draft }, "Customer details updated");
    setEditOpen(false);
  }
  function savePermit() {
    patchLead({ permit_request: lead.permit_request || {} }, "Permit request updated");
    setEditPermit(false);
  }
  // Header Save: commit anything still pending (an open permit edit) and
  // flush the current lead state.
  function saveAll() {
    if (editPermit) { savePermit(); return; }
    patchLead({ ...lead });
  }
  function addTask() {
    const title = (lead.next_action || "").trim();
    if (!title) { setTaskHint("Pick a Next Action above first"); return; }
    setTaskHint("");
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
    setDocDeleteId(null);
  }
  function saveNote() { patchLead({ notes: noteDraft }, "Notes updated"); }
  async function handleDelete() {
    const res = await fetch(`/api/leads/${id}`, { method: "DELETE" });
    if (res.ok) router.push("/leads");
    else setDeleteOpen(false);
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
      {error && <div className="error-banner">{error}</div>}

      <div className="ld-card">
        {/* nav row (inside the card) */}
        <div className="ld-nav">
          <button className="ld-round" onClick={() => router.push("/leads")} title="Back to leads">{I.back}</button>
          <span className="ld-nav-title">Leads</span>
          <span style={{ flex: 1 }} />
          <div className="ld-menu-wrap" ref={menuRef}>
            <button className="ld-round" onClick={() => setMenuOpen((v) => !v)} title="More">{I.dots}</button>
            {menuOpen && (
              <div className="ld-menu">
                <button className="danger" onClick={() => { setMenuOpen(false); setDeleteOpen(true); }}>
                  <i className="ld-menu-ic">{I.trash}</i>
                  <span>Delete lead<small>Permanently removes this record</small></span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* header */}
        <div className="ld-head">
          <div className="ld-avatar">{I.person}</div>
          <div className="ld-head-main">
            <div className="ld-name-row">
              <h1>{lead.name || "(no name)"}</h1>
              <span className={`ld-name-badge status-${lead.status || "new"}`}><span className="dot" />{statusText(lead.status)}</span>
            </div>
            <div className="ld-addr"><i className="pi sm">{I.pin}</i>{lead.address || "No address on file"}</div>
          </div>
          <div className="ld-head-actions">
            <button className="btn-outline" onClick={openEdit}>
              {I.edit}Edit
            </button>
            <button className="btn-outline" onClick={saveAll}>
              {I.save}Save
            </button>
            <button className="btn-navy" onClick={() => router.push(`/leads/${id}/quotation`)}>
              {I.plus}Create Quote
            </button>
          </div>
        </div>

        {/* summary bar */}
        <div className="ld-pills">
          <span className="ld-pill"><i className="pi">{I.phone}</i>Contacted</span>
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
                  <div className="ld-info">
                    <div>{I.person}<span>{lead.name || "—"}</span></div>
                    <div>{I.phone}<span>{lead.phone || "—"}</span></div>
                    <div>{I.mail}<span>{lead.email || "—"}</span></div>
                  </div>
                </div>

                {/* Property */}
                <div className="ld-panel">
                  <div className="ld-panel-head"><span className="ld-ic">{I.home}</span><h3>Property</h3></div>
                  <div className="ld-plain">{lead.address || "No address on file"}</div>
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
                    <Select
                      value={lead.status || "new"}
                      onChange={(v) => patchLead({ status: v }, `Status changed to ${statusText(v)}`)}
                      options={STATUSES.map((s) => ({ value: s, label: statusText(s) }))}
                    />
                  </label>
                  <label className="ld-field">Assigned To
                    <Select
                      value={lead.assigned_to || ""}
                      onChange={(v) => patchLead({ assigned_to: v }, `Assigned to ${v || "Unassigned"}`)}
                      options={[
                        { value: "", label: "Unassigned" },
                        ...team.map((t) => ({ value: t.name, label: t.name })),
                        ...(lead.assigned_to && !team.some((t) => t.name === lead.assigned_to) ? [{ value: lead.assigned_to, label: lead.assigned_to }] : []),
                      ]}
                    />
                  </label>
                  <label className="ld-field">Priority
                    <Select
                      value={priority}
                      onChange={(v) => patchLead({ priority: v }, `Priority set to ${v}`)}
                      options={PRIORITIES}
                    />
                  </label>
                  <label className="ld-field">Next Action
                    <Select
                      value={lead.next_action || ""}
                      onChange={(v) => patchLead({ next_action: v }, v ? `Next action: ${v}` : undefined)}
                      placeholder="Select next action…"
                      options={[
                        ...NEXT_ACTIONS.map((a) => ({ value: a, label: a })),
                        ...(lead.next_action && !NEXT_ACTIONS.includes(lead.next_action) ? [{ value: lead.next_action, label: lead.next_action }] : []),
                      ]}
                    />
                  </label>
                  <label className="ld-field">Due Date
                    <input type="date" value={dueValue} onChange={(e) => patchLead({ due_date: e.target.value })} />
                  </label>
                  <button className="btn-navy full" onClick={addTask}>{I.plus} Add Task</button>
                  {taskHint && <div className="ld-task-hint">{taskHint}</div>}

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
                      <button className="ld-del" onClick={() => setDocDeleteId(d.id)} title="Remove">{I.trash}</button>
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
              <div className="ld-pane-head"><h3>Quotes</h3></div>
              {leadQuotes.length === 0 ? (
                <div className="ld-empty">{I.dollar}<p>No quotations yet.</p><span>Use &quot;Create Quote&quot; above to email the customer a PDF they can accept online.</span></div>
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

      {/* ============ EDIT POPUP ============ */}
      {editOpen && (
        <div className="toast-backdrop" onClick={() => setEditOpen(false)}>
          <div className="ld-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ld-modal-head">
              <div>
                <h3>Edit Customer</h3>
                <p>Changes update everywhere as soon as you save.</p>
              </div>
              <button className="ld-modal-x" onClick={() => setEditOpen(false)} title="Close">×</button>
            </div>
            <div className="ld-modal-grid">
              {EDIT_FIELDS.map((f) => (
                <label key={f.key} className={f.full ? "full" : ""}>
                  {f.label}
                  {f.textarea ? (
                    <textarea rows={4} value={draft[f.key] || ""} onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))} />
                  ) : (
                    <input
                      list={f.list ? "edit-project-types" : undefined}
                      value={draft[f.key] || ""}
                      onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                    />
                  )}
                </label>
              ))}
              <datalist id="edit-project-types">{PROJECT_TYPES.map((p) => <option key={p} value={p} />)}</datalist>
            </div>
            <div className="ld-modal-actions">
              <button className="btn-outline" onClick={() => setEditOpen(false)}>Cancel</button>
              <button className="btn-navy" onClick={saveEdit}>{I.save} Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* ============ DELETE CONFIRM ============ */}
      {deleteOpen && (
        <div className="toast-backdrop" onClick={() => setDeleteOpen(false)}>
          <div className="ld-modal ld-modal-sm ld-modal-warn" onClick={(e) => e.stopPropagation()}>
            <div className="ld-modal-warn-bar" />
            <div className="ld-modal-danger-ic">{I.warn}</div>
            <h3 className="ld-modal-center-title">Delete this lead?</h3>
            <p className="ld-modal-center-text">
              <b>{lead.name || "This lead"}</b> and all of its messages, documents and activity will be permanently removed. This can&apos;t be undone.
            </p>
            <div className="ld-modal-actions stacked">
              <button className="btn-danger full" onClick={handleDelete}>{I.trash} Yes, delete this lead</button>
              <button className="ld-modal-link" onClick={() => setDeleteOpen(false)}>Keep this lead</button>
            </div>
          </div>
        </div>
      )}

      {/* ============ DELETE DOCUMENT CONFIRM ============ */}
      {docDeleteId && (
        <div className="toast-backdrop" onClick={() => setDocDeleteId(null)}>
          <div className="ld-modal ld-modal-sm ld-modal-warn" onClick={(e) => e.stopPropagation()}>
            <div className="ld-modal-warn-bar" />
            <div className="ld-modal-danger-ic">{I.warn}</div>
            <h3 className="ld-modal-center-title">Delete this document?</h3>
            <p className="ld-modal-center-text">
              <b>{docs.find((d) => d.id === docDeleteId)?.name || "This file"}</b> will be permanently removed. This can&apos;t be undone.
            </p>
            <div className="ld-modal-actions stacked">
              <button className="btn-danger full" onClick={() => deleteDoc(docDeleteId)}>{I.trash} Yes, delete this document</button>
              <button className="ld-modal-link" onClick={() => setDocDeleteId(null)}>Keep this document</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
