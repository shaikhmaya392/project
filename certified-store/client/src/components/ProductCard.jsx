import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, SlidersHorizontal } from 'lucide-react';
import { media, money } from '../lib/format.js';
import { useCart, useSite } from '../lib/store.jsx';
import { Qty } from './Cart.jsx';

export const priceRange = (min, max, label) => {
  if (min == null && max == null) return label || 'Call for price';
  if (min === max || max == null) return money(min);
  return `${money(min)} – ${money(max)}`;
};

export function ProductImage({ src, alt, className = '', label, sku }) {
  if (!src) {
    // branded tile for options / services that have no photo on the website
    return (
      <div className={`pimg pimg-empty ${className}`}>
        <img className="pimg-logo" src="/media/uploads/2024/12/logo-whiite.png.webp" alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        {sku && <b>{sku}</b>}
        {label && <span>{label}</span>}
      </div>
    );
  }
  return <div className={`pimg ${className}`}><img src={media(src)} alt={alt} loading="lazy" /></div>;
}

/** WooCommerce-style product card: picture, category, name, price, Select options / Add to cart */
export default function ProductCard({ p }) {
  const { add } = useCart();
  const site = useSite();
  const [qty, setQty] = useState(1);
  const cat = site?.categories?.find((c) => c.slug === p.category);
  const url = `/product/${p.slug}`;
  return (
    <article className="pcard">
      <Link to={url} className="pcard-img" aria-label={p.name}>
        <ProductImage src={p.image} alt={p.name} sku={p.kind === 'simple' ? p.sku?.sku : null} label={cat?.name} />
        {p.kind === 'variable' && <span className="pcard-badge">{p.count} options</span>}
      </Link>
      <div className="pcard-body">
        {cat && <div className="pcard-cat">{cat.name}</div>}
        <h3 className="pcard-name"><Link to={url}>{p.name}</Link></h3>
        {p.kind === 'simple' && p.sku && <div className="pcard-sku">Product ID: {p.sku.sku}</div>}
        <div className="pcard-price">
          {p.kind === 'simple' ? priceRange(p.sku?.price, p.sku?.price, p.sku?.priceLabel) : priceRange(p.priceMin, p.priceMax)}
          {p.kind === 'simple' && p.sku?.unit && <span> / {p.sku.unit}</span>}
        </div>
        <div className="pcard-actions">
          {p.kind === 'variable' ? (
            <Link to={url} className="btn btn-primary btn-block"><SlidersHorizontal size={16} /> Select options</Link>
          ) : (
            <div className="pcard-buy">
              <Qty value={qty} onChange={setQty} small />
              <button
                className="btn btn-primary"
                onClick={() => {
                  const v = p.sku;
                  add({ partNumber: v.sku, name: v.name, price: v.price, priceLabel: v.priceLabel, unit: v.unit, type: v.type, image: p.image, product: p.slug }, qty);
                  setQty(1);
                }}
              >
                <ShoppingCart size={16} /> Add to cart
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
