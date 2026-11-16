import { useMemo, useState } from 'react';
import { Search, ShoppingBag, ChevronDown } from 'lucide-react';
import { priceText } from '../lib/format.js';
import { AddToCart, Thumb } from './Cart.jsx';

/** All CRM price-list SKUs of a product page, grouped exactly like the price list */
export default function ProductOptions({ products, notes = [], title, pageImage }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState({});
  const groups = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    const list = products.filter((p) => words.every((w) => `${p.partNumber} ${p.name} ${p.siteCaption || ''}`.toLowerCase().includes(w)));
    const out = [];
    for (const p of list) {
      const g = p.sub || p.major || '';
      if (!out.length || out[out.length - 1].name !== g) {
        out.push({ name: g, items: [], notes: notes.filter((n) => n.type === p.type && n.major === p.major && n.sub === p.sub).map((n) => n.text) });
      }
      out[out.length - 1].items.push(p);
    }
    return out;
  }, [products, notes, q]);
  if (!products.length) return null;
  const priced = products.filter((p) => p.price > 0).map((p) => p.price);
  const min = priced.length ? Math.min(...priced) : null;
  const max = priced.length ? Math.max(...priced) : null;

  return (
    <section className="options card" id="order">
      <div className="options-head">
        <div>
          <h2><ShoppingBag size={20} /> Order {title}</h2>
          <p className="muted">
            {products.length} option{products.length === 1 ? '' : 's'}
            {min != null && <> · {min === max ? `$${min.toFixed(2)}` : `$${min.toFixed(2)} – $${max.toFixed(2)}`} list price</>}
            {' '}· Choose the exact item, then add it to your cart.
          </p>
        </div>
        {products.length > 8 && (
          <label className="options-search">
            <Search size={16} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by part #, size, color…" />
          </label>
        )}
      </div>
      {groups.map((g, gi) => {
        // long pages: groups start folded (first one open) so the page stays short
        const isOpen = q || products.length <= 12 || (open[g.name] ?? (groups.length === 1 && gi === 0));
        const prices = g.items.filter((p) => p.price > 0).map((p) => p.price);
        const anyImg = g.items.some((p) => p.image);
        return (
          <div key={g.name} className="opt-group">
            {g.name && (
              <button type="button" className={`opt-group-title ${isOpen ? 'on' : ''}`} onClick={() => setOpen((s) => ({ ...s, [g.name]: !isOpen }))}>
                <span>{g.name}</span>
                <span className="opt-group-meta">{g.items.length} item{g.items.length === 1 ? '' : 's'}{prices.length > 0 && ` · $${Math.min(...prices).toFixed(2)}${Math.max(...prices) !== Math.min(...prices) ? ` – $${Math.max(...prices).toFixed(2)}` : ''}`}<ChevronDown size={16} /></span>
              </button>
            )}
            {isOpen && (
              <>
                {g.notes.map((n) => <p key={n} className="opt-note">{n}</p>)}
                <div className={`opt-table ${anyImg ? '' : 'noimg'}`}>
                  {g.items.map((p) => (
                    <div className="opt-row" key={p.partNumber}>
                      {anyImg && <Thumb src={p.image} alt={p.name} size={40} />}
                      <span className="pn">{p.partNumber}</span>
                      <span className="opt-desc">
                        {p.name}
                        {p.siteCaption && p.siteCaption !== p.name && <small>{p.siteCaption}</small>}
                        {p.lines?.map((l, i) => <small key={i}>{l}</small>)}
                      </span>
                      <span className="muted">{p.unit}</span>
                      <span className="r price">{priceText(p)}</span>
                      <AddToCart product={{ ...p, pageImage }} compact />
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        );
      })}
      {!groups.length && <p className="muted">No option matches “{q}”.</p>}
    </section>
  );
}
