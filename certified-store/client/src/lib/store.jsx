import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from './api.js';
import { setMediaMode } from './format.js';

/* ------------------------------------------------------------------ site */
const SiteCtx = createContext(null);
export function SiteProvider({ children }) {
  const [site, setSite] = useState(null);
  useEffect(() => {
    api.get('/site').then((s) => { setMediaMode(s.mediaMode); setSite(s); }).catch(() => setSite({ menu: [] }));
  }, []);
  return <SiteCtx.Provider value={site}>{children}</SiteCtx.Provider>;
}
export const useSite = () => useContext(SiteCtx);

/* ------------------------------------------------------------------ toasts */
const ToastCtx = createContext(() => {});
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((msg, tone = 'success') => {
    const id = Math.random();
    setToasts((t) => [...t, { id, msg, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => <div key={t.id} className={`toast toast-${t.tone}`}>{t.msg}</div>)}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

/* ------------------------------------------------------------------ auth */
const AuthCtx = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = loading
  const [modal, setModal] = useState(null); // null | 'login' | 'request' | 'forgot'
  const [modalReason, setModalReason] = useState('');

  useEffect(() => {
    api.get('/auth/me').then((d) => setUser(d.user)).catch(() => setUser(null));
  }, []);

  const login = useCallback(async (email, password) => {
    const d = await api.post('/auth/login', { email, password });
    setUser(d.user);
    return d.user;
  }, []);
  const logout = useCallback(async () => {
    await api.post('/auth/logout');
    setUser(null);
  }, []);
  const openAuth = useCallback((which = 'login', reason = '') => { setModalReason(reason); setModal(which); }, []);
  const closeAuth = useCallback(() => setModal(null), []);

  const value = useMemo(() => ({ user, setUser, login, logout, modal, modalReason, openAuth, closeAuth }), [user, login, logout, modal, modalReason, openAuth, closeAuth]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
export const useAuth = () => useContext(AuthCtx);

/* ------------------------------------------------------------------ cart */
const CartCtx = createContext(null);
const KEY = 'co_cart_v1';
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };

export function CartProvider({ children }) {
  const [items, setItems] = useState(load);
  const [open, setOpen] = useState(false);
  const { user, openAuth } = useAuth();
  const toast = useToast();

  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* ignore */ } }, [items]);

  /** p = catalog row {partNumber, name, price, priceLabel, unit, type, image, page} */
  const add = useCallback((p, qty = 1, comment = '') => {
    setItems((list) => {
      const i = list.findIndex((x) => x.partNumber === p.partNumber && (x.comment || '') === (comment || ''));
      if (i >= 0) {
        const copy = [...list];
        copy[i] = { ...copy[i], qty: Math.min(9999, copy[i].qty + qty) };
        return copy;
      }
      return [...list, {
        partNumber: p.partNumber, name: p.name, price: p.price ?? null, priceLabel: p.priceLabel || '', unit: p.unit,
        type: p.type, image: p.image || p.pageImage || null, page: p.page || null, qty, comment,
      }];
    });
    if (user) {
      toast(`Added ${p.partNumber} to your cart`);
      setOpen(true);
    } else {
      // Guests can collect items, but must log in (or request an account) to buy
      openAuth('login', `${p.partNumber} is in your cart. Please log in to buy – or request an account if you don't have one yet.`);
    }
  }, [user, openAuth, toast]);

  const setQty = useCallback((idx, qty) => setItems((l) => l.map((x, i) => (i === idx ? { ...x, qty: Math.max(1, Math.min(9999, qty || 1)) } : x))), []);
  const setComment = useCallback((idx, comment) => setItems((l) => l.map((x, i) => (i === idx ? { ...x, comment } : x))), []);
  const remove = useCallback((idx) => setItems((l) => l.filter((_, i) => i !== idx)), []);
  const clear = useCallback(() => setItems([]), []);

  const count = items.reduce((s, x) => s + x.qty, 0);
  const subtotal = items.reduce((s, x) => s + (x.price || 0) * x.qty, 0);
  const unpriced = items.some((x) => x.price === null || x.price === undefined);

  const value = useMemo(() => ({ items, add, setQty, setComment, remove, clear, count, subtotal, unpriced, open, setOpen }), [items, add, setQty, setComment, remove, clear, count, subtotal, unpriced, open]);
  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}
export const useCart = () => useContext(CartCtx);
