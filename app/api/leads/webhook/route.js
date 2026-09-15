import { NextResponse } from "next/server";
import { importWebsiteLeads } from "../../../../lib/leadsStore";

// Called by the WordPress site the moment someone submits a Formidable Forms
// entry. Protected by the same key used for /api/admin/seed.
export async function POST(request) {
  const key = request.headers.get("x-api-key");
  if (!key || key !== process.env.WORDPRESS_API_KEY) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const result = await importWebsiteLeads([body]);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
