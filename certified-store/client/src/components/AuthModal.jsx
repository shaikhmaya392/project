import { useEffect, useRef, useState } from 'react';
import { X, Lock, UserPlus, CheckCircle2, ShoppingCart } from 'lucide-react';
import { useAuth, useCart, useToast } from '../lib/store.jsx';
import { api } from '../lib/api.js';

const HEAR = ['Google / Web search', 'Referral from a colleague', 'Trade show / Conference', 'Sales representative', 'Social media', 'Other'];

export function Modal({ onClose, children, wide, label }) {
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', h);
    document.body.classList.add('noscroll');
    return () => { document.removeEventListener('keydown', h); document.body.classList.remove('noscroll'); };
  }, [onClose]);
  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={label}>
        {onClose && <button className="modal-x" onClick={onClose} aria-label="Close"><X size={20} /></button>}
        {children}
      </div>
    </div>
  );
}

function LoginForm({ onSwitch }) {
  const { login, closeAuth, modalReason } = useAuth();
  const { count, setOpen } = useCart();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const u = await login(email.trim(), password);
      closeAuth();
      toast(`Welcome back${u.name ? `, ${u.name}` : ''}!`);
      if (count > 0) setOpen(true);
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} className="auth-form">
      <div className="auth-icon"><Lock size={22} /></div>
      <h2>Log in to buy</h2>
      {modalReason ? <p className="auth-reason"><ShoppingCart size={16} /> {modalReason}</p> : <p className="muted">Log in with the email and password we sent you.</p>}
      {err && <div className="alert alert-red">{err}</div>}
      <label className="field"><span>Email</span><input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoFocus /></label>
      <label className="field"><span>Password</span><input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
      <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
      <button type="button" className="linkbtn small" onClick={() => onSwitch('forgot')}>Forgot your password?</button>
      <div className="auth-divider"><span>Don&apos;t have an account?</span></div>
      <button type="button" className="btn btn-outline btn-block" onClick={() => onSwitch('request')}><UserPlus size={17} /> Request an account</button>
      <p className="muted small center">Accounts are opened by Certified Ortho. Send a request and we&apos;ll email your login details.</p>
    </form>
  );
}

function ForgotForm({ onSwitch }) {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const d = await api.post('/auth/forgot', { email });
      setDone(d.message);
    } catch (e2) {
      setDone(e2.message);
    } finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="auth-form">
      <h2>Reset your password</h2>
      <p className="muted">Enter your login email and we&apos;ll send you a link to choose a new password.</p>
      {done ? <div className="alert alert-green">{done}</div> : (
        <>
          <label className="field"><span>Email</span><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoFocus /></label>
          <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button>
        </>
      )}
      <button type="button" className="linkbtn small" onClick={() => onSwitch('login')}>Back to log in</button>
    </form>
  );
}

/** Same fields as "Become a Certified Ortho Customer" on certifiedortho.com → CRM Leads */
export function RequestAccountForm({ onSwitch, compact }) {
  const { items } = useCart();
  const started = useRef(Date.now());
  const [f, setF] = useState({ businessName: '', phone: '', email: '', fax: '', personName: '', personTitle: '', hearAbout: '', hearOther: '', message: '', website: '' });
  const [bad, setBad] = useState([]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const set = (k) => (e) => { setF((x) => ({ ...x, [k]: e.target.value })); setBad((b) => b.filter((y) => y !== k)); };

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    const missing = ['businessName', 'phone', 'email', 'personName'].filter((k) => !f[k].trim());
    if (f.hearAbout === 'Other' && !f.hearOther.trim()) missing.push('hearOther');
    if (missing.length) { setBad(missing); setErr(missing.includes('hearOther') && missing.length === 1 ? 'Please tell us where you heard about us.' : 'Please fill in the required fields marked with *.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.trim())) { setBad(['email']); setErr('Please enter a valid email address.'); return; }
    setBusy(true);
    try {
      await api.post('/account-requests', { ...f, elapsed: Date.now() - started.current, cart: items.map((i) => ({ partNumber: i.partNumber, name: i.name, qty: i.qty })) });
      setDone(true);
    } catch (e2) {
      setErr(e2.message || 'Something went wrong. Please call us at 970-482-7116.');
      if (e2.data?.fields) setBad(e2.data.fields);
    } finally { setBusy(false); }
  };

  if (done) {
    return (
      <div className="auth-form center">
        <CheckCircle2 size={44} className="ok-icon" />
        <h3>Thank you!</h3>
        <p>We received your request. A member of our team will contact you within one business day. Need us sooner? Call <a href="tel:9704827116">970-482-7116</a>.</p>
        <p className="muted small">When your account is ready we&apos;ll email your login details. Items in your cart are saved on this device.</p>
        {onSwitch && <button className="btn btn-outline" onClick={() => onSwitch('login')}>I already have a login</button>}
      </div>
    );
  }
  const cls = (k) => (bad.includes(k) ? 'bad' : '');
  return (
    <form onSubmit={submit} className={`auth-form request-form ${compact ? 'compact' : ''}`} noValidate>
      <h3>Become a Certified Ortho Customer</h3>
      <p className="muted">Tell us about your practice and our team will contact you within one business day.</p>
      {err && <div className="alert alert-red">{err}</div>}
      <div className="grid-2">
        <label className="field"><span>Business Name *</span><input className={cls('businessName')} value={f.businessName} onChange={set('businessName')} autoComplete="organization" /></label>
        <label className="field"><span>Phone *</span><input type="tel" className={cls('phone')} value={f.phone} onChange={set('phone')} autoComplete="tel" /></label>
        <label className="field"><span>Email *</span><input type="email" className={cls('email')} value={f.email} onChange={set('email')} autoComplete="email" /></label>
        <label className="field"><span>Fax</span><input type="tel" value={f.fax} onChange={set('fax')} /></label>
        <label className="field"><span>Person Name *</span><input className={cls('personName')} value={f.personName} onChange={set('personName')} autoComplete="name" /></label>
        <label className="field"><span>Person Title</span><input value={f.personTitle} onChange={set('personTitle')} /></label>
      </div>
      <label className="field"><span>Where did you hear about us?</span>
        <select value={f.hearAbout} onChange={set('hearAbout')}>
          <option value="">Select one</option>
          {HEAR.map((h) => <option key={h}>{h}</option>)}
        </select>
      </label>
      {f.hearAbout === 'Other' && (
        <label className="field"><span>Please tell us where *</span><input className={cls('hearOther')} maxLength={120} placeholder="e.g. a magazine ad, a patient, a local event" value={f.hearOther} onChange={set('hearOther')} /></label>
      )}
      <label className="field"><span>Message / Note</span><textarea rows={3} value={f.message} onChange={set('message')} /></label>
      <label className="field"><span>Website</span><input value={f.website} onChange={set('website')} autoComplete="url" /></label>
      <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Sending...' : 'Send Request'}</button>
      <p className="muted small">Fields marked * are required.</p>
      {onSwitch && <button type="button" className="linkbtn small" onClick={() => onSwitch('login')}>Already have a login? Log in</button>}
    </form>
  );
}

export default function AuthModal() {
  const { modal, openAuth, closeAuth } = useAuth();
  if (!modal) return null;
  return (
    <Modal onClose={closeAuth} wide={modal === 'request'} label="Log in">
      {modal === 'login' && <LoginForm onSwitch={openAuth} />}
      {modal === 'forgot' && <ForgotForm onSwitch={openAuth} />}
      {modal === 'request' && <RequestAccountForm onSwitch={openAuth} />}
    </Modal>
  );
}

/** First login with the emailed temporary password → choose your own */
export function ChangePasswordGate() {
  const { user, setUser } = useAuth();
  const [cur, setCur] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [err, setErr] = useState('');
  const toast = useToast();
  if (!user?.mustChangePassword) return null;
  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (pw.length < 8) return setErr('Password must be at least 8 characters.');
    if (pw !== pw2) return setErr('Passwords do not match.');
    try {
      const d = await api.post('/auth/change-password', { current: cur, password: pw });
      setUser(d.user);
      toast('Your password has been updated.');
    } catch (e2) { setErr(e2.message); }
  };
  return (
    <Modal label="Choose a password">
      <form className="auth-form" onSubmit={submit}>
        <div className="auth-icon"><Lock size={22} /></div>
        <h2>Choose your password</h2>
        <p className="muted">For your security, please replace the temporary password from your welcome email.</p>
        {err && <div className="alert alert-red">{err}</div>}
        <label className="field"><span>Temporary password</span><input type="password" required value={cur} onChange={(e) => setCur(e.target.value)} autoFocus /></label>
        <label className="field"><span>New password (8+ characters)</span><input type="password" required value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" /></label>
        <label className="field"><span>Confirm new password</span><input type="password" required value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" /></label>
        <button className="btn btn-primary btn-block">Save password</button>
      </form>
    </Modal>
  );
}
