import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { media, priceText } from '../lib/format.js';
import { AddToCart, Thumb } from '../components/Cart.jsx';
import { useSite, pageHref } from '../lib/store.jsx';

export default function SearchPage() {
  const site = useSite();
  const [sp] = useSearchParams();
  const q = sp.get('q') || '';
  const [res, setRes] = useState(null);
  const [skus, setSkus] = useState({});
  useEffect(() => { api.get('/shop/skus').then(setSkus).catch(() => {}); }, []);
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
                {[...new Map(res.pages.map((p) => [pageHref(p.slug, site), p])).entries()].map(([to, p]) => (
                  <Link key={to} to={to} className="cat-card">
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
              <div className="pl-row pl-hdr"><span /><span>Product ID</span><span>Description</span><span>Unit</span><span className="r">List Price</span><span /></div>
              {res.products.map((r) => {
                const info = skus[r.partNumber];
                const url = info ? `/product/${info.slug}` : r.page ? pageHref(r.page, site) : null;
                return (
                <div key={r.partNumber + r.seq} className="pl-row">
                  {url ? <Link to={url} className="pl-thumb"><Thumb src={info?.image || r.image} alt={r.name} size={52} /></Link> : <Thumb src={r.image} alt={r.name} size={52} />}
                  <span className="pn">{r.partNumber}</span>
                  <span className="pl-desc">{url ? <Link to={url} className="pl-name">{r.name}</Link> : r.name}<small>{[r.major, r.sub].filter(Boolean).join(' › ')}</small>{url && <Link to={url} className="pl-link">View product</Link>}</span>
                  <span className="muted">{r.unit}</span>
                  <span className="r price">{priceText(r)}</span>
                  <AddToCart product={{ ...r, image: info?.image || r.image, product: info?.slug }} compact />
                </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
