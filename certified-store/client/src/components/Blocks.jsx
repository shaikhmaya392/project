/**
 * Renders the content copied from certifiedortho.com (headings, text, images,
 * tables, order-form PDFs, tabs, FAQs …) in the store design. Wording, images and
 * order are kept exactly as on the live page.
 */
import { createContext, useContext, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FileText, ChevronDown, Check, ExternalLink, Mail, Phone, MapPin } from 'lucide-react';
import { media, mediaHtml, priceText } from '../lib/format.js';
import { AddToCart } from './Cart.jsx';
import { api } from '../lib/api.js';
import { useSite, shopHref } from '../lib/store.jsx';

export const SkuCtx = createContext(new Map());
const InCardCtx = createContext(false);
const InGridCtx = createContext(false);

const isPdf = (h) => /\.pdf($|\?)/i.test(h || '');
const isInternal = (h) => h && h.startsWith('/');

function SmartLink({ href: raw, className, children }) {
  const site = useSite();
  const href = shopHref(raw, site);
  if (!href || href === '#') return <span className={className}>{children}</span>;
  if (isInternal(href)) return <Link to={href} className={className}>{children}</Link>;
  return <a href={media(href)} className={className} target="_blank" rel="noopener noreferrer">{children}</a>;
}

function Html({ html }) {
  const nav = useNavigate();
  const onClick = (e) => {
    const a = e.target.closest('a');
    if (a && a.getAttribute('href')?.startsWith('/')) {
      e.preventDefault();
      nav(a.getAttribute('href'));
    }
  };
  // eslint-disable-next-line react/no-danger
  return <div className="rich" onClick={onClick} dangerouslySetInnerHTML={{ __html: mediaHtml(html) }} />;
}

function SkuBuy({ code }) {
  const skus = useContext(SkuCtx);
  const p = skus.get(code);
  if (!p) return null;
  return (
    <div className="sku-buy">
      <div className="sku-buy-price">{priceText(p)} <span className="muted">/ {p.unit}</span></div>
      <AddToCart product={p} compact />
    </div>
  );
}

function Heading({ b }) {
  const skus = useContext(SkuCtx);
  const inCard = useContext(InCardCtx);
  const Tag = b.tag === 'p' ? 'p' : b.tag;
  const cls = b.tag === 'p' ? 'lead' : `h-${b.tag}`;
  const inner = b.href ? <SmartLink href={b.href}>{b.text}</SmartLink> : b.text;
  return (
    <>
      <Tag className={cls}>{inner}</Tag>
      {!inCard && skus.has(b.text) && b.tag !== 'p' && <SkuBuy code={b.text} />}
    </>
  );
}

function Img({ b }) {
  const img = <img src={media(b.src)} alt={b.alt || ''} loading="lazy" />;
  return (
    <figure className="blk-img">
      {b.href ? <SmartLink href={b.href}>{img}</SmartLink> : img}
      {b.caption && <figcaption>{b.caption}</figcaption>}
    </figure>
  );
}

function Button({ b }) {
  if (!b.href || b.href === '#') return null;
  if (isPdf(b.href)) {
    return (
      <a className="btn btn-doc" href={media(b.href)} target="_blank" rel="noopener noreferrer">
        <FileText size={17} /> {b.text}
      </a>
    );
  }
  return <SmartLink href={b.href} className="btn btn-primary">{b.text}</SmartLink>;
}

function Table({ b }) {
  const skus = useContext(SkuCtx);
  const inGrid = useContext(InGridCtx); // narrow column: prices are in the order panel below
  const rows = b.rows || [];
  const codeIdx = (r) => r.cells.findIndex((c) => skus.has(c));
  const anySku = !inGrid && rows.some((r) => !r.head && codeIdx(r) >= 0);
  const headIdx = rows.findIndex((r) => r.head);
  return (
    <div className="table-wrap">
      <table className="blk-table">
        <tbody>
          {rows.map((r, i) => {
            const ci = r.head ? -1 : codeIdx(r);
            const p = ci >= 0 ? skus.get(r.cells[ci]) : null;
            const isHead = r.head || (i === 0 && headIdx === -1 && /product|part|code|item/i.test(r.cells[0] || ''));
            const Cell = isHead ? 'th' : 'td';
            return (
              <tr key={i} className={isHead ? 'thead' : ''}>
                {r.cells.map((c, j) => <Cell key={j} className={j === ci ? 'pn' : ''}>{c}</Cell>)}
                {anySku && (isHead ? <th>Price</th> : <td className="buycell">{p ? <><span className="price">{priceText(p)}</span><AddToCart product={p} compact /></> : null}</td>)}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Tabs({ b }) {
  const [i, setI] = useState(0);
  const tab = b.tabs[i];
  return (
    <div className="blk-tabs">
      <div className="tabbar" role="tablist">
        {b.tabs.map((t, k) => (
          <button key={k} role="tab" aria-selected={k === i} className={k === i ? 'on' : ''} onClick={() => setI(k)}>{t.title}</button>
        ))}
      </div>
      <div className="tabpane" role="tabpanel"><Blocks blocks={tab?.blocks || []} /></div>
    </div>
  );
}

function Accordion({ b }) {
  return (
    <div className="blk-acc">
      {b.items.map((it, k) => (
        <details key={k}>
          <summary>{it.title}<ChevronDown size={18} /></summary>
          <Html html={it.html} />
        </details>
      ))}
    </div>
  );
}

const isCardCol = (col) => col.some((x) => x.t === 'image') && col.some((x) => x.t === 'heading') && col.length <= 5
  && !col.some((x) => ['table', 'grid', 'tabs', 'accordion', 'html'].includes(x.t));
const isLinkCard = (col) => col.length === 1 && col[0].t === 'link';

function Grid({ b }) {
  const skus = useContext(SkuCtx);
  const n = b.cols.length;
  const cards = b.cols.every((c) => isCardCol(c) || isLinkCard(c));
  return (
    <div className={`blk-grid ${cards ? 'cards' : 'cols'} n${Math.min(n, 6)} ${b.cols.some((c) => c.some((x) => x.t === 'table')) ? 'has-table' : ''}`}>
      {b.cols.map((col, k) => (
        cards ? (
          <div key={k} className="card-cell">
            <InCardCtx.Provider value><Blocks blocks={col} /></InCardCtx.Provider>
            {col.filter((x) => x.t === 'heading' && skus.has(x.text)).slice(0, 1).map((x) => <SkuBuy key={x.text} code={x.text} />)}
          </div>
        ) : <div key={k} className="col-cell"><InGridCtx.Provider value={n > 1}><Blocks blocks={col} /></InGridCtx.Provider></div>
      ))}
    </div>
  );
}

export function CardLinks({ cards }) {
  return (
    <div className="cat-cards">
      {cards.map((c) => (
        <SmartLink key={c.href} href={c.href} className="cat-card">
          <div className="cat-card-img">{c.src && <img src={media(c.src)} alt="" loading="lazy" />}</div>
          <div className="cat-card-title">{c.title}</div>
        </SmartLink>
      ))}
    </div>
  );
}

function ContactForm() {
  const started = useRef(Date.now());
  const [f, setF] = useState({ name: '', email: '', phone: '', message: '' });
  const [state, setState] = useState('');
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setState('sending');
    try { await api.post('/contact', { ...f, elapsed: Date.now() - started.current }); setState('done'); } catch (e2) { setErr(e2.message); setState(''); }
  };
  if (state === 'done') return <div className="alert alert-green">Thank you – your message was sent. We will get back to you shortly.</div>;
  return (
    <form className="contact-form" onSubmit={submit}>
      {err && <div className="alert alert-red">{err}</div>}
      <label className="field"><span>Name</span><input placeholder="Name" value={f.name} onChange={set('name')} /></label>
      <label className="field"><span>Email *</span><input type="email" placeholder="Email" required value={f.email} onChange={set('email')} /></label>
      <label className="field"><span>Phone</span><input type="tel" placeholder="Phone" value={f.phone} onChange={set('phone')} /></label>
      <label className="field"><span>Message</span><textarea rows={4} placeholder="Message" value={f.message} onChange={set('message')} /></label>
      <button className="btn btn-primary" disabled={state === 'sending'}>{state === 'sending' ? 'Sending…' : 'Send'}</button>
    </form>
  );
}

function Social() {
  const site = useSite();
  return <ul className="checklist">{(site?.social || []).map((s) => <li key={s.href}><ExternalLink size={16} /><a href={s.href} target="_blank" rel="noopener noreferrer">{s.label}</a></li>)}</ul>;
}

function Block({ b }) {
  switch (b.t) {
    case 'heading': return <Heading b={b} />;
    case 'html': return <Html html={b.html} />;
    case 'image': return <Img b={b} />;
    case 'button': return <Button b={b} />;
    case 'table': return <Table b={b} />;
    case 'list':
      return <ul className="checklist">{b.items.map((it, k) => <li key={k}><Check size={16} />{it.href ? <SmartLink href={it.href}>{it.text}</SmartLink> : it.text}</li>)}</ul>;
    case 'grid': return <Grid b={b} />;
    case 'link':
      return <SmartLink href={b.href} className="blk-linkcard"><Blocks blocks={b.blocks.map((x) => ({ ...x, href: undefined }))} /></SmartLink>;
    case 'hero': return <Blocks blocks={b.blocks} />;
    case 'tabs': return <Tabs b={b} />;
    case 'accordion': return <Accordion b={b} />;
    case 'slides':
      return <div className="blk-slides">{b.slides.map((s, k) => <div key={k} className="slide-card"><h3>{s.heading}</h3><p>{s.text}</p>{s.href && <SmartLink href={s.href} className="btn btn-outline btn-sm">{s.button || 'Learn more'}</SmartLink>}</div>)}</div>;
    case 'imagebox':
      return (
        <div className="blk-imagebox">
          {b.src && <img src={media(b.src)} alt={b.title || ''} loading="lazy" />}
          {b.title && <h2 className="h-h2">{b.title}</h2>}
          {b.text && <p>{b.text}</p>}
        </div>
      );
    case 'cards': return <CardLinks cards={b.cards} />;
    case 'gallery': return <div className="blk-gallery">{b.items.map((it, k) => <figure key={k}><img src={media(it.src)} alt={it.alt || ''} loading="lazy" /></figure>)}</div>;
    case 'contactform': return <ContactForm />;
    case 'social': return <Social />;
    default: return null;
  }
}

const imgOnlyCol = (c) => c.length === 1 && c[0].t === 'image';

/** consecutive pictures (e.g. About Us product photos) become one compact row instead of a tall stack */
function group(blocks) {
  const out = [];
  for (const b of blocks) {
    const last = out[out.length - 1];
    if (b.t === 'image' && !b.href) {
      if (last?.t === 'gallery') { last.items.push(b); continue; }
      if (last?.t === 'image' && !last.href) { out[out.length - 1] = { t: 'gallery', items: [last, b] }; continue; }
    }
    if (b.t === 'grid' && b.cols.length > 1 && b.cols.every(imgOnlyCol)) { out.push({ t: 'gallery', items: b.cols.map((c) => c[0]) }); continue; }
    out.push(b);
  }
  return out;
}

export default function Blocks({ blocks }) {
  return <>{group(blocks).map((b, i) => <Block key={i} b={b} />)}</>;
}

export { SmartLink, ExternalLink, ContactForm };

/** Contact Us – full building photo next to the contact details, form below (text from the live page) */
export function ContactPage({ blocks }) {
  const site = useSite();
  const img = blocks.find((x) => x.t === 'image');
  let info = [];
  const scan = (bs) => bs.forEach((x) => { if (x.t === 'list') info = x.items; (x.cols || []).forEach(scan); });
  scan(blocks);
  const icon = (t) => (/@/.test(t) ? Mail : /\d{3}-\d{3}-\d{4}/.test(t) ? Phone : MapPin);
  return (
    <div className="contact-page">
      <div className="contact-top">
        {img && <figure className="contact-photo"><img src={media(img.src)} alt="Certified Orthopedics building, 2415 East Mulberry Street, Fort Collins" /></figure>}
        <div className="contact-info card">
          <h2>Contact info</h2>
          <ul>
            {info.map((it) => {
              const I = icon(it.text);
              return <li key={it.text}><span className="ci-icon"><I size={17} /></span>{it.href ? <a href={it.href}>{it.text}</a> : <span>{it.text.replace('Mulberry Steet', 'Mulberry Street')}</span>}</li>;
            })}
          </ul>
          <h3>Social Links</h3>
          <div className="contact-social">
            {(site?.social || []).map((s2) => <a key={s2.href} href={s2.href} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">{s2.label}</a>)}
          </div>
        </div>
      </div>
      <div className="contact-form-card card">
        <h2>Get in touch</h2>
        <p className="muted">Send us a message and our team will get back to you.</p>
        <ContactForm />
      </div>
    </div>
  );
}
