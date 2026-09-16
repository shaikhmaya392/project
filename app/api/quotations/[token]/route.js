import { NextResponse } from "next/server";
import { getQuotationByToken, updateQuotation, markAccepted } from "../../../../lib/quotationsStore";

export async function GET(request, { params }) {
  const quotation = await getQuotationByToken(params.token);
  if (!quotation) return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
  return NextResponse.json(quotation);
}

export async function POST(request, { params }) {
  const quotation = await markAccepted(params.token);
  if (!quotation) return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
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
