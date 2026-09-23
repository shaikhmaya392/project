import { NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { ensureDocToken, getLead, updateLeadSafely } from "../../../../../lib/leadsStore";

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

// Staff-facing: removes one field from the request list. Any documents the
// client already uploaded under that field are removed too (blob object
// included) — otherwise they'd become orphaned, never shown anywhere.
export async function DELETE(request, { params }) {
  const field = new URL(request.url).searchParams.get("field");
  if (!field) return NextResponse.json({ error: "Missing field" }, { status: 400 });

  const lead = await getLead(params.id);
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const toRemove = (lead.documents || []).filter((d) => d.category === field);
  for (const doc of toRemove) {
    try {
      await del(doc.url);
    } catch {}
  }

  const updated = await updateLeadSafely(
    params.id,
    (current) => ({
      document_fields: (current.document_fields || []).filter((f) => f !== field),
      documents: (current.documents || []).filter((d) => d.category !== field),
    }),
    (finalLead) =>
      !(finalLead.document_fields || []).includes(field) &&
      !(finalLead.documents || []).some((d) => d.category === field)
  );
  if (!updated) return NextResponse.json({ error: "Didn't save, please try again" }, { status: 409 });

  return NextResponse.json({ fields: updated.document_fields, documents: updated.documents });
}
