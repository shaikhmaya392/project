import { NextResponse } from "next/server";
import { ensureDocToken, updateLeadSafely } from "../../../../../lib/leadsStore";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Staff-facing: creates (or edits) the custom list of document fields the
// client link asks for, and makes sure the lead has a share token. Staff
// choose the fields themselves — there's no fixed set, could be 1 or 20.
export async function POST(request, { params }) {
  try {
    const body = await request.json();
    const fields = Array.isArray(body.fields)
      ? body.fields.map((f) => String(f || "").trim()).filter(Boolean)
      : [];
    if (fields.length === 0) {
      return NextResponse.json({ error: "Add at least one field" }, { status: 400 });
    }

    const token = await ensureDocToken(params.id);
    if (!token) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

    const updated = await updateLeadSafely(
      params.id,
      () => ({ document_fields: fields }),
      (finalLead) => JSON.stringify(finalLead.document_fields) === JSON.stringify(fields)
    );
    if (!updated) return NextResponse.json({ error: "Didn't save, please try again" }, { status: 409 });

    return NextResponse.json({ token, fields: updated.document_fields });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
