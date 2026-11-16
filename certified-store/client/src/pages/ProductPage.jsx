import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronRight, FileText, Phone, ShoppingBag, ArrowDown } from 'lucide-react';
import { api } from '../lib/api.js';
import { media, norm, priceText } from '../lib/format.js';
import Blocks, { SkuCtx, CardLinks } from '../components/Blocks.jsx';
import ProductOptions from '../components/ProductOptions.jsx';
import NotFound from './NotFound.jsx';

const APP_QR = 'https://certifiedortho.com/wp-content/uploads/2025/04/Code.jpeg';

/** remove the site-wide "Download Our App" promo (shown once in the store footer) */
function stripAppPromo(blocks) {
  const out = [];
  for (const b of blocks) {
    if (b.t === 'image' && b.src === APP_QR) continue;
    if (b.t === 'heading' && b.text === 'Download Our App') continue;
    if (b.t === 'grid') {
      const cols = b.cols.map(stripAppPromo).filter((c) => c.length);
      if (cols.length) out.push({ ...b, cols });
      continue;
    }
    out.push(b);
  }
  return out;
}

function collectPdfs(blocks, acc = new Map()) {
  for (const b of blocks) {
    if (b.t === 'button' && /\.pdf$/i.test(b.href || '')) acc.set(b.href, b.text);
    if (b.cols) b.cols.forEach((c) => collectPdfs(c, acc));
    if (b.blocks) collectPdfs(b.blocks, acc);
    if (b.tabs) b.tabs.forEach((t) => collectPdfs(t.blocks, acc));
  }
  return acc;
}

/** Contact Us: the live page has a form under "Get in touch" and icons under "Social Links" */
function addWidgets(blocks) {
  return blocks.flatMap((b) => {
    if (b.t === 'grid') return [{ ...b, cols: b.cols.map(addWidgets) }];
    if (b.t === 'heading' && b.text === 'Get in touch') return [b, { t: 'contactform' }];
    if (b.t === 'heading' && b.text === 'Social Links') return [b, { t: 'social' }];
    return [b];
  });
}

/** split the page where the product section ends (the order panel goes there) */
function splitAtArticle(blocks) {
  const i = blocks.findIndex((b, k) => k > 2 && b.t === 'heading' && b.tag === 'h1');
  if (i > 0) return [blocks.slice(0, i), blocks.slice(i)];
  const t = blocks.findIndex((b, k) => k > 2 && (b.t === 'tabs' || b.t === 'accordion' || b.t === 'slides'));
  if (t > 0) return [blocks.slice(0, t), blocks.slice(t)];
  return [blocks, []];
}

export default function ProductPage() {
  const { slug } = useParams();
  const [page, setPage] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    setPage(null);
    setErr(null);
    window.scrollTo(0, 0);
    api.get(`/pages/${slug}`).then(setPage).catch((e) => setErr(e));
  }, [slug]);

  const skus = useMemo(() => new Map((page?.products || []).map((p) => [p.partNumber, { ...p, pageImage: page.image }])), [page]);
  const content = useMemo(() => {
    if (!page) return [[], []];
    let b = stripAppPromo(page.blocks || []);
    if (page.slug === 'contact-us') b = addWidgets(b);
    // the first heading repeats the page title shown in the header band
    if (b[0]?.t === 'heading' && norm(b[0].text).replace(/[^a-z0-9]/g, '') === norm(page.title).replace(/[^a-z0-9]/g, '')) b = b.slice(1);
    return splitAtArticle(b);
  }, [page]);

  if (err?.status === 404) return <NotFound />;
  if (err) return <div className="container pad-y"><div className="alert alert-red">{err.message}</div></div>;
  if (!page) return <div className="container pad-y"><div className="skeleton tall" /></div>;

  const pdfs = [...collectPdfs(page.blocks)];
  const products = page.products || [];
  const priced = products.filter((p) => p.price > 0).map((p) => p.price);
  const from = priced.length ? Math.min(...priced) : null;
  const isHub = !products.length && page.children?.length > 0;

  return (
    <SkuCtx.Provider value={skus}>
      <div className="page-band">
        <div className="container">
          <nav className="crumbs" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            {page.breadcrumbs.map((c) => <span key={c.slug}><ChevronRight size={14} /><Link to={`/p/${c.slug}`}>{c.title}</Link></span>)}
            <span><ChevronRight size={14} />{page.title}</span>
          </nav>
          <h1>{page.title}</h1>
        </div>
      </div>

      {products.length > 0 && (
        <div className="buybar">
          <div className="container buybar-in">
            <div className="buybar-info">
              <b>{from != null ? <>From ${from.toFixed(2)}</> : priceText(products[0])}</b>
              <span className="muted">{products.length} option{products.length === 1 ? '' : 's'} · list price</span>
            </div>
            <div className="buybar-actions">
              {pdfs.map(([href, text]) => (
                <a key={href} href={media(href)} target="_blank" rel="noopener noreferrer" className="btn btn-doc btn-sm"><FileText size={15} /> {text}</a>
              ))}
              <a href="tel:9704827116" className="btn btn-ghost btn-sm hide-sm"><Phone size={15} /> 970-482-7116</a>
              <a href="#order" className="btn btn-primary btn-sm"><ShoppingBag size={15} /> Choose options <ArrowDown size={14} /></a>
            </div>
          </div>
        </div>
      )}

      <div className={`container product-layout page-${page.slug}`}>
        <article className="product-main">
          <div className="content">
            <Blocks blocks={content[0]} />
          </div>
          {products.length > 0 && <ProductOptions products={products} notes={page.notes} title={page.title} pageImage={page.image} />}
          {isHub && !content[0].some((b) => b.t === 'grid' || b.t === 'cards') && (
            <CardLinks cards={page.children.map((c) => ({ href: `/p/${c.slug}`, src: c.image, title: c.title }))} />
          )}
          {content[1].length > 0 && <div className="content content-article"><Blocks blocks={content[1]} /></div>}
        </article>
      </div>
    </SkuCtx.Provider>
  );
}
