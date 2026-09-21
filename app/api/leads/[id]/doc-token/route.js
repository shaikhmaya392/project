import { NextResponse } from "next/server";
import { ensureDocToken } from "../../../../../lib/leadsStore";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Staff-facing: returns (creating on first call) the lead's document
// upload token, so the Documents tab can show/copy the client link.
export async function GET(request, { params }) {
  const token = await ensureDocToken(params.id);
  if (!token) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  return NextResponse.json({ token });
}
