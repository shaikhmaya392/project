import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../lib/api.js';
import ProductCard from './ProductCard.jsx';

/** Auto-sliding row of product cards – pauses while the mouse is over it (or a button has focus). */
export default function ProductSlider({ query, interval = 3500 }) {
  const [items, setItems] = useState(null);
  const track = useRef(null);
  const paused = useRef(false);

  useEffect(() => {
    api.get(`/shop/products?perPage=16&withImage=1&${query}`).then((d) => setItems(d.products)).catch(() => setItems([]));
  }, [query]);

  const step = (dir) => {
    const el = track.current;
    if (!el) return;
    const card = el.querySelector('.pcard');
    const w = card ? card.getBoundingClientRect().width + 18 : 260;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
    if (dir > 0 && atEnd) el.scrollTo({ left: 0, behavior: 'smooth' });
    else if (dir < 0 && el.scrollLeft <= 4) el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' });
    else el.scrollBy({ left: dir * w, behavior: 'smooth' });
  };

  useEffect(() => {
    if (!items?.length) return undefined;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return undefined;
    const t = setInterval(() => { if (!paused.current && !document.hidden) step(1); }, interval);
    return () => clearInterval(t);
  }, [items, interval]);

  if (items && !items.length) return null;
  return (
    <div
      className="pslider"
      onMouseEnter={() => { paused.current = true; }}
      onMouseLeave={() => { paused.current = false; }}
      onFocus={() => { paused.current = true; }}
      onBlur={() => { paused.current = false; }}
      onTouchStart={() => { paused.current = true; }}
    >
      <button className="pslider-btn prev" onClick={() => step(-1)} aria-label="Previous products"><ChevronLeft size={22} /></button>
      <div className="pslider-track" ref={track}>
        {!items && Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton pcard-sk pslider-item" />)}
        {items?.map((p) => <div className="pslider-item" key={p.slug}><ProductCard p={p} /></div>)}
      </div>
      <button className="pslider-btn next" onClick={() => step(1)} aria-label="Next products"><ChevronRight size={22} /></button>
    </div>
  );
}
