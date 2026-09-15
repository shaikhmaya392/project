export async function sendEmail({ to, subject, html }) {
  const base = process.env.WORDPRESS_API_URL;
  const key = process.env.WORDPRESS_API_KEY;
  if (!base || !key) {
    throw new Error("Email relay not configured (WORDPRESS_API_URL / WORDPRESS_API_KEY missing)");
  }
  const res = await fetch(`${base}/send-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": key },
    body: JSON.stringify({ to, subject, html }),
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error((data && data.message) || `Email relay error (${res.status})`);
  }
  return data;
}
