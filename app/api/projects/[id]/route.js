import { NextResponse } from "next/server";
import { getProject, updateProject, deleteProject } from "../../../../lib/projectsStore";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request, { params }) {
  const project = await getProject(params.id);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  return NextResponse.json(project);
}

export async function PATCH(request, { params }) {
  try {
    const body = await request.json();
    const project = await updateProject(params.id, body);
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    return NextResponse.json(project);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const ok = await deleteProject(params.id);
  if (!ok) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  return NextResponse.json({ deleted: true });
}
