import { NextResponse } from "next/server";
import { getLeadByDocToken, updateLead } from "../../../../../lib/leadsStore";
import { DOCUMENT_CATEGORIES } from "../../../../../lib/leadMeta";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function publicView(lead) {
  return {
    client_name: lead.name || "",
    client_email: lead.email || "",
    client_phone: lead.phone || "",
    documents_submitted_at: lead.documents_submitted_at || null,
    documents: (lead.documents || []).map((d) => ({ id: d.id, name: d.name, category: d.category || null, uploaded_at: d.uploaded_at })),
  };
}

// Public: the client explicitly confirms they're done uploading. Every
// category must have at least one file — enforced here too, not just in
// the page, since this is a public endpoint.
export async function POST(request, { params }) {
  const lead = await getLeadByDocToken(params.token);
  if (!lead) return NextResponse.json({ error: "Link not found" }, { status: 404 });

  const documents = Array.isArray(lead.documents) ? lead.documents : [];
  const missing = DOCUMENT_CATEGORIES.filter((cat) => !documents.some((d) => d.category === cat));
  if (missing.length > 0) {
    return NextResponse.json({ error: "Please upload every document before submitting", missing }, { status: 400 });
  }

  const now = new Date().toISOString();
  const activity = Array.isArray(lead.activity) ? [...lead.activity] : [];
  activity.push({ text: "Client submitted all requested documents", at: now, kind: "document" });
  const updated = await updateLead(lead.id, { documents_submitted_at: now, activity });
  return NextResponse.json(publicView(updated));
}
