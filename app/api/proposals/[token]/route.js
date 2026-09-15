import { NextResponse } from "next/server";
import { getProposalByToken, markAccepted } from "../../../../lib/proposalsStore";

export async function GET(request, { params }) {
  const proposal = await getProposalByToken(params.token);
  if (!proposal) return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  return NextResponse.json(proposal);
}

export async function POST(request, { params }) {
  const proposal = await markAccepted(params.token);
  if (!proposal) return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  return NextResponse.json(proposal);
}
