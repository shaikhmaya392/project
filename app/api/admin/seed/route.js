import { NextResponse } from "next/server";
import { importWebsiteLeads } from "../../../../lib/leadsStore";

// One-time bulk import used to backfill historical leads. Not linked from
// the UI; call it directly with the admin key.
export async function POST(request) {
  const key = request.headers.get("x-admin-key");
  if (!key || key !== process.env.ADMIN_SEED_KEY) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const leads = Array.isArray(body.leads) ? body.leads : [];
    const result = await importWebsiteLeads(leads);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
