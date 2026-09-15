import { NextResponse } from "next/server";
import { getLead, updateLead, deleteLead } from "../../../../lib/wpApi";

export async function GET(request, { params }) {
  try {
    const lead = await getLead(params.id);
    return NextResponse.json(lead);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const body = await request.json();
    const lead = await updateLead(params.id, body);
    return NextResponse.json(lead);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const result = await deleteLead(params.id);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
