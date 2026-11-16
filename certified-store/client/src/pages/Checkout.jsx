import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ShoppingCart, Paperclip, X, CheckCircle2, Lock, MapPin, Info } from 'lucide-react';
import { useAuth, useCart } from '../lib/store.jsx';
import { api } from '../lib/api.js';
import { money } from '../lib/format.js';
import { CartLines } from '../components/Cart.jsx';

export function CartPage() {
  const { items, subtotal, unpriced, clear } = useCart();
  const { user, openAuth } = useAuth();
  const nav = useNavigate();
  return (
    <div className="container pad-y">
      <h1>Your cart</h1>
      {items.length === 0 ? (
        <div className="empty card pad center">
          <ShoppingCart size={40} />
          <p>Your cart is empty.</p>
          <Link className="btn btn-primary" to="/catalog">Browse products</Link>
        </div>
      ) : (
        <div className="checkout-grid">
          <div className="card pad"><CartLines /><button className="linkbtn small danger" onClick={clear}>Empty cart</button></div>
          <div className="card pad summary">
            <div className="row-between"><span>List price subtotal</span><b>{money(subtotal)}</b></div>
            {unpriced && <p className="muted small">Some items are priced by quote (NC / Variable).</p>}
            <p className="muted small">Your account discounts are applied at checkout. No payment is taken online – we email your invoice.</p>
            {user ? <button className="btn btn-primary btn-block btn-lg" onClick={() => nav('/checkout')}>Checkout</button>
              : <button className="btn btn-primary btn-block btn-lg" onClick={() => openAuth('login', 'Please log in to place your order – or request an account if you don\'t have one yet.')}><Lock size={16} /> Log in to checkout</button>}
          </div>
        </div>
      )}
    </div>
  );
}

const addr = (s) => [s.company, s.street, s.street2, [s.city, s.state, s.zip].filter(Boolean).join(', ')].filter(Boolean).join(' · ');

export function Checkout() {
  const { items, subtotal, clear } = useCart();
  const { user, openAuth } = useAuth();
  const nav = useNavigate();
  const [acct, setAcct] = useState(null);
  const [shipIdx, setShipIdx] = useState(0);
  const [po, setPo] = useState('');
  const [patient, setPatient] = useState('');
  const [note, setNote] = useState('');
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (user === null) openAuth('login', 'Please log in to place your order.');
    if (user) api.get('/checkout').then(setAcct).catch(() => setAcct({ linked: false }));
  }, [user, openAuth]);

  if (!user) return <div className="container pad-y"><div className="card pad center"><Lock size={32} /><p>Please log in to check out.</p><button className="btn btn-primary" onClick={() => openAuth('login')}>Log in</button></div></div>;
  if (!items.length) return <div className="container pad-y"><div className="card pad center"><p>Your cart is empty.</p><Link className="btn btn-primary" to="/catalog">Browse products</Link></div></div>;

  const disc = acct?.account?.discounts || { general: 0, custom: 0, thirdparty: 0 };
  const est = items.reduce((s, i) => s + (i.price || 0) * i.qty * (1 - (disc[i.type] || 0) / 100), 0);
  const hasDisc = items.some((i) => disc[i.type] > 0 && i.price);

  const place = async () => {
    setErr('');
    setBusy(true);
    try {
      const form = new FormData();
      form.append('data', JSON.stringify({
        items: items.map((i) => ({ partNumber: i.partNumber, qty: i.qty, comment: i.comment || '' })),
        shipToIndex: shipIdx, poNumber: po, patientName: patient, note,
      }));
      files.forEach((f) => form.append('files', f));
      const d = await api.upload('/orders', form);
      clear();
      nav(`/order-placed/${d.order.id}`, { replace: true, state: d.order });
    } catch (e) {
      setErr(e.message);
    } finally { setBusy(false); }
  };

  return (
    <div className="container pad-y">
      <h1>Checkout</h1>
      <div className="checkout-grid">
        <div className="stack">
          <section className="card pad">
            <h3>1. Ship to</h3>
            {!acct && <div className="skeleton" />}
            {acct?.account?.shipTos?.length > 0 ? (
              <div className="radio-list">
                {acct.account.shipTos.map((s, i) => (
                  <label key={i} className={`radio-card ${shipIdx === i ? 'on' : ''}`}>
                    <input type="radio" name="ship" checked={shipIdx === i} onChange={() => setShipIdx(i)} />
                    <MapPin size={16} /> <span>{addr(s) || 'Address on file'}</span>
                  </label>
                ))}
              </div>
            ) : acct && (
              <p className="muted"><Info size={15} /> We will ship to the address on your Certified Ortho account. To use a different address, add it in the note below.</p>
            )}
          </section>
          <section className="card pad">
            <h3>2. Order details</h3>
            <div className="grid-2">
              <label className="field"><span>P.O #</span><input value={po} onChange={(e) => setPo(e.target.value)} maxLength={100} /></label>
              <label className="field"><span>Patient name</span><input value={patient} onChange={(e) => setPatient(e.target.value)} maxLength={200} /></label>
            </div>
            <label className="field"><span>Note for Certified Ortho</span><textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Measurements, sizes, sides, colors, delivery instructions…" maxLength={4000} /></label>
            <div className="field">
              <span>Order forms, scans or photos (optional)</span>
              <label className="filedrop">
                <Paperclip size={17} /> Attach files (PDF, images, scans – up to 10 files, 4 MB each)
                <input type="file" multiple onChange={(e) => setFiles((f) => [...f, ...Array.from(e.target.files)].slice(0, 10))} />
              </label>
              {files.length > 0 && (
                <ul className="filelist">{files.map((f, i) => <li key={i}>{f.name} <span className="muted">({Math.ceil(f.size / 1024)} KB)</span><button className="iconbtn" onClick={() => setFiles((x) => x.filter((_, k) => k !== i))} aria-label="Remove file"><X size={14} /></button></li>)}</ul>
              )}
            </div>
          </section>
          <section className="card pad">
            <h3>3. Review items</h3>
            <CartLines />
          </section>
        </div>
        <aside className="card pad summary sticky">
          <h3>Order summary</h3>
          {acct?.account && <div className="muted small">Bill to: <b>{acct.account.name}</b>{acct.account.customerId ? ` · Acct# ${acct.account.customerId}` : ''}</div>}
          <div className="row-between"><span>List price subtotal</span><span>{money(subtotal)}</span></div>
          {hasDisc && <div className="row-between green"><span>Your account discount</span><span>−{money(subtotal - est)}</span></div>}
          <div className="row-between total"><span>Estimated total</span><b>{money(est)}</b></div>
          <p className="muted small">Shipping and any quoted items (NC / Variable) are added on your invoice. <b>No payment is taken now</b> – Certified Ortho reviews your order and emails your invoice.</p>
          {err && <div className="alert alert-red">{err}</div>}
          <button className="btn btn-primary btn-block btn-lg" disabled={busy} onClick={place}>{busy ? 'Placing order…' : 'Place order'}</button>
        </aside>
      </div>
    </div>
  );
}

export function OrderPlaced() {
  const { id } = useParams();
  const [o, setO] = useState(null);
  useEffect(() => { api.get(`/orders/${id}`).then(setO).catch(() => {}); }, [id]);
  return (
    <div className="container pad-y narrow">
      <div className="card pad center">
        <CheckCircle2 size={52} className="ok-icon" />
        <h1>Thank you for your order!</h1>
        {o && <p>Your order number is <b>{o.orderNumber}</b>.</p>}
        <p>We emailed you a confirmation. Our team will review your order and email your invoice. You can follow its progress any time in your account.</p>
        <div className="row-center">
          <Link className="btn btn-primary" to={`/account/orders/${id}`}>View order</Link>
          <Link className="btn btn-outline" to="/catalog">Continue shopping</Link>
        </div>
      </div>
    </div>
  );
}
