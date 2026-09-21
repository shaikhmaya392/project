import { NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { getLeadByDocToken, updateLeadSafely } from "../../../../lib/leadsStore";
import { DOCUMENT_CATEGORIES } from "../../../../lib/leadMeta";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function safeName(name) {
  return (name || "file").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
}

function publicView(lead) {
  return {
    client_name: lead.name || "",
    client_email: lead.email || "",
    client_phone: lead.phone || "",
    documents_submitted_at: lead.documents_submitted_at || null,
    documents: (lead.documents || []).map((d) => ({ id: d.id, name: d.name, category: d.category || null, uploaded_at: d.uploaded_at })),
  };
}

// Public: the client's own document-upload page polls this to see the
// current state of what they've submitted so far.
export async function GET(request, { params }) {
  const lead = await getLeadByDocToken(params.token);
  if (!lead) return NextResponse.json({ error: "Link not found" }, { status: 404 });
  return NextResponse.json(publicView(lead));
}

// Public: the client uploads one file at a time, tagged with one of the
// four requested categories. No auth — the random token is the access
// control, same pattern as the quotation accept link. Several of these can
// legitimately run at once (the page allows starting another upload while
// one is still in flight), so the actual lead record is updated through
// updateLeadSafely instead of a plain read-modify-write, which would
// silently drop one of two near-simultaneous uploads.
export async function POST(request, { params }) {
  const lead = await getLeadByDocToken(params.token);
  if (!lead) return NextResponse.json({ error: "Link not found" }, { status: 404 });

  try {
    const form = await request.formData();
    const file = form.get("file");
    const category = form.get("category");
    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!DOCUMENT_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: "Invalid document category" }, { status: 400 });
    }

    const key = `lead-files/${lead.id}/${Date.now()}-${safeName(file.name)}`;
    const blob = await put(key, file, { access: "public", contentType: file.type || undefined });

    const entry = {
      id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: file.name,
      original_name: file.name,
      url: blob.url,
      size: file.size || 0,
      content_type: file.type || "",
      category,
      uploaded_by: lead.name || "Client",
      uploaded_at: new Date().toISOString(),
    };

    const updated = await updateLeadSafely(
      lead.id,
      (current) => ({
        documents: [...(current.documents || []), entry],
        activity: [...(current.activity || []), { text: `Client uploaded ${category}: ${file.name}`, at: entry.uploaded_at, kind: "document" }],
      }),
      (finalLead) => (finalLead.documents || []).some((d) => d.id === entry.id)
    );
    if (!updated) {
      // Couldn't confirm the write after retries — don't leave an orphaned
      // blob with nothing pointing at it.
      try { await del(blob.url); } catch {}
      return NextResponse.json({ error: "Upload didn't save, please try again" }, { status: 409 });
    }
    return NextResponse.json(publicView(updated), { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Public: the client can remove one of their own uploads (a wrong file
// picked by mistake) right from their own page, without needing staff.
// Clears documents_submitted_at — a change after submitting means staff
// should see the "submitted" status go away until the client re-submits.
export async function DELETE(request, { params }) {
  const lead = await getLeadByDocToken(params.token);
  if (!lead) return NextResponse.json({ error: "Link not found" }, { status: 404 });

  const fileId = new URL(request.url).searchParams.get("fileId");
  const target = (lead.documents || []).find((f) => f.id === fileId);
  if (!target) return NextResponse.json({ error: "File not found" }, { status: 404 });

  try {
    await del(target.url);
  } catch {}

  const updated = await updateLeadSafely(
    lead.id,
    (current) => ({
      documents: (current.documents || []).filter((f) => f.id !== fileId),
      activity: [...(current.activity || []), { text: `Client removed ${target.category || "document"}: ${target.name}`, at: new Date().toISOString(), kind: "document" }],
      documents_submitted_at: null,
    }),
    (finalLead) => !(finalLead.documents || []).some((d) => d.id === fileId)
  );
  if (!updated) return NextResponse.json({ error: "Remove didn't save, please try again" }, { status: 409 });
  return NextResponse.json(publicView(updated));
}
