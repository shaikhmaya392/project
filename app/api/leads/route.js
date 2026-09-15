import { NextResponse } from "next/server";
import { getLeads, createLead } from "../../../lib/wpApi";

export async function GET() {
  try {
    const leads = await getLeads();
    return NextResponse.json(leads);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const lead = await createLead(body);
    return NextResponse.json(lead, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
