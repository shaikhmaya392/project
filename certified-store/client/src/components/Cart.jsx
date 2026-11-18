import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { X, Trash2, Minus, Plus, ShoppingCart, Lock } from 'lucide-react';
import { useAuth, useCart, useSite, pageHref } from '../lib/store.jsx';
import { media, money, priceText } from '../lib/format.js';

export function Qty({ value, onChange, small }) {
  return (
    <div className={`qty ${small ? 'qty-sm' : ''}`}>
      <button type="button" aria-label="Decrease" onClick={() => onChange(Math.max(1, value - 1))}><Minus size={14} /></button>
      <input inputMode="numeric" aria-label="Quantity" value={value} onChange={(e) => onChange(Math.max(1, parseInt(e.target.value.replace(/\D/g, ''), 10) || 1))} />
      <button type="button" aria-label="Increase" onClick={() => onChange(Math.min(9999, value + 1))}><Plus size={14} /></button>
    </div>
  );
}

export function AddToCart({ product, compact }) {
  const { add } = useCart();
  const [qty, setQty] = useState(1);
  return (
    <div className={`addcart ${compact ? 'addcart-compact' : ''}`}>
      <Qty value={qty} onChange={setQty} small />
      <button className="btn btn-primary btn-sm" onClick={() => { add(product, qty); setQty(1); }}>
        <ShoppingCart size={15} /> <span>Add</span>
      </button>
    </div>
  );
}

export function Thumb({ src, alt, size = 48 }) {
  if (!src) return <div className="thumb thumb-empty" style={{ width: size, height: size }}><img src="/media/uploads/2024/12/logo-4.png.webp" alt="" /></div>;
  return <img className="thumb" src={media(src)} alt={alt || ''} style={{ width: size, height: size }} loading="lazy" />;
}

export function CartLines({ editable = true }) {
  const { items, setQty, remove, setComment } = useCart();
  const site = useSite();
  return (
    <ul className="cart-lines">
      {items.map((it, idx) => (
        <li key={`${it.partNumber}-${idx}`} className="cart-line">
          <Thumb src={it.image} alt={it.name} size={56} />
          <div className="cart-line-main">
            <div className="cart-line-top">
              <span className="pn">{it.partNumber}</span>
              {editable && <button className="iconbtn danger" aria-label="Remove" onClick={() => remove(idx)}><Trash2 size={16} /></button>}
            </div>
            {it.product || it.page ? <Link to={it.product ? `/product/${it.product}` : pageHref(it.page, site)} className="cart-line-name">{it.name}</Link> : <div className="cart-line-name">{it.name}</div>}
            <div className="cart-line-meta">
              {editable ? <Qty value={it.qty} onChange={(q) => setQty(idx, q)} small /> : <span>Qty {it.qty}</span>}
              <span className="muted">{it.unit}</span>
              <span className="cart-line-price">{it.price != null ? money(it.price * it.qty) : priceText(it)}</span>
            </div>
            {editable && (
              <input className="cart-note" placeholder="Note for this item (size, side, color, patient…)" value={it.comment || ''} onChange={(e) => setComment(idx, e.target.value)} maxLength={500} />
            )}
            {!editable && it.comment && <div className="muted small">Note: {it.comment}</div>}
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function CartDrawer() {
  const { items, open, setOpen, subtotal, unpriced, count } = useCart();
  const { user, openAuth } = useAuth();
  const nav = useNavigate();
  if (!open) return null;
  const checkout = () => {
    if (!user) { setOpen(false); openAuth('login', 'Please log in to place your order – or request an account if you don\'t have one yet.'); return; }
    setOpen(false);
    nav('/checkout');
  };
  return (
    <div className="drawer-back" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
      <aside className="drawer" aria-label="Cart">
        <div className="drawer-head">
          <h3><ShoppingCart size={19} /> Your cart <span className="muted">({count})</span></h3>
          <button className="iconbtn" onClick={() => setOpen(false)} aria-label="Close cart"><X size={20} /></button>
        </div>
        {items.length === 0 ? (
          <div className="drawer-empty">
            <ShoppingCart size={40} />
            <p>Your cart is empty.</p>
            <Link className="btn btn-primary" to="/catalog" onClick={() => setOpen(false)}>Browse products</Link>
          </div>
        ) : (
          <>
            <div className="drawer-body"><CartLines /></div>
            <div className="drawer-foot">
              <div className="row-between"><span>List price subtotal</span><b>{money(subtotal)}</b></div>
              {unpriced && <p className="muted small">Some items are priced by quote (NC / Variable). Final pricing appears on your invoice.</p>}
              <p className="muted small">Your account discounts are applied at checkout. No payment is taken online – we email your invoice.</p>
              <button className="btn btn-primary btn-block btn-lg" onClick={checkout}>{user ? 'Checkout' : <><Lock size={16} /> Log in to checkout</>}</button>
              <Link to="/cart" className="btn btn-ghost btn-block" onClick={() => setOpen(false)}>View full cart</Link>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
