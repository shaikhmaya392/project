import { NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { getLead, updateLead, updateLeadSafely } from "../../../../../lib/leadsStore";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function safeName(name) {
  return (name || "file").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
}

export async function POST(request, { params }) {
  const lead = await getLead(params.id);
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    const label = form.get("label") || file.name;
    const uploaded_by = form.get("uploaded_by") || "Staff";
    const key = `lead-files/${params.id}/${Date.now()}-${safeName(file.name)}`;
    const blob = await put(key, file, { access: "public", contentType: file.type || undefined });

    const entry = {
      id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: label,
      original_name: file.name,
      url: blob.url,
      size: file.size || 0,
      content_type: file.type || "",
      uploaded_by,
      uploaded_at: new Date().toISOString(),
    };
    const documents = Array.isArray(lead.documents) ? lead.documents : [];
    documents.push(entry);

    const activity = Array.isArray(lead.activity) ? lead.activity : [];
    activity.push({ text: `${uploaded_by} uploaded document: ${label}`, at: new Date().toISOString(), kind: "document" });

    await updateLead(params.id, { documents, activity });
    return NextResponse.json(entry, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const lead = await getLead(params.id);
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  const fileId = new URL(request.url).searchParams.get("fileId");
  const target = (lead.documents || []).find((f) => f.id === fileId);
  if (target) {
    try {
      await del(target.url);
    } catch {}
  }
  // Removing a document after the client submitted means the "submitted"
  // status is no longer accurate, so clear it here too (mirrors the
  // client's own delete on the public page).
  await updateLeadSafely(
    params.id,
    (current) => ({ documents: (current.documents || []).filter((f) => f.id !== fileId), documents_submitted_at: null }),
    (finalLead) => !(finalLead.documents || []).some((d) => d.id === fileId)
  );
  return NextResponse.json({ deleted: true });
}
