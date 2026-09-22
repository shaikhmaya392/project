"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";

export default function DocumentUploadPage() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [uploadingFiles, setUploadingFiles] = useState([]);
  const [deletingId, setDeletingId] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [missing, setMissing] = useState([]);
  // Picking a second (or third...) file never has to wait visually — it
  // shows as "Uploading…" right away — but the actual network requests run
  // one at a time. The JSON blob store has no atomic write, so two uploads
  // landing at the exact same moment can silently clobber each other;
  // queueing avoids ever creating that situation in the first place.
  const uploadQueueRef = useRef([]);
  const uploadingRef = useRef(false);

  function load() {
    fetch(`/api/documents/${token}`)
      .then(async (res) => {
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || "Link not found");
        setData(d);
      })
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    load();
    // Light polling so a second visit (or the staff side) always reflects
    // what's actually been uploaded, without the client needing to refresh.
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [token]);

  // Picking a file never blocks on a previous upload finishing — it's
  // queued and shown as "Uploading…" immediately — but the queue is
  // processed one file at a time under the hood (see uploadQueueRef above).
  function handleUpload(category, e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const key = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setUploadingFiles((u) => [...u, { key, category, name: file.name }]);
    setMissing([]);
    setUploadError(null);
    uploadQueueRef.current.push({ key, category, file });
    processQueue();
  }

  async function processQueue() {
    if (uploadingRef.current) return;
    uploadingRef.current = true;
    while (uploadQueueRef.current.length > 0) {
      const { key, category, file } = uploadQueueRef.current.shift();
      const fd = new FormData();
      fd.append("file", file);
      fd.append("category", category);
      try {
        const res = await fetch(`/api/documents/${token}`, { method: "POST", body: fd });
        const d = await res.json();
        if (res.ok) setData(d);
        else setUploadError(d.error || "Upload failed, please try again");
      } catch {
        setUploadError("Upload failed, please try again");
      }
      setUploadingFiles((u) => u.filter((x) => x.key !== key));
    }
    uploadingRef.current = false;
  }

  async function handleDelete(fileId) {
    setDeletingId(fileId);
    try {
      const res = await fetch(`/api/documents/${token}?fileId=${fileId}`, { method: "DELETE" });
      const d = await res.json();
      if (res.ok) setData(d);
    } catch {}
    setDeletingId(null);
  }

  async function handleSubmit() {
    setSubmitting(true);
    setMissing([]);
    try {
      const res = await fetch(`/api/documents/${token}/submit`, { method: "POST" });
      const d = await res.json();
      if (res.ok) setData(d);
      else if (d.missing) setMissing(d.missing);
    } catch {}
    setSubmitting(false);
  }

  const filesFor = (cat) => (data?.documents || []).filter((d) => d.category === cat);
  const submitted = !!data?.documents_submitted_at;
  const fields = data?.fields || [];

  return (
    <div className="qc-page">
      <div className="qc-page-inner">
        {error && <div className="error-banner">{error}</div>}
        {uploadError && <div className="error-banner">{uploadError}</div>}
        {!data ? (
          !error && <p style={{ color: "var(--muted)" }}>Loading…</p>
        ) : (
          <div className="dc-card">
            <div className="dc-head">
              <img src="/logo-color.png" alt="DS Permitting Services" className="dc-logo" />
              <div className="dc-head-right">
                <div className="dc-title">DOCUMENT REQUEST</div>
                <span className={`qc-status${submitted ? " accepted" : ""}`}>{submitted ? "Submitted" : "Awaiting Documents"}</span>
                <div className="dc-company-name">DS Permitting Services</div>
                <div className="dc-company-line">Fort McCoy, FL</div>
                <div className="dc-company-line">(352) 809-1717</div>
                <div className="dc-company-line">dspermitting.com&nbsp;|&nbsp;info@dspermitting.com</div>
              </div>
            </div>

            <div className="dc-rule" />

            <div className="dc-client">
              <div className="dc-client-label">SUBMITTED BY</div>
              <div className="dc-client-name">{data.client_name || "—"}</div>
              {data.client_phone && <div className="dc-client-line">{data.client_phone}</div>}
              {data.client_email && <div className="dc-client-line">{data.client_email}</div>}
            </div>

            <div className="dc-intro">
              {fields.length > 0
                ? "Please upload the documents below, then press Submit. You can come back to this page any time to add, remove or replace a file."
                : "No documents have been requested yet — please check back later or contact us."}
            </div>

            <div className="dc-categories">
              {fields.map((cat) => {
                const files = filesFor(cat);
                const pending = uploadingFiles.filter((u) => u.category === cat);
                const isMissing = missing.includes(cat);
                return (
                  <div className={`dc-cat${isMissing ? " missing" : ""}`} key={cat}>
                    <div className="dc-cat-head">
                      <span className="dc-cat-name">{cat} <span className="dc-cat-req">Required</span></span>
                      <span className={`dc-cat-status${files.length ? " done" : ""}`}>
                        {files.length ? `${files.length} uploaded` : "Not uploaded"}
                      </span>
                    </div>
                    {isMissing && <div className="dc-cat-warn">Please upload this document before submitting.</div>}
                    {(files.length > 0 || pending.length > 0) && (
                      <div className="dc-file-list">
                        {files.map((f) => (
                          <div className="dc-file" key={f.id}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" strokeLinejoin="round" /><path d="M14 3v5h5" strokeLinejoin="round" /></svg>
                            <span className="dc-file-name">{f.name}</span>
                            <button
                              type="button"
                              className="dc-file-del"
                              onClick={() => handleDelete(f.id)}
                              disabled={deletingId === f.id}
                              title="Remove this file"
                            >
                              {deletingId === f.id ? "…" : (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M6 7l1 13a1 1 0 001 1h8a1 1 0 001-1l1-13" strokeLinecap="round" strokeLinejoin="round" /></svg>
                              )}
                            </button>
                          </div>
                        ))}
                        {pending.map((u) => (
                          <div className="dc-file dc-file-pending" key={u.key}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" strokeLinejoin="round" /><path d="M14 3v5h5" strokeLinejoin="round" /></svg>
                            <span className="dc-file-name">{u.name}</span>
                            <span className="dc-file-uploading">Uploading…</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <label className="dc-upload-btn">
                      <input type="file" hidden onChange={(e) => handleUpload(cat, e)} />
                      + Add File
                    </label>
                  </div>
                );
              })}
            </div>

            {fields.length > 0 && (
              <div className="dc-submit-wrap">
                {submitted ? (
                  <div className="dc-submitted-note">
                    ✓ Submitted on {new Date(data.documents_submitted_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}. You can still add or remove files any time.
                  </div>
                ) : (
                  <button type="button" className="dc-submit-btn" onClick={handleSubmit} disabled={submitting}>
                    {submitting ? "Submitting…" : "Submit Documents"}
                  </button>
                )}
              </div>
            )}

            <div className="qc-footer">
              <img src="/logo-color.png" alt="" className="qc-footer-logo" />
              <div className="qc-footer-text">
                <div className="qc-footer-name">DS Permitting Services</div>
                <div className="qc-footer-line">Fort McCoy, FL &middot; (352) 809-1717</div>
                <div className="qc-footer-line">dspermitting.com &middot; info@dspermitting.com</div>
                <div className="qc-footer-tag">Licensed &amp; insured permit expediting for Central &amp; North Florida</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
