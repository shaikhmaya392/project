import { NextResponse } from "next/server";
import { backfillLeads } from "../../../../lib/wpApi";

export async function POST() {
  try {
    const result = await backfillLeads();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
