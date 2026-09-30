import { NextResponse } from "next/server";
import { getProject, updateProject } from "../../../../../lib/projectsStore";
import { saveFile, deleteFile } from "../../../../../lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request, { params }) {
  const project = await getProject(params.id);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    const label = form.get("label") || file.name;
    const fileId = `file-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    await saveFile({
      id: fileId,
      owner_type: "project",
      owner_id: params.id,
      name: label,
      original_name: file.name,
      content_type: file.type || "",
      size: file.size || buffer.length,
      data: buffer,
      uploaded_by: "Staff",
      uploaded_at: new Date().toISOString(),
    });

    const entry = {
      id: fileId,
      name: label,
      original_name: file.name,
      url: `/api/files/${fileId}`,
      size: file.size || buffer.length,
      content_type: file.type || "",
      uploaded_at: new Date().toISOString(),
    };
    const files = Array.isArray(project.files) ? project.files : [];
    files.push(entry);
    await updateProject(params.id, { files });
    return NextResponse.json(entry, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const project = await getProject(params.id);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  const fileId = new URL(request.url).searchParams.get("fileId");
  const files = Array.isArray(project.files) ? project.files : [];
  try {
    await deleteFile(fileId);
  } catch {}
  await updateProject(params.id, { files: files.filter((f) => f.id !== fileId) });
  return NextResponse.json({ deleted: true });
}
