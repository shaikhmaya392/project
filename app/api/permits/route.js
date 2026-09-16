import { NextResponse } from "next/server";
import { getPermits, createPermit } from "../../../lib/permitsStore";
import { permitEmailHtml } from "../../../lib/permitEmail";
import { buildPermitPdf } from "../../../lib/permitPdf";
import { sendEmail } from "../../../lib/mailer";

export async function GET() {
  const permits = await getPermits();
  return NextResponse.json(permits);
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (!body.client_email) {
      return NextResponse.json({ error: "Client email is required to send a permit" }, { status: 400 });
    }
    const permit = await createPermit(body);
    const origin = new URL(request.url).origin;
    const acceptUrl = `${origin}/permits/${permit.token}`;

    try {
      const pdfBuffer = await buildPermitPdf(permit);
      await sendEmail({
        to: permit.client_email,
        subject: `Permit ${permit.number} from DS Permitting Services`,
        html: permitEmailHtml(permit, acceptUrl),
        attachment: { filename: `Permit-${permit.number}.pdf`, buffer: pdfBuffer },
      });
    } catch (mailErr) {
      return NextResponse.json(
        { permit, warning: `Permit saved, but email failed to send: ${mailErr.message}` },
        { status: 201 }
      );
    }

    return NextResponse.json({ permit }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
