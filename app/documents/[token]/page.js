"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { DOCUMENT_CATEGORIES } from "../../../lib/leadMeta";

export default function DocumentUploadPage() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [uploadingCat, setUploadingCat] = useState(null);
  const fileRefs = useRef({});

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

  async function handleUpload(category, e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCat(category);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("category", category);
    try {
      const res = await fetch(`/api/documents/${token}`, { method: "POST", body: fd });
      const d = await res.json();
      if (res.ok) setData(d);
    } catch {}
    setUploadingCat(null);
    e.target.value = "";
  }

  const filesFor = (cat) => (data?.documents || []).filter((d) => d.category === cat);

  return (
    <div className="qc-page">
      <div className="qc-page-inner">
        {error && <div className="error-banner">{error}</div>}
        {!data ? (
          !error && <p style={{ color: "var(--muted)" }}>Loading…</p>
        ) : (
          <div className="dc-card">
            <div className="dc-head">
              <img src="/logo-color.png" alt="DS Permitting Services" className="dc-logo" />
              <div className="dc-head-right">
                <div className="dc-title">DOCUMENT REQUEST</div>
                <div className="dc-company-name">DS Permitting Services</div>
                <div className="dc-company-line">Fort McCoy, FL</div>
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
              Please upload the following documents so we can continue processing your permit. You can come back to this page any time to add more.
            </div>

            <div className="dc-categories">
              {DOCUMENT_CATEGORIES.map((cat) => {
                const files = filesFor(cat);
                const uploading = uploadingCat === cat;
                return (
                  <div className="dc-cat" key={cat}>
                    <div className="dc-cat-head">
                      <span className="dc-cat-name">{cat}</span>
                      <span className={`dc-cat-status${files.length ? " done" : ""}`}>
                        {files.length ? `${files.length} uploaded` : "Not uploaded"}
                      </span>
                    </div>
                    {files.length > 0 && (
                      <div className="dc-file-list">
                        {files.map((f) => (
                          <div className="dc-file" key={f.id}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" strokeLinejoin="round" /><path d="M14 3v5h5" strokeLinejoin="round" /></svg>
                            {f.name}
                          </div>
                        ))}
                      </div>
                    )}
                    <label className="dc-upload-btn">
                      <input
                        ref={(el) => (fileRefs.current[cat] = el)}
                        type="file"
                        hidden
                        disabled={uploading}
                        onChange={(e) => handleUpload(cat, e)}
                      />
                      {uploading ? "Uploading…" : "+ Add File"}
                    </label>
                  </div>
                );
              })}
            </div>

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
