export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function request(method, url, body, { form } = {}) {
  const opts = { method, credentials: 'same-origin', headers: {} };
  if (form) opts.body = form;
  else if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const r = await fetch(`/api${url}`, opts);
  const data = await r.json().catch(() => null);
  if (!r.ok) throw new ApiError(data?.message || `Request failed (${r.status})`, r.status, data);
  return data;
}

export const api = {
  get: (u) => request('GET', u),
  post: (u, b) => request('POST', u, b),
  patch: (u, b) => request('PATCH', u, b),
  upload: (u, form) => request('POST', u, undefined, { form }),
};
