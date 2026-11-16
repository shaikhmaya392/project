import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { media, priceText } from '../lib/format.js';
import { AddToCart } from '../components/Cart.jsx';

export default function SearchPage() {
  const [sp] = useSearchParams();
  const q = sp.get('q') || '';
  const [res, setRes] = useState(null);
  useEffect(() => { setRes(null); api.get(`/search?q=${encodeURIComponent(q)}`).then(setRes).catch(() => setRes({ pages: [], products: [] })); }, [q]);
  return (
    <div className="container pad-y">
      <h1>Search results for “{q}”</h1>
      {!res && <div className="skeleton tall" />}
      {res && (
        <>
          {res.pages.length > 0 && (
            <>
              <h2 className="h-h3">Products &amp; categories</h2>
              <div className="cat-cards">
                {res.pages.map((p) => (
                  <Link key={p.slug} to={`/p/${p.slug}`} className="cat-card">
                    <div className="cat-card-img">{p.image && <img src={media(p.image)} alt="" loading="lazy" />}</div>
                    <div className="cat-card-title">{p.title}</div>
                  </Link>
                ))}
              </div>
            </>
          )}
          <h2 className="h-h3">Part numbers ({res.products.length}{res.products.length === 60 ? '+' : ''})</h2>
          {res.products.length === 0 ? <p className="muted">No part numbers match. Try the <Link to={`/catalog?q=${encodeURIComponent(q)}`}>full price list</Link>.</p> : (
            <div className="pricelist card">
              <div className="pl-row pl-hdr"><span>Product ID</span><span>Description</span><span>Unit</span><span className="r">List Price</span><span /></div>
              {res.products.map((r) => (
                <div key={r.partNumber + r.seq} className="pl-row">
                  <span className="pn">{r.partNumber}</span>
                  <span className="pl-desc">{r.name}<small>{[r.major, r.sub].filter(Boolean).join(' › ')}</small>{r.page && <Link to={`/p/${r.page}`} className="pl-link">View product</Link>}</span>
                  <span className="muted">{r.unit}</span>
                  <span className="r price">{priceText(r)}</span>
                  <AddToCart product={r} compact />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
