import { useCallback, useEffect, useState } from 'react';
import { NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import { Inbox, Users, Package, Mail, LayoutDashboard, RefreshCw, KeyRound, Search, LogOut, CheckCircle2, AlertTriangle } from 'lucide-react';
import { api } from '../lib/api.js';
import { date, money } from '../lib/format.js';
import { Modal } from '../components/AuthModal.jsx';
import { useToast } from '../lib/store.jsx';
import { Badge } from './Account.jsx';

function AdminLogin({ onDone }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    try { await api.post('/admin/login', { email, password }); onDone(); } catch (e2) { setErr(e2.message); }
  };
  return (
    <div className="container pad-y narrow">
      <form className="card pad auth-form" onSubmit={submit}>
        <h2>Store admin</h2>
        <p className="muted">For Certified Ortho staff.</p>
        {err && <div className="alert alert-red">{err}</div>}
        <label className="field"><span>Email</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus /></label>
        <label className="field"><span>Password</span><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
        <button className="btn btn-primary btn-block">Log in</button>
      </form>
    </div>
  );
}

function CrmPicker({ value, onPick, initial }) {
  const [q, setQ] = useState(initial || '');
  const [list, setList] = useState([]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const search = useCallback(async (term) => {
    setBusy(true); setErr('');
    try { setList(await api.get(`/admin/crm/accounts?q=${encodeURIComponent(term)}`)); } catch (e) { setErr(e.message); }
    setBusy(false);
  }, []);
  useEffect(() => { search(initial || ''); }, [search, initial]);
  return (
    <div className="crm-picker">
      <label className="inputicon"><Search size={15} /><input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), search(q))} placeholder="Search CRM customers (name, Acct#, email)…" /></label>
      <button type="button" className="btn btn-outline btn-sm" onClick={() => search(q)}>{busy ? 'Searching…' : 'Search'}</button>
      {err && <div className="alert alert-red">{err}</div>}
      <div className="crm-list">
        {list.map((a) => (
          <button type="button" key={a.id} className={`crm-item ${value === a.id ? 'sel' : ''}`} onClick={() => onPick(a)}>
            <b>{a.name}</b><span>Acct# {a.customerId || '—'} {a.email && `· ${a.email}`} {a.city && `· ${a.city}, ${a.state}`}</span>
          </button>
        ))}
        {!busy && !list.length && !err && <p className="muted small">No CRM customers found. Create the customer in the CRM first (Leads › convert, or Customers › New).</p>}
      </div>
    </div>
  );
}

function CreateLogin({ request, onClose, onDone }) {
  const toast = useToast();
  const [f, setF] = useState({ email: request?.email || '', name: request?.personName || '', businessName: request?.businessName || '', phone: request?.phone || '', crmAccountId: '', crmName: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setErr(''); setBusy(true);
    try {
      await api.post('/admin/customers', { ...f, requestId: request?._id });
      toast(`Login created and emailed to ${f.email}`);
      onDone();
    } catch (e) { setErr(e.message); }
    setBusy(false);
  };
  return (
    <Modal onClose={onClose} wide label="Create store login">
      <div className="auth-form">
        <h2>Create store login</h2>
        <p className="muted">The customer receives an email with their name, login email and a temporary password. Their orders go to the CRM customer you pick as Quotes.</p>
        {err && <div className="alert alert-red">{err}</div>}
        <div className="grid-2">
          <label className="field"><span>Name *</span><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
          <label className="field"><span>Login email *</span><input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>
          <label className="field"><span>Business</span><input value={f.businessName} onChange={(e) => setF({ ...f, businessName: e.target.value })} /></label>
          <label className="field"><span>Phone</span><input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></label>
        </div>
        <div className="field"><span>CRM customer {f.crmName && <b>– {f.crmName}</b>}</span>
          <CrmPicker value={f.crmAccountId} initial={request?.businessName} onPick={(a) => setF({ ...f, crmAccountId: a.id, crmName: `${a.name} (Acct# ${a.customerId || '—'})` })} />
        </div>
        <button className="btn btn-primary btn-block" disabled={busy || !f.email || !f.name} onClick={submit}>{busy ? 'Creating…' : 'Create login & email it'}</button>
      </div>
    </Modal>
  );
}

function Dashboard() {
  const [s, setS] = useState(null);
  useEffect(() => { api.get('/admin/stats').then(setS).catch(() => {}); }, []);
  if (!s) return <div className="skeleton" />;
  return (
    <>
      <div className="stats">
        <div className="stat card"><span>New account requests</span><b>{s.requests}</b></div>
        <div className="stat card"><span>Store logins</span><b>{s.customers}</b></div>
        <div className="stat card"><span>Store orders</span><b>{s.orders}</b></div>
        <div className="stat card"><span>Not yet in CRM</span><b className={s.unsynced ? 'red' : ''}>{s.unsynced}</b></div>
      </div>
      <div className="card pad">
        <h3>Connections</h3>
        <p>{s.crm.ok ? <><CheckCircle2 className="green" size={16} /> CRM connected</> : <><AlertTriangle className="red" size={16} /> CRM: {s.crm.configured ? s.crm.error : 'not configured – set CRM_SERVICE_EMAIL / CRM_SERVICE_PASSWORD'}</>}</p>
        <p>{s.smtp ? <><CheckCircle2 className="green" size={16} /> Email (SMTP) configured</> : <><AlertTriangle className="red" size={16} /> Email not configured – messages are kept in the Emails tab</>}</p>
        <p className="muted small">Catalog: {s.products} products · {s.pages} pages from certifiedortho.com</p>
      </div>
    </>
  );
}

function Requests() {
  const [list, setList] = useState(null);
  const [creating, setCreating] = useState(null);
  const load = () => api.get('/admin/requests').then(setList);
  useEffect(() => { load(); }, []);
  const setStatus = async (r, status) => { await api.patch(`/admin/requests/${r._id}`, { status }); load(); };
  return (
    <div className="card pad">
      <h3>Account requests</h3>
      <p className="muted small">Every request is also in CRM › Leads. Create the customer in the CRM (or find the existing one), then create the store login here.</p>
      {!list ? <div className="skeleton" /> : (
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Date</th><th>Business</th><th>Person</th><th>Email / Phone</th><th>Message</th><th>CRM lead</th><th>Status</th><th /></tr></thead>
            <tbody>
              {list.map((r) => (
                <tr key={r._id}>
                  <td>{date(r.createdAt)}</td><td><b>{r.businessName}</b>{r.website && <div className="muted small">{r.website}</div>}</td>
                  <td>{r.personName}{r.personTitle && <div className="muted small">{r.personTitle}</div>}</td>
                  <td>{r.email}<div className="muted small">{r.phone}{r.fax && ` · fax ${r.fax}`}</div></td>
                  <td className="small">{r.message}{r.hearAbout && <div className="muted">Heard: {r.hearAbout}</div>}{r.cartSnapshot?.length > 0 && <div className="muted">Cart: {r.cartSnapshot.map((c) => `${c.qty}×${c.partNumber}`).join(', ')}</div>}</td>
                  <td>{r.crmLead?.ok ? <Badge tone="green">Sent</Badge> : <Badge tone="red">{r.crmLead?.error ? 'Failed' : '—'}</Badge>}</td>
                  <td><Badge tone={r.status === 'approved' ? 'green' : r.status === 'rejected' ? 'red' : 'blue'}>{r.status}</Badge></td>
                  <td className="actions">
                    {r.status !== 'approved' && <button className="btn btn-primary btn-sm" onClick={() => setCreating(r)}>Create login</button>}
                    {r.status === 'new' && <button className="btn btn-ghost btn-sm" onClick={() => setStatus(r, 'rejected')}>Reject</button>}
                  </td>
                </tr>
              ))}
              {!list.length && <tr><td colSpan={8} className="muted">No requests yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {creating && <CreateLogin request={creating} onClose={() => setCreating(null)} onDone={() => { setCreating(null); load(); }} />}
    </div>
  );
}

function Logins() {
  const [list, setList] = useState(null);
  const [creating, setCreating] = useState(false);
  const [linking, setLinking] = useState(null);
  const toast = useToast();
  const load = () => api.get('/admin/customers').then(setList);
  useEffect(() => { load(); }, []);
  const reset = async (c) => { await api.post(`/admin/customers/${c._id}/reset-password`); toast(`New password emailed to ${c.email}`); };
  const toggle = async (c) => { await api.patch(`/admin/customers/${c._id}`, { active: !c.active }); load(); };
  return (
    <div className="card pad">
      <div className="row-between"><h3>Store logins</h3><button className="btn btn-primary btn-sm" onClick={() => setCreating(true)}>New login</button></div>
      {!list ? <div className="skeleton" /> : (
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Name</th><th>Email</th><th>Business</th><th>CRM Acct#</th><th>Last login</th><th>Status</th><th /></tr></thead>
            <tbody>
              {list.map((c) => (
                <tr key={c._id}>
                  <td>{c.name}</td><td>{c.email}</td><td>{c.businessName}</td>
                  <td>{c.crmAccountId ? (c.crmCustomerId || 'linked') : <Badge tone="amber">Not linked</Badge>}</td>
                  <td>{date(c.lastLoginAt)}</td>
                  <td><Badge tone={c.active ? 'green' : 'gray'}>{c.active ? 'Active' : 'Disabled'}</Badge></td>
                  <td className="actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => setLinking(c)}>Link CRM</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => reset(c)}><KeyRound size={14} /> Reset password</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => toggle(c)}>{c.active ? 'Disable' : 'Enable'}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {creating && <CreateLogin onClose={() => setCreating(false)} onDone={() => { setCreating(false); load(); }} />}
      {linking && (
        <Modal onClose={() => setLinking(null)} wide label="Link CRM customer">
          <div className="auth-form">
            <h2>Link {linking.email} to a CRM customer</h2>
            <CrmPicker value={linking.crmAccountId} initial={linking.businessName} onPick={async (a) => { await api.patch(`/admin/customers/${linking._id}`, { crmAccountId: a.id }); toast(`Linked to ${a.name}`); setLinking(null); load(); }} />
          </div>
        </Modal>
      )}
    </div>
  );
}

function Orders() {
  const [list, setList] = useState(null);
  const toast = useToast();
  const load = () => api.get('/admin/orders').then(setList);
  useEffect(() => { load(); }, []);
  const sync = async (o) => {
    const d = await api.post(`/admin/orders/${o._id}/sync`);
    toast(d.synced ? `Sent to CRM as Quote ${d.quoteNumber || ''}` : `Not sent: ${d.error}`, d.synced ? 'success' : 'error');
    load();
  };
  return (
    <div className="card pad">
      <h3>Store orders</h3>
      <p className="muted small">Each order is created in the CRM as a Quote. Process it there: Quote › Work Order › Invoice › Payment.</p>
      {!list ? <div className="skeleton" /> : (
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Order</th><th>Date</th><th>Customer</th><th>P.O #</th><th>Lines</th><th className="r">Estimated</th><th>CRM</th><th /></tr></thead>
            <tbody>
              {list.map((o) => (
                <tr key={o._id}>
                  <td className="pn">{o.orderNumber}</td><td>{date(o.createdAt)}</td>
                  <td>{o.customer?.businessName || o.customer?.name}<div className="muted small">{o.customer?.email}</div></td>
                  <td>{o.poNumber || '—'}</td><td>{o.items.length}</td><td className="r">{money(o.estimatedTotal)}</td>
                  <td>{o.crm?.synced ? <Badge tone="green">Quote {o.crm.quoteNumber}</Badge> : <><Badge tone="red">Not sent</Badge><div className="muted small">{o.crm?.error}</div></>}</td>
                  <td>{!o.crm?.synced && <button className="btn btn-outline btn-sm" onClick={() => sync(o)}><RefreshCw size={14} /> Send to CRM</button>}</td>
                </tr>
              ))}
              {!list.length && <tr><td colSpan={8} className="muted">No orders yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Emails() {
  const [list, setList] = useState(null);
  const [view, setView] = useState(null);
  useEffect(() => { api.get('/admin/outbox').then(setList); }, []);
  return (
    <div className="card pad">
      <h3>Emails sent by the store</h3>
      {!list ? <div className="skeleton" /> : (
        <table className="data">
          <thead><tr><th>Date</th><th>To</th><th>Subject</th><th>Status</th></tr></thead>
          <tbody>{list.map((m) => <tr key={m._id} className="clickable" onClick={() => setView(m)}><td>{date(m.createdAt)}</td><td>{m.to}</td><td>{m.subject}</td><td>{m.sent ? <Badge tone="green">Sent</Badge> : <Badge tone={m.error ? 'red' : 'amber'}>{m.error ? 'Failed' : 'Not sent (no SMTP)'}</Badge>}</td></tr>)}</tbody>
        </table>
      )}
      {view && <Modal onClose={() => setView(null)} wide label="Email"><iframe title="email" className="email-frame" srcDoc={view.html} /></Modal>}
    </div>
  );
}

export default function Admin() {
  const [me, setMe] = useState(undefined);
  const nav = useNavigate();
  const load = () => api.get('/admin/me').then((d) => setMe(d.admin)).catch(() => setMe(null));
  useEffect(() => { load(); }, []);
  if (me === undefined) return <div className="container pad-y"><div className="skeleton" /></div>;
  if (!me) return <AdminLogin onDone={load} />;
  return (
    <div className="container pad-y account">
      <aside className="account-nav card">
        <div className="account-who"><div><b>Store admin</b><span className="muted small">{me.email}</span></div></div>
        <NavLink end to="/admin"><LayoutDashboard size={17} /> Dashboard</NavLink>
        <NavLink to="/admin/requests"><Inbox size={17} /> Account requests</NavLink>
        <NavLink to="/admin/logins"><Users size={17} /> Store logins</NavLink>
        <NavLink to="/admin/orders"><Package size={17} /> Orders</NavLink>
        <NavLink to="/admin/emails"><Mail size={17} /> Emails</NavLink>
        <button onClick={async () => { await api.post('/admin/logout'); setMe(null); nav('/admin'); }}><LogOut size={17} /> Log out</button>
      </aside>
      <div className="account-main">
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="requests" element={<Requests />} />
          <Route path="logins" element={<Logins />} />
          <Route path="orders" element={<Orders />} />
          <Route path="emails" element={<Emails />} />
        </Routes>
      </div>
    </div>
  );
}
