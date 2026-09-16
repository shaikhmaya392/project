import { NextResponse } from "next/server";
import { getLeads, createLead } from "../../../lib/leadsStore";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const leads = await getLeads();
    return NextResponse.json(leads);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const lead = await createLead(body);
    return NextResponse.json(lead, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
