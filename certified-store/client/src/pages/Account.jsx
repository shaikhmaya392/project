import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useParams } from 'react-router-dom';
import { LayoutDashboard, Package, FileText, User, Lock, Download, Check, Circle, Truck } from 'lucide-react';
import { useAuth, useToast } from '../lib/store.jsx';
import { api } from '../lib/api.js';
import { money, date, priceText } from '../lib/format.js';

const TONES = { Paid: 'green', 'Partially Paid': 'amber', Sent: 'blue', Overdue: 'red', Draft: 'gray', Accepted: 'green', Declined: 'red', Expired: 'gray', 'In Progress': 'blue', 'Waiting for Parts': 'amber', 'Quality Check': 'navy', 'Ready to Ship': 'green', Shipped: 'navy', Completed: 'green', Cancelled: 'red' };
export const Badge = ({ children, tone }) => <span className={`badge badge-${tone || TONES[children] || 'gray'}`}>{children}</span>;

export function AccountLayout() {
  const { user, openAuth } = useAuth();
  useEffect(() => { if (user === null) openAuth('login', 'Please log in to see your account.'); }, [user, openAuth]);
  if (user === undefined) return <div className="container pad-y"><div className="skeleton tall" /></div>;
  if (!user) return <div className="container pad-y"><div className="card pad center"><Lock size={32} /><p>Please log in to see your account.</p><button className="btn btn-primary" onClick={() => openAuth('login')}>Log in</button></div></div>;
  return (
    <div className="container pad-y account">
      <aside className="account-nav card">
        <div className="account-who"><span className="avatar lg">{(user.name || user.email)[0].toUpperCase()}</span><div><b>{user.businessName || user.name}</b><span className="muted small">{user.email}</span>{user.crmCustomerId && <span className="muted small">Acct# {user.crmCustomerId}</span>}</div></div>
        <NavLink end to="/account"><LayoutDashboard size={17} /> Overview</NavLink>
        <NavLink to="/account/orders"><Package size={17} /> My orders</NavLink>
        <NavLink to="/account/invoices"><FileText size={17} /> Invoices &amp; payments</NavLink>
        <NavLink to="/account/profile"><User size={17} /> Profile &amp; password</NavLink>
      </aside>
      <div className="account-main"><Outlet /></div>
    </div>
  );
}

function usePortal() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { api.get('/portal').then(setD).catch((e) => setErr(e.message)); }, []);
  return [d, err];
}

export function AccountOverview() {
  const [d, err] = usePortal();
  const [orders, setOrders] = useState(null);
  useEffect(() => { api.get('/orders').then(setOrders).catch(() => setOrders([])); }, []);
  return (
    <>
      <h1>My account</h1>
      {err && <div className="alert alert-red">{err}</div>}
      {d && !d.linked && <div className="alert alert-amber">Your account is being set up by Certified Ortho. You can already place orders; invoices will appear here once your account is linked.</div>}
      <div className="stats">
        <div className="stat card"><span>Store orders</span><b>{d ? d.storeOrders : '…'}</b></div>
        <div className="stat card"><span>In progress</span><b>{d?.summary ? d.summary.inProgress : '—'}</b></div>
        <div className="stat card"><span>Unpaid invoices</span><b>{d?.summary ? d.summary.unpaidInvoices : '—'}</b></div>
        <div className="stat card"><span>Open balance</span><b className={d?.summary?.openBalance > 0 ? 'red' : ''}>{d?.summary ? money(d.summary.openBalance) : '—'}</b>{d?.summary?.overdue > 0 && <small className="red">{d.summary.overdue} overdue</small>}</div>
      </div>
      <div className="card pad">
        <div className="row-between"><h3>Recent orders</h3><Link to="/account/orders">View all</Link></div>
        <OrdersTable orders={(orders || []).slice(0, 5)} loading={!orders} />
      </div>
      {d?.account && (
        <div className="card pad">
          <h3>Account on file</h3>
          <p><b>{d.account.name}</b>{d.account.customerId && <span className="muted"> · Acct# {d.account.customerId}</span>}</p>
          {(d.account.shipTos || []).map((s, i) => <p key={i} className="muted small">Ship to: {[s.company, s.street, s.street2, s.city, s.state, s.zip].filter(Boolean).join(', ')}</p>)}
        </div>
      )}
    </>
  );
}

function OrdersTable({ orders, loading }) {
  if (loading) return <div className="skeleton" />;
  if (!orders.length) return <p className="muted">No orders yet. <Link to="/catalog">Start shopping</Link></p>;
  return (
    <div className="table-wrap">
      <table className="data">
        <thead><tr><th>Order</th><th>Date</th><th>P.O #</th><th>Items</th><th className="r">Estimated</th><th>Status</th><th>Invoice</th></tr></thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id}>
              <td><Link to={`/account/orders/${o.id}`} className="pn">{o.orderNumber}</Link></td>
              <td>{date(o.date)}</td>
              <td>{o.poNumber || '—'}</td>
              <td>{o.itemCount}</td>
              <td className="r">{money(o.estimatedTotal)}</td>
              <td><Badge tone={o.progress.tone}>{o.progress.step}</Badge></td>
              <td>{o.invoice ? <>{o.invoice.number} <Badge>{o.invoice.status}</Badge></> : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AccountOrders() {
  const [orders, setOrders] = useState(null);
  useEffect(() => { api.get('/orders').then(setOrders).catch(() => setOrders([])); }, []);
  return (
    <>
      <h1>My orders</h1>
      <div className="card pad"><OrdersTable orders={orders || []} loading={!orders} /></div>
    </>
  );
}

function Docs({ params }) {
  const [docs, setDocs] = useState(null);
  useEffect(() => { api.get(`/portal/documents?${new URLSearchParams(params)}`).then(setDocs).catch(() => setDocs([])); }, [JSON.stringify(params)]); // eslint-disable-line
  if (!docs?.length) return null;
  return <div className="docs">{docs.map((d) => <a key={d.id} className="btn btn-doc btn-sm" href={`/api/portal/documents/${d.id}/download`}><Download size={14} /> {d.title || 'Document'}</a>)}</div>;
}

export function OrderDetail() {
  const { id } = useParams();
  const [o, setO] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { api.get(`/orders/${id}`).then(setO).catch((e) => setErr(e.message)); }, [id]);
  if (err) return <div className="alert alert-red">{err}</div>;
  if (!o) return <div className="skeleton tall" />;
  return (
    <>
      <div className="row-between wrap"><h1>Order {o.orderNumber}</h1><Badge tone={o.progress.tone}>{o.progress.step}</Badge></div>
      <p className="muted">Placed {date(o.date)}{o.poNumber && ` · P.O # ${o.poNumber}`}{o.patientName && ` · Patient: ${o.patientName}`}</p>
      <div className="card pad">
        <ol className="timeline">
          {o.timeline.map((t) => (
            <li key={t.label} className={t.done ? 'done' : ''}>
              <span className="dot">{t.done ? <Check size={13} /> : <Circle size={10} />}</span>
              <div><b>{t.label}</b>{t.detail && <span className="muted"> – {t.detail}</span>}{t.date && <div className="muted small">{date(t.date)}</div>}</div>
            </li>
          ))}
        </ol>
      </div>
      {o.invoices.map((inv) => (
        <div className="card pad" key={inv.id}>
          <div className="row-between wrap"><h3>Invoice {inv.number}</h3><Badge>{inv.status}</Badge></div>
          <div className="kv">
            <div><span>Date</span><b>{date(inv.date)}</b></div>
            {inv.dueDate && <div><span>Due</span><b>{date(inv.dueDate)}</b></div>}
            <div><span>Total</span><b>{money(inv.total)}</b></div>
            <div><span>Paid</span><b>{money(inv.amountPaid ?? (inv.total - inv.balance))}</b></div>
            <div><span>Balance</span><b className={inv.balance > 0 ? 'red' : 'green'}>{money(inv.balance)}</b></div>
            {inv.trackingNumber && <div><span><Truck size={13} /> Tracking</span><b>{inv.carrier} {inv.trackingNumber}</b></div>}
          </div>
          <Docs params={{ invoice: inv.id }} />
        </div>
      ))}
      <div className="card pad">
        <h3>Items</h3>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Product ID</th><th>Description</th><th className="r">Qty</th><th className="r">List price</th><th className="r">Discount</th></tr></thead>
            <tbody>
              {o.items.map((i, k) => (
                <tr key={k}>
                  <td className="pn">{i.page ? <Link to={`/p/${i.page}`}>{i.partNumber}</Link> : i.partNumber}</td>
                  <td>{i.name}{i.comment && <div className="muted small">{i.comment}</div>}</td>
                  <td className="r">{i.qty} {i.unit}</td>
                  <td className="r">{priceText({ price: i.listPrice, priceLabel: i.priceLabel })}</td>
                  <td className="r">{i.discountPercent ? `${i.discountPercent}%` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="row-between total"><span>Estimated total</span><b>{money(o.estimatedTotal)}</b></div>
        {o.files.length > 0 && <p className="muted small">Attached: {o.files.map((f) => f.name).join(', ')}</p>}
        {o.note && <p className="muted small">Note: {o.note}</p>}
      </div>
    </>
  );
}

export function AccountInvoices() {
  const [d, err] = usePortal();
  return (
    <>
      <h1>Invoices &amp; payments</h1>
      {err && <div className="alert alert-red">{err}</div>}
      {d?.summary && (
        <div className="stats">
          <div className="stat card"><span>Open balance</span><b className={d.summary.openBalance > 0 ? 'red' : ''}>{money(d.summary.openBalance)}</b></div>
          <div className="stat card"><span>Unpaid invoices</span><b>{d.summary.unpaidInvoices}</b></div>
          <div className="stat card"><span>Overdue</span><b className={d.summary.overdue ? 'red' : ''}>{d.summary.overdue}</b></div>
        </div>
      )}
      <div className="card pad">
        {!d && !err && <div className="skeleton" />}
        {d && !d.linked && <p className="muted">Invoices will appear here once Certified Ortho links your store login to your customer account.</p>}
        {d?.linked && (d.invoices.length === 0 ? <p className="muted">No invoices yet.</p> : (
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>Invoice</th><th>Date</th><th>Due</th><th>P.O #</th><th className="r">Total</th><th className="r">Balance</th><th>Status</th><th /></tr></thead>
              <tbody>
                {d.invoices.map((i) => (
                  <tr key={i.id}>
                    <td className="pn">{i.number}</td><td>{date(i.date)}</td><td>{date(i.dueDate)}</td><td>{i.poNumber || '—'}</td>
                    <td className="r">{money(i.total)}</td><td className={`r ${i.balance > 0 ? 'red' : ''}`}>{money(i.balance)}</td>
                    <td><Badge>{i.status}</Badge></td>
                    <td><Docs params={{ invoice: i.id }} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
      {d?.linked && d.workOrders.length > 0 && (
        <div className="card pad">
          <h3>All orders on your account</h3>
          <p className="muted small">Includes orders placed by phone, fax, email or the app.</p>
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>Work order</th><th>Date</th><th>P.O #</th><th>Patient</th><th className="r">Total</th><th>Status</th></tr></thead>
              <tbody>{d.workOrders.map((w) => <tr key={w.id}><td className="pn">{w.number}</td><td>{date(w.date)}</td><td>{w.poNumber || '—'}</td><td>{w.patientName || '—'}</td><td className="r">{money(w.total)}</td><td><Badge>{w.status}</Badge></td></tr>)}</tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

export function AccountProfile() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [cur, setCur] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [err, setErr] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (pw.length < 8) return setErr('Password must be at least 8 characters.');
    if (pw !== pw2) return setErr('Passwords do not match.');
    try {
      const d = await api.post('/auth/change-password', { current: cur, password: pw });
      setUser(d.user); setCur(''); setPw(''); setPw2('');
      toast('Password updated');
    } catch (e2) { setErr(e2.message); }
  };
  return (
    <>
      <h1>Profile &amp; password</h1>
      <div className="card pad">
        <div className="kv">
          <div><span>Name</span><b>{user.name || '—'}</b></div>
          <div><span>Business</span><b>{user.businessName || '—'}</b></div>
          <div><span>Email (login)</span><b>{user.email}</b></div>
          {user.crmCustomerId && <div><span>Acct#</span><b>{user.crmCustomerId}</b></div>}
        </div>
        <p className="muted small">To change your business details or addresses, call 970-482-7116 or email info@certifiedortho.com.</p>
      </div>
      <form className="card pad narrow-form" onSubmit={submit}>
        <h3>Change password</h3>
        {err && <div className="alert alert-red">{err}</div>}
        <label className="field"><span>Current password</span><input type="password" value={cur} onChange={(e) => setCur(e.target.value)} required /></label>
        <label className="field"><span>New password</span><input type="password" value={pw} onChange={(e) => setPw(e.target.value)} required autoComplete="new-password" /></label>
        <label className="field"><span>Confirm new password</span><input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} required autoComplete="new-password" /></label>
        <button className="btn btn-primary">Update password</button>
      </form>
    </>
  );
}
