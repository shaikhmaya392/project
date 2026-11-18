import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X, ChevronRight, ChevronLeft, MousePointerClick, ListChecks, ShoppingCart } from 'lucide-react';
import { api } from '../lib/api.js';
import { useSite } from '../lib/store.jsx';
import { media } from '../lib/format.js';
import ProductCard from '../components/ProductCard.jsx';

function HowToOrder() {
  return (
    <div className="howto">
      <div><span className="howto-n"><MousePointerClick size={18} /></span><div><b>1. Choose a product</b><small>Browse a category or search by name / part number</small></div></div>
      <div><span className="howto-n"><ListChecks size={18} /></span><div><b>2. Pick size, color, side…</b><small>Select the options and quantity on the product page</small></div></div>
      <div><span className="howto-n"><ShoppingCart size={18} /></span><div><b>3. Add to cart &amp; checkout</b><small>Log in to place the order – we email your invoice</small></div></div>
    </div>
  );
}

function CategoryTree({ current, onPick, categories }) {
  const tops = categories.filter((c) => !c.parent);
  const curTop = categories.find((c) => c.slug === current)?.parent || current;
  const [open, setOpen] = useState(() => new Set([curTop]));
  useEffect(() => { if (curTop) setOpen((o) => new Set([...o, curTop])); }, [curTop]);
  const toggle = (slug) => setOpen((o) => { const n = new Set(o); if (n.has(slug)) n.delete(slug); else n.add(slug); return n; });
  return (
    <ul className="cat-tree">
      <li><button className={`cat-row ${!current ? 'on' : ''}`} onClick={() => onPick('')}><span>All Products</span></button></li>
      {tops.map((t) => {
        const kids = categories.filter((c) => c.parent === t.slug);
        const isOpen = open.has(t.slug);
        return (
          <li key={t.slug} className={isOpen ? 'open' : ''}>
            <div className="cat-line">
              <button className={`cat-row ${current === t.slug ? 'on' : ''}`} onClick={() => { onPick(t.slug); setOpen((o) => new Set([...o, t.slug])); }}>
                <span>{t.name}</span><em>{t.count}</em>
              </button>
              {kids.length > 0 && (
                <button className="cat-toggle" onClick={() => toggle(t.slug)} aria-label={isOpen ? `Hide ${t.name}` : `Show ${t.name}`}>
                  <ChevronRight size={16} />
                </button>
              )}
            </div>
            {kids.length > 0 && isOpen && (
              <ul>
                {kids.map((k) => (
                  <li key={k.slug}><button className={`cat-row sub ${current === k.slug ? 'on' : ''}`} onClick={() => onPick(k.slug)}><span>{k.name}</span><em>{k.count}</em></button></li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default function Shop() {
  const site = useSite();
  const categories = site?.categories || [];
  const [sp, setSp] = useSearchParams();
  const category = sp.get('category') || '';
  const line = sp.get('line') || ''; // one product line from certifiedortho.com (old /p/<slug> link)
  const q = sp.get('q') || '';
  const sort = sp.get('sort') || 'default';
  const page = Number(sp.get('page') || 1);
  const min = sp.get('min') || '';
  const max = sp.get('max') || '';
  const [data, setData] = useState(null);
  const [term, setTerm] = useState(q);
  const [pmin, setPmin] = useState(min);
  const [pmax, setPmax] = useState(max);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const set = (patch) => {
    const n = new URLSearchParams(sp);
    Object.entries(patch).forEach(([k, v]) => (v === '' || v == null ? n.delete(k) : n.set(k, v)));
    if (!('page' in patch)) n.delete('page');
    setSp(n);
  };

  useEffect(() => { setTerm(q); }, [q]);
  useEffect(() => { setPmin(min); setPmax(max); }, [min, max]);
  useEffect(() => {
    setData(null);
    const qs = new URLSearchParams({ category, line, q, sort, page, min, max, perPage: 24 });
    api.get(`/shop/products?${qs}`).then(setData).catch(() => setData({ total: 0, products: [], pages: 1 }));
    window.scrollTo({ top: 0 });
  }, [category, line, q, sort, page, min, max]);

  const cat = categories.find((c) => c.slug === category);
  const parent = cat?.parent ? categories.find((c) => c.slug === cat.parent) : null;
  const subs = useMemo(() => categories.filter((c) => c.parent === (cat?.parent ? cat.parent : category) && category), [categories, cat, category]);

  return (
    <div className="shop">
      <div className="shop-band">
        <div className="container">
          <nav className="crumbs" aria-label="Breadcrumb">
            <Link to="/">Home</Link><span><ChevronRight size={14} /><Link to="/shop">Shop</Link></span>
            {parent && <span><ChevronRight size={14} /><Link to={`/shop?category=${parent.slug}`}>{parent.name}</Link></span>}
            {cat && <span><ChevronRight size={14} />{cat.name}</span>}
            {data?.line && <span><ChevronRight size={14} />{data.line.title}</span>}
          </nav>
          <h1>{q ? `Search: “${q}”` : line && data?.line ? data.line.title : cat ? cat.name : 'Shop All Products'}</h1>
          {line && <button className="btn btn-outline btn-sm" onClick={() => set({ line: '' })}>Show all products</button>}
          {subs.length > 0 && (
            <div className="subcat-chips">
              {subs.map((s) => <button key={s.slug} className={s.slug === category ? 'on' : ''} onClick={() => set({ category: s.slug })}>{s.name} <em>{s.count}</em></button>)}
            </div>
          )}
        </div>
      </div>

      <div className="container shop-layout">
        <aside className={`shop-filters card ${filtersOpen ? 'open' : ''}`}>
          <div className="row-between"><h3>Filters</h3><button className="iconbtn only-mobile" onClick={() => setFiltersOpen(false)} aria-label="Close filters"><X size={18} /></button></div>
          <div className="filter-block">
            <div className="filter-title">Categories</div>
            <CategoryTree categories={categories} current={category} onPick={(c) => { set({ category: c }); setFiltersOpen(false); }} />
          </div>
          <div className="filter-block">
            <div className="filter-title">Price</div>
            {data?.priceRange && <div className="muted small">From ${data.priceRange.min} to ${data.priceRange.max}</div>}
            <div className="price-inputs">
              <input inputMode="decimal" placeholder="Min $" value={pmin} onChange={(e) => setPmin(e.target.value.replace(/[^\d.]/g, ''))} />
              <span>–</span>
              <input inputMode="decimal" placeholder="Max $" value={pmax} onChange={(e) => setPmax(e.target.value.replace(/[^\d.]/g, ''))} />
            </div>
            <button className="btn btn-outline btn-block btn-sm" onClick={() => { set({ min: pmin, max: pmax }); setFiltersOpen(false); }}>Apply</button>
          </div>
          {(category || q || min || max) && (
            <button className="btn btn-ghost btn-block btn-sm" onClick={() => { setSp(new URLSearchParams()); setFiltersOpen(false); }}>Clear all filters</button>
          )}
        </aside>

        <section className="shop-main">
          <HowToOrder />
          <div className="shop-toolbar">
            <form className="inputicon shop-search" onSubmit={(e) => { e.preventDefault(); set({ q: term.trim() }); }}>
              <Search size={16} />
              <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search products or part numbers…" />
              {q && <button type="button" className="iconbtn" onClick={() => set({ q: '' })} aria-label="Clear search"><X size={15} /></button>}
            </form>
            <button className="btn btn-outline btn-sm only-mobile" onClick={() => setFiltersOpen(true)}><SlidersHorizontal size={15} /> Filters</button>
            <select value={sort} onChange={(e) => set({ sort: e.target.value })} aria-label="Sort">
              <option value="default">Default order</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
              <option value="name">Name A–Z</option>
            </select>
          </div>
          <div className="muted small result-count">{data ? `${data.total} product${data.total === 1 ? '' : 's'}` : 'Loading…'}</div>

          {!data && <div className="pgrid">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton pcard-sk" />)}</div>}
          {data && data.products.length === 0 && (
            <div className="card pad center empty">
              <p>No products match your filters.</p>
              <button className="btn btn-primary" onClick={() => setSp(new URLSearchParams())}>Show all products</button>
            </div>
          )}
          {data && <div className="pgrid">{data.products.map((p) => <ProductCard key={p.slug} p={p} />)}</div>}

          {data && data.pages > 1 && (
            <nav className="pager" aria-label="Pages">
              <button disabled={page <= 1} onClick={() => set({ page: page - 1 })}><ChevronLeft size={16} /> Prev</button>
              {Array.from({ length: data.pages }, (_, i) => i + 1)
                .filter((n) => n === 1 || n === data.pages || Math.abs(n - page) <= 2)
                .map((n, i, arr) => (
                  <span key={n}>
                    {i > 0 && n - arr[i - 1] > 1 && <em>…</em>}
                    <button className={n === page ? 'on' : ''} onClick={() => set({ page: n })}>{n}</button>
                  </span>
                ))}
              <button disabled={page >= data.pages} onClick={() => set({ page: page + 1 })}>Next <ChevronRight size={16} /></button>
            </nav>
          )}
        </section>
      </div>
    </div>
  );
}

export function CategoryTiles() {
  const site = useSite();
  const tops = (site?.categories || []).filter((c) => !c.parent);
  return (
    <div className="cat-tiles">
      {tops.map((c) => (
        <Link key={c.slug} to={`/shop?category=${c.slug}`} className="cat-tile">
          <div className="cat-tile-img">{c.image ? <img src={media(c.image)} alt="" loading="lazy" /> : null}</div>
          <div><b>{c.name}</b><span>{c.count} products</span></div>
        </Link>
      ))}
    </div>
  );
}
