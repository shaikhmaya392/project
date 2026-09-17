import { NextResponse } from "next/server";
import { getProjects, createProject } from "../../../lib/projectsStore";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const projects = await getProjects();
    return NextResponse.json(projects);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (!body.project_name && !body.property_address) {
      return NextResponse.json({ error: "Project name or property address is required" }, { status: 400 });
    }
    const project = await createProject(body);
    return NextResponse.json(project, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
