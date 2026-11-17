import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronRight, ShoppingCart, FileText, Phone, Check, Info, RotateCcw, Truck, Receipt } from 'lucide-react';
import { api } from '../lib/api.js';
import { media, priceText } from '../lib/format.js';
import { useCart } from '../lib/store.jsx';
import { Qty } from '../components/Cart.jsx';
import ProductCard, { ProductImage, priceRange } from '../components/ProductCard.jsx';
import NotFound from './NotFound.jsx';

/** variation chooser – same behaviour as WooCommerce: pick a value per attribute, unavailable combinations are disabled */
function useVariation(p) {
  const [sel, setSel] = useState({});
  useEffect(() => setSel({}), [p?.slug]);
  const attrs = p?.attributes || [];
  const vars = p?.variations || [];
  const fits = (v, s) => attrs.every((a) => !s[a.name] || !v.attributes[a.name] || v.attributes[a.name] === s[a.name]);
  const candidates = vars.filter((v) => fits(v, sel));
  // attributes that matter for the remaining candidates
  const needed = attrs.filter((a) => candidates.some((v) => v.attributes?.[a.name]));
  const chosen = p?.kind === 'simple' ? vars[0]
    : candidates.find((v) => needed.every((a) => !v.attributes[a.name] || sel[a.name] === v.attributes[a.name])
      && attrs.every((a) => !v.attributes[a.name] || sel[a.name])) || null;
  const available = (name, value) => vars.some((v) => v.attributes[name] === value && fits(v, { ...sel, [name]: undefined }));
  const pick = (name, value) => setSel((s) => {
    const next = { ...s, [name]: s[name] === value ? undefined : value };
    // drop choices that no longer fit
    for (const a of attrs) {
      if (a.name !== name && next[a.name] && !vars.some((v) => v.attributes[a.name] === next[a.name] && fits(v, { ...next, [a.name]: undefined }))) next[a.name] = undefined;
    }
    return next;
  });
  return { sel, pick, chosen, needed, available, reset: () => setSel({}), candidates };
}

export default function SingleProduct() {
  const { slug } = useParams();
  const [p, setP] = useState(null);
  const [err, setErr] = useState(null);
  const [img, setImg] = useState(0);
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');
  const [tab, setTab] = useState('desc');
  const { add } = useCart();

  useEffect(() => {
    setP(null); setErr(null); setImg(0); setQty(1); setNote(''); setTab('desc');
    window.scrollTo(0, 0);
    api.get(`/shop/product/${slug}`).then(setP).catch(setErr);
  }, [slug]);

  const { sel, pick, chosen, needed, available, reset, candidates } = useVariation(p);
  const forms = p?.details?.forms || [];
  const hasDesc = !!(p?.details && (p.details.intro.length || p.details.sections.length));

  if (err?.status === 404) return <NotFound />;
  if (err) return <div className="container pad-y"><div className="alert alert-red">{err.message}</div></div>;
  if (!p) return <div className="container pad-y"><div className="sp-grid"><div className="skeleton tall" /><div className="skeleton tall" /></div></div>;

  const images = [...p.images];
  if (chosen?.image && !images.includes(chosen.image)) images.unshift(chosen.image);
  const mainImg = chosen?.image && images.indexOf(chosen.image) >= 0 && img === 0 ? images.indexOf(chosen.image) : img;
  const isVar = p.kind === 'variable';
  const candPrices = candidates.filter((v) => v.price != null).map((v) => v.price);
  const priceShown = chosen ? priceText(chosen)
    : isVar ? priceRange(candPrices.length ? Math.min(...candPrices) : p.priceMin, candPrices.length ? Math.max(...candPrices) : p.priceMax)
      : priceText(p.variations[0]);
  const missing = isVar ? needed.filter((a) => !sel[a.name]).map((a) => a.name) : [];

  const addToCart = (v = chosen, q = qty, comment = note) => {
    if (!v) return;
    add({ partNumber: v.sku, name: v.name, price: v.price, priceLabel: v.priceLabel, unit: v.unit, type: v.type, image: v.image || p.images[0], product: p.slug }, q, comment);
    setQty(1);
  };

  return (
    <div className="sp">
      <div className="container">
        <nav className="crumbs sp-crumbs" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          <span><ChevronRight size={14} /><Link to="/shop">Shop</Link></span>
          {p.breadcrumbs.map((b) => <span key={b.slug}><ChevronRight size={14} /><Link to={`/shop?category=${b.slug}`}>{b.name}</Link></span>)}
        </nav>

        <div className="sp-grid">
          <div className="sp-gallery">
            <div className="sp-main card"><ProductImage src={images[mainImg]} alt={p.name} sku={chosen?.sku || p.variations[0]?.sku} label={p.breadcrumbs.at(-1)?.name} /></div>
            {images.length > 1 && (
              <div className="sp-thumbs">
                {images.slice(0, 8).map((u, i) => (
                  <button key={u} className={i === mainImg ? 'on' : ''} onClick={() => setImg(i)} aria-label={`Picture ${i + 1}`}><img src={media(u)} alt="" loading="lazy" /></button>
                ))}
              </div>
            )}
          </div>

          <div className="sp-info">
            <div className="pcard-cat">{p.breadcrumbs.at(-1)?.name}</div>
            <h1>{p.name}</h1>
            <div className="sp-price">{priceShown}{chosen?.unit && <span> / {chosen.unit}</span>}</div>
            {chosen && <div className="sp-sku">Product ID: <b>{chosen.sku}</b>{isVar && <> · {chosen.name}</>}</div>}
            {chosen?.lines?.length > 0 && <ul className="sp-lines">{chosen.lines.map((l) => <li key={l}>{l}</li>)}</ul>}
            {p.short && <p className="sp-short">{p.short}</p>}

            {isVar && (
              <div className="sp-attrs">
                {p.attributes.map((a, ai) => {
                  const usable = needed.some((n) => n.name === a.name);
                  if (!usable) return null;
                  return (
                    <div className="sp-attr" key={a.name}>
                      <div className="sp-attr-label">
                        <span className="step">{ai + 1}</span> {a.name}: {sel[a.name] ? <b>{sel[a.name]}</b> : <em>choose one</em>}
                      </div>
                      <div className="chips">
                        {a.values.filter(Boolean).map((v) => {
                          const ok = available(a.name, v);
                          return (
                            <button key={v} type="button" className={`chip ${sel[a.name] === v ? 'on' : ''}`} disabled={!ok} onClick={() => pick(a.name, v)}>
                              {sel[a.name] === v && <Check size={14} />} {v}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                {Object.values(sel).some(Boolean) && <button className="linkbtn small" onClick={reset}><RotateCcw size={13} /> Clear selection</button>}
              </div>
            )}

            <label className="field sp-note">
              <span>Note for this item <small className="muted">(optional – patient, measurements…)</small></span>
              <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
            </label>

            <div className="sp-buy">
              <Qty value={qty} onChange={setQty} />
              <button className="btn btn-primary btn-lg" disabled={!chosen} onClick={() => addToCart()}>
                <ShoppingCart size={18} /> Add to cart
              </button>
            </div>
            {!chosen && missing.length > 0 && <p className="sp-hint"><Info size={15} /> Please choose {missing.join(' and ')} to add this product to your cart.</p>}

            <div className="sp-side">
              {forms.map((f) => <a key={f.href} className="btn btn-doc btn-sm" href={media(f.href)} target="_blank" rel="noopener noreferrer"><FileText size={15} /> {f.text}</a>)}
              <a className="btn btn-ghost btn-sm" href="tel:9704827116"><Phone size={15} /> 970-482-7116</a>
            </div>
            <ul className="sp-trust">
              <li><Receipt size={15} /> No online payment – we email your invoice</li>
              <li><Truck size={15} /> Track your order in My account</li>
            </ul>
            {p.notes?.length > 0 && <div className="sp-notes">{p.notes.map((n) => <p key={n}>{n}</p>)}</div>}
          </div>
        </div>

        {(hasDesc || p.specs?.length > 0) && (
          <div className="sp-tabs card">
            <div className="tabbar" role="tablist">
              {hasDesc && <button role="tab" className={tab === 'desc' ? 'on' : ''} onClick={() => setTab('desc')}>Description</button>}
              {p.specs?.length > 0 && <button role="tab" className={tab === 'specs' || !hasDesc ? 'on' : ''} onClick={() => setTab('specs')}>Specifications</button>}
            </div>
            {tab === 'desc' && hasDesc ? (
              <div className="sp-desc">
                {p.details.intro.map((h, i) => <div key={i} className="rich" dangerouslySetInnerHTML={{ __html: h }} />)}
                <div className="sp-sections">
                  {p.details.sections.map((s2) => (
                    <div key={s2.title} className="sp-section">
                      <h3>{s2.title}</h3>
                      {s2.items.length > 0 && <ul className="checklist">{s2.items.map((it) => <li key={it}><Check size={16} />{it}</li>)}</ul>}
                      {s2.html.map((h, i) => <div key={i} className="rich" dangerouslySetInnerHTML={{ __html: h }} />)}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              p.specs.map((t, i) => (
                <div className="table-wrap" key={i}>
                  <table className="blk-table">
                    <tbody>
                      <tr className="thead">{t.header.map((h, j) => <th key={j}>{h}</th>)}</tr>
                      {t.rows.map((r, k) => <tr key={k}>{t.header.map((_, j) => <td key={j} className={j === 0 ? 'pn' : ''}>{r[j] || ''}</td>)}</tr>)}
                    </tbody>
                  </table>
                </div>
              ))
            )}
          </div>
        )}

        {p.related?.length > 0 && (
          <section className="sp-related">
            <h2>Related products</h2>
            <div className="pgrid">{p.related.slice(0, 4).map((r) => <ProductCard key={r.slug} p={r} />)}</div>
          </section>
        )}
      </div>
    </div>
  );
}

