let MEDIA_LOCAL = false;
export const setMediaMode = (mode) => { MEDIA_LOCAL = mode === 'local'; };

const WP = 'https://certifiedortho.com/wp-content/';
// Images + the hero video are optimized copies on this site's CDN (tools/optimize-media.mjs):
//   <WP>uploads/x.png → /media/uploads/x.png.webp   (resized, WebP)
//   <WP>uploads/x.mp4 → /media/uploads/x.mp4         (compressed)
// PDFs etc. stay on certifiedortho.com unless MEDIA_MODE=local.
const IMG = /\.(jpe?g|png|webp|gif)$/i;
export const media = (url) => {
  if (!url || !url.startsWith(WP)) return url;
  const rel = url.slice(WP.length);
  if (IMG.test(rel)) return `/media/${rel}.webp`;
  if (/\.mp4$/i.test(rel)) return `/media/${rel}`;
  return MEDIA_LOCAL ? `/media/${rel}` : url;
};
/** poster frame for an optimized video */
export const videoPoster = (url) => (url && url.startsWith(WP) && /\.mp4$/i.test(url) ? `/media/${url.slice(WP.length)}.poster.webp` : undefined);
const WP_URL_RX = /https:\/\/certifiedortho\.com\/wp-content\/[^"'\s)<>\\]+/g;
export const mediaHtml = (html) => (html ? html.replace(WP_URL_RX, (u) => media(u)) : html);

export const money = (n, cur = 'USD') => {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: cur }).format(Number(n));
};

/** Price exactly as on the CRM price list: number, or its label (NC, N/C, Variable) */
export const priceText = (p) => {
  if (p.price !== null && p.price !== undefined) return money(p.price);
  return p.priceLabel || 'Call for price';
};

export const date = (d) => (d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—');

export const TYPE_LABEL = { general: 'General Products', custom: 'Custom Products', thirdparty: 'Third Party Products' };

export const norm = (s) => (s || '').toLowerCase().replace(/[’'`]/g, "'").replace(/\s+/g, ' ').trim();
