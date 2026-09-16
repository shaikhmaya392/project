import { put, head } from "@vercel/blob";

export async function readJson(key) {
  try {
    const info = await head(key);
    const res = await fetch(`${info.url}?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

// Vercel Blob's public URL is served through a CDN that can keep serving a
// stale copy after a write (it doesn't vary its cache by query string, so a
// cache-busting param alone isn't enough). Poll after writing until the new
// content is actually visible, so callers can trust the data is durable by
// the time this resolves instead of racing the CDN.
export async function writeJson(key, data) {
  await put(key, JSON.stringify(data, null, 2), {
    access: "public",
    contentType: "application/json",
    allowOverwrite: true,
  });

  const target = JSON.stringify(data);
  for (let attempt = 0; attempt < 6; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
    const current = await readJson(key);
    if (JSON.stringify(current) === target) return;
  }
}
