import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, ExternalLink } from 'lucide-react';
import { api } from '../lib/api.js';
import { priceText, TYPE_LABEL } from '../lib/format.js';
import { AddToCart, Thumb } from '../components/Cart.jsx';

const TABS = [['all', 'All Products'], ['general', 'General Products'], ['custom', 'Custom Products'], ['thirdparty', 'Third Party Products']];

/** The complete Certified Ortho price list (same rows, headings and notes as the CRM) */
export default function Catalog() {
  const [rows, setRows] = useState(null);
  const [sp, setSp] = useSearchParams();
  const tab = sp.get('type') || 'all';
  const [q, setQ] = useState(sp.get('q') || '');
  const [section, setSection] = useState(sp.get('section') || '');

  const [skus, setSkus] = useState({});
  useEffect(() => { api.get('/catalog').then(setRows).catch(() => setRows([])); }, []);
  useEffect(() => { api.get('/shop/skus').then(setSkus).catch(() => {}); }, []);

  const sections = useMemo(() => {
    if (!rows) return [];
    return [...new Set(rows.filter((r) => r.kind === 'product' && (tab === 'all' || r.type === tab)).map((r) => r.section || r.major).filter(Boolean))];
  }, [rows, tab]);

  const view = useMemo(() => {
    if (!rows) return [];
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    const out = [];
    let curType = null; let curMajor = null; let curSub = null;
    for (const r of rows) {
      if (r.kind !== 'product') continue;
      if (tab !== 'all' && r.type !== tab) continue;
      if (section && (r.section || r.major) !== section) continue;
      if (words.length && !words.every((w) => `${r.partNumber} ${r.name} ${r.sub} ${r.major} ${(r.lines || []).join(' ')}`.toLowerCase().includes(w))) continue;
      if (r.type !== curType) { out.push({ h: 'type', text: TYPE_LABEL[r.type], key: `t-${r.type}` }); curType = r.type; curMajor = null; curSub = null; }
      if (r.major !== curMajor) { out.push({ h: 'major', text: r.major, key: `m-${r.seq}` }); curMajor = r.major; curSub = null; }
      if (r.sub && r.sub !== curSub) {
        out.push({ h: 'sub', text: r.sub, key: `s-${r.seq}` });
        // notes printed with this group in the price list
        for (const n of rows) if (n.kind === 'note' && n.type === r.type && n.major === r.major && n.sub === r.sub) out.push({ h: 'note', text: n.text, key: `n-${n.seq}` });
        curSub = r.sub;
      }
      out.push({ row: r, key: r.seq });
    }
    return out;
  }, [rows, tab, q, section]);

  const setTab = (t) => { const n = new URLSearchParams(sp); if (t === 'all') n.delete('type'); else n.set('type', t); setSp(n, { replace: true }); setSection(''); };
  const count = view.filter((v) => v.row).length;

  return (
    <div className="container pad-y catalog">
      <div className="catalog-head">
        <div>
          <h1>Products</h1>
          <p className="muted">Product catalog grouped by section, exactly as it appears in the Certified Ortho price list.</p>
        </div>
      </div>
      <div className="catalog-tools card">
        <div className="seg">
          {TABS.map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}
        </div>
        <div className="catalog-filters">
          <label className="inputicon"><Search size={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search ID, name or description…" /></label>
          <select value={section} onChange={(e) => setSection(e.target.value)} aria-label="Section">
            <option value="">All sections</option>
            {sections.map((s) => <option key={s}>{s}</option>)}
          </select>
          <span className="muted small">{rows ? `${count} products` : 'Loading…'}</span>
        </div>
      </div>
      <div className="pricelist card">
        <div className="pl-row pl-hdr"><span /><span>Product ID</span><span>Description</span><span>Unit</span><span className="r">List Price</span><span /></div>
        {!rows && <div className="skeleton tall" />}
        {view.map((v) => {
          if (v.h === 'type') return <div key={v.key} className="pl-type">{v.text}</div>;
          if (v.h === 'major') return <div key={v.key} className="pl-major">{v.text}</div>;
          if (v.h === 'sub') return <div key={v.key} className="pl-sub">{v.text}</div>;
          if (v.h === 'note') return <div key={v.key} className="pl-note">{v.text}</div>;
          const r = v.row;
          const sp = skus[r.partNumber];
          const url = sp ? `/product/${sp.slug}` : r.page ? `/p/${r.page}` : null;
          return (
            <div key={v.key} className="pl-row">
              {url ? <Link to={url} className="pl-thumb"><Thumb src={sp?.image || r.image} alt={r.name} size={52} /></Link> : <Thumb src={r.image} alt={r.name} size={52} />}
              <span className="pn">{r.partNumber}</span>
              <span className="pl-desc">
                {url ? <Link to={url} className="pl-name">{r.name}</Link> : r.name}
                {(r.lines || []).map((l, i) => <small key={i}>{l}</small>)}
                {url && <Link to={url} className="pl-link">View product <ExternalLink size={12} /></Link>}
              </span>
              <span className="muted">{r.unit}</span>
              <span className="r price">{priceText(r)}</span>
              <AddToCart product={r} compact />
            </div>
          );
        })}
        {rows && !count && <p className="pad muted">No products match your search.</p>}
      </div>
    </div>
  );
}
