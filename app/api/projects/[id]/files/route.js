import { NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { getProject, updateProject } from "../../../../../lib/projectsStore";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function safeName(name) {
  return (name || "file").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
}

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
    const key = `project-files/${params.id}/${Date.now()}-${safeName(file.name)}`;
    const blob = await put(key, file, { access: "public", contentType: file.type || undefined });

    const entry = {
      id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: label,
      original_name: file.name,
      url: blob.url,
      size: file.size || 0,
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
  const target = files.find((f) => f.id === fileId);
  const remaining = files.filter((f) => f.id !== fileId);
  if (target) {
    try {
      await del(target.url);
    } catch {}
  }
  await updateProject(params.id, { files: remaining });
  return NextResponse.json({ deleted: true });
}
