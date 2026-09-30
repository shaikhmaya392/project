import { NextResponse } from "next/server";
import { getLead, updateLead, updateLeadSafely } from "../../../../../lib/leadsStore";
import { saveFile, deleteFile } from "../../../../../lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
    const fileId = `file-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    await saveFile({
      id: fileId,
      owner_type: "lead",
      owner_id: params.id,
      name: label,
      original_name: file.name,
      content_type: file.type || "",
      size: file.size || buffer.length,
      data: buffer,
      uploaded_by,
      uploaded_at: new Date().toISOString(),
    });

    const entry = {
      id: fileId,
      name: label,
      original_name: file.name,
      url: `/api/files/${fileId}`,
      size: file.size || buffer.length,
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
  try {
    await deleteFile(fileId);
  } catch {}
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
