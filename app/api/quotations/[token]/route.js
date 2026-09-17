import { NextResponse } from "next/server";
import { getQuotationByToken, updateQuotation, markAccepted } from "../../../../lib/quotationsStore";
import { getLead, updateLead } from "../../../../lib/leadsStore";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request, { params }) {
  const quotation = await getQuotationByToken(params.token);
  if (!quotation) return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
  return NextResponse.json(quotation);
}

export async function POST(request, { params }) {
  const quotation = await markAccepted(params.token);
  if (!quotation) return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
  // Accepting moves the linked lead to "Quotation Accepted" everywhere.
  if (quotation.lead_id) {
    try {
      const lead = await getLead(quotation.lead_id);
      if (lead) {
        const activity = Array.isArray(lead.activity) ? [...lead.activity] : [];
        activity.push({ text: `Quotation ${quotation.number} accepted by client`, at: quotation.accepted_at, kind: "quote" });
        await updateLead(lead.id, { status: "quote_accepted", activity });
      }
    } catch {}
  }
  return NextResponse.json(quotation);
}

// Editable any time - before or after the client has accepted - so staff
// can correct a mistyped fee or service list.
export async function PATCH(request, { params }) {
  const existing = await getQuotationByToken(params.token);
  if (!existing) return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
  try {
    const body = await request.json();
    const allowed = ["client_name", "client_email", "project_description", "address", "services", "fees", "valid_until"];
    const patch = {};
    for (const key of allowed) {
      if (body[key] !== undefined) patch[key] = body[key];
    }
    const updated = await updateQuotation(existing.id, patch);
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
