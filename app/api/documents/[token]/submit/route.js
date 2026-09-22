import { NextResponse } from "next/server";
import { getLeadByDocToken, updateLeadSafely } from "../../../../../lib/leadsStore";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function publicView(lead) {
  return {
    client_name: lead.name || "",
    client_email: lead.email || "",
    client_phone: lead.phone || "",
    fields: lead.document_fields || [],
    documents_submitted_at: lead.documents_submitted_at || null,
    documents: (lead.documents || []).map((d) => ({ id: d.id, name: d.name, category: d.category || null, uploaded_at: d.uploaded_at })),
  };
}

// Public: the client explicitly confirms they're done uploading. Every
// field staff configured for this lead must have at least one file —
// enforced here too, not just in the page, since this is a public endpoint.
export async function POST(request, { params }) {
  const lead = await getLeadByDocToken(params.token);
  if (!lead) return NextResponse.json({ error: "Link not found" }, { status: 404 });

  const fields = lead.document_fields || [];
  const documents = Array.isArray(lead.documents) ? lead.documents : [];
  const missing = fields.filter((f) => !documents.some((d) => d.category === f));
  if (missing.length > 0) {
    return NextResponse.json({ error: "Please upload every document before submitting", missing }, { status: 400 });
  }

  const now = new Date().toISOString();
  const updated = await updateLeadSafely(
    lead.id,
    (current) => ({
      documents_submitted_at: now,
      activity: [...(current.activity || []), { text: "Client submitted all requested documents", at: now, kind: "document" }],
    }),
    (finalLead) => finalLead.documents_submitted_at === now
  );
  if (!updated) return NextResponse.json({ error: "Didn't save, please try again" }, { status: 409 });
  return NextResponse.json(publicView(updated));
}
