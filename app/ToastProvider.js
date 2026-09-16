"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

const ToastContext = createContext(null);

let idSeq = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    clearTimeout(timers.current[id]);
    delete timers.current[id];
  }, []);

  const showToast = useCallback(
    (message, { type = "success", title, duration = 5000 } = {}) => {
      const id = ++idSeq;
      const resolvedTitle = title || (type === "success" ? "Success" : "Something went wrong");
      setToasts((prev) => [...prev, { id, message, type, title: resolvedTitle }]);
      timers.current[id] = setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss]
  );

  const active = toasts[toasts.length - 1];

  return (
    <ToastContext.Provider value={{ showToast, dismiss }}>
      {children}
      {active && (
        <div className="toast-backdrop" onClick={() => dismiss(active.id)}>
          <div className={`toast-modal toast-modal-${active.type}`} onClick={(e) => e.stopPropagation()}>
            <div className="toast-modal-icon">
              {active.type === "success" ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M8 12.5l2.5 2.5L16 9.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 8v5M12 16.5v.01" strokeLinecap="round" />
                </svg>
              )}
            </div>
            <div className="toast-modal-title">{active.title}</div>
            <div className="toast-modal-message">{active.message}</div>
            <button type="button" className="btn toast-modal-ok" onClick={() => dismiss(active.id)}>
              OK
            </button>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
