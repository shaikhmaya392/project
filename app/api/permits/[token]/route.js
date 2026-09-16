import { NextResponse } from "next/server";
import { getPermitByToken, markAccepted } from "../../../../lib/permitsStore";

export async function GET(request, { params }) {
  const permit = await getPermitByToken(params.token);
  if (!permit) return NextResponse.json({ error: "Permit not found" }, { status: 404 });
  return NextResponse.json(permit);
}

export async function POST(request, { params }) {
  const permit = await markAccepted(params.token);
  if (!permit) return NextResponse.json({ error: "Permit not found" }, { status: 404 });
  return NextResponse.json(permit);
}
