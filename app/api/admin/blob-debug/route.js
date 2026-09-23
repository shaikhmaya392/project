import { NextResponse } from "next/server";
import { list } from "@vercel/blob";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Temporary diagnostic: lists every blob object so we can check whether any
// older version of leads.json is still reachable after an accidental
// overwrite. Not part of the app's normal feature set — remove once used.
export async function GET() {
  try {
    const { blobs } = await list({ limit: 200 });
    return NextResponse.json({
      blobs: blobs.map((b) => ({
        pathname: b.pathname,
        url: b.url,
        size: b.size,
        uploadedAt: b.uploadedAt,
      })),
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
