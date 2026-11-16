let MEDIA_LOCAL = false;
export const setMediaMode = (mode) => { MEDIA_LOCAL = mode === 'local'; };

/** certifiedortho.com media → local mirror when MEDIA_MODE=local */
export const media = (url) => {
  if (!url) return url;
  if (MEDIA_LOCAL && url.startsWith('https://certifiedortho.com/wp-content/')) {
    return url.replace('https://certifiedortho.com/wp-content/', '/media/');
  }
  return url;
};
export const mediaHtml = (html) => (MEDIA_LOCAL ? html.replaceAll('https://certifiedortho.com/wp-content/', '/media/') : html);

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
