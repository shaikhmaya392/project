import { getFile } from "../../../../lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Serves an uploaded file straight from the database. The document/file
// entries stored on leads and projects point their `url` at this route.
export async function GET(request, { params }) {
  const file = await getFile(params.id);
  if (!file) return new Response("Not found", { status: 404 });

  let body = file.data;
  // libSQL returns BLOB columns as ArrayBuffer/Uint8Array; normalize.
  if (body && body.buffer) body = Buffer.from(body.buffer, body.byteOffset, body.byteLength);
  else if (body instanceof ArrayBuffer) body = Buffer.from(body);

  const download = new URL(request.url).searchParams.get("download");
  const filename = (file.original_name || file.name || "file").replace(/"/g, "");
  return new Response(body, {
    headers: {
      "Content-Type": file.content_type || "application/octet-stream",
      "Content-Length": String(file.size || (body ? body.length : 0)),
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${filename}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
