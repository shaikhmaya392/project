import { NextResponse } from "next/server";
import { getLead, updateLead, deleteLead } from "../../../../lib/leadsStore";

export async function GET(request, { params }) {
  const lead = await getLead(params.id);
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  return NextResponse.json(lead);
}

export async function PATCH(request, { params }) {
  try {
    const body = await request.json();
    const lead = await updateLead(params.id, body);
    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    return NextResponse.json(lead);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const ok = await deleteLead(params.id);
  if (!ok) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  return NextResponse.json({ deleted: true });
}
