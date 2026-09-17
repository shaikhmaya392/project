"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// A fully custom-styled dropdown (native <select> only lets you style the
// closed box — the open options list renders with the OS's own plain
// popup). The menu is rendered into a portal at document.body with fixed
// positioning computed from the trigger, so it also works cleanly inside a
// scrolling table cell without being clipped by the row's overflow.
export default function Select({ value, onChange, options, placeholder = "Select…", className = "" }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function place() {
      const r = triggerRef.current?.getBoundingClientRect();
      if (!r) return;
      setPos({ top: r.bottom + 6, left: r.left, width: r.width });
    }
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open]);

  useEffect(() => {
    function onDoc(e) {
      if (triggerRef.current?.contains(e.target)) return;
      if (menuRef.current?.contains(e.target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const opts = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  const current = opts.find((o) => o.value === value);

  return (
    <div className={`cs${open ? " open" : ""} ${className}`}>
      <button
        type="button"
        ref={triggerRef}
        className="cs-trigger"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
      >
        <span className={current ? "" : "cs-placeholder"}>{current ? current.label : placeholder}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      {open && pos && typeof document !== "undefined" && createPortal(
        <div
          className="cs-menu"
          ref={menuRef}
          style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width }}
          onClick={(e) => e.stopPropagation()}
        >
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
        </div>,
        document.body
      )}
    </div>
  );
}
