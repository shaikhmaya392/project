"use client";

import { useEffect, useRef, useState } from "react";

// A fully custom-styled dropdown (native <select> only lets you style the
// closed box — the open options list renders with the OS's own plain
// popup). This renders both ends ourselves so the whole thing matches
// the rest of the CRM.
export default function Select({ value, onChange, options, placeholder = "Select…", className = "" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const opts = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  const current = opts.find((o) => o.value === value);

  return (
    <div className={`cs${open ? " open" : ""} ${className}`} ref={ref}>
      <button type="button" className="cs-trigger" onClick={() => setOpen((v) => !v)}>
        <span className={current ? "" : "cs-placeholder"}>{current ? current.label : placeholder}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      {open && (
        <div className="cs-menu">
          {opts.map((o) => (
            <button
              type="button"
              key={o.value}
              className={`cs-opt${o.value === value ? " active" : ""}`}
              onClick={() => { onChange(o.value); setOpen(false); }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
