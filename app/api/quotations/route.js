import { NextResponse } from "next/server";
import { getQuotations, createQuotation } from "../../../lib/quotationsStore";
import { quotationEmailHtml } from "../../../lib/quotationEmail";
import { buildQuotationPdf } from "../../../lib/quotationPdf";
import { sendEmail } from "../../../lib/mailer";

export async function GET() {
  const quotations = await getQuotations();
  return NextResponse.json(quotations);
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (!body.client_email) {
      return NextResponse.json({ error: "Client email is required to send a quotation" }, { status: 400 });
    }
    const quotation = await createQuotation(body);
    const origin = new URL(request.url).origin;
    const acceptUrl = `${origin}/quotations/${quotation.token}`;

    try {
      const pdfBuffer = await buildQuotationPdf(quotation);
      await sendEmail({
        to: quotation.client_email,
        subject: `Quotation ${quotation.number} from DS Permitting Services`,
        html: quotationEmailHtml(quotation, acceptUrl),
        attachment: { filename: `Quotation-${quotation.number}.pdf`, buffer: pdfBuffer },
      });
    } catch (mailErr) {
      return NextResponse.json(
        { quotation, warning: `Quotation saved, but email failed to send: ${mailErr.message}` },
        { status: 201 }
      );
    }

    return NextResponse.json({ quotation }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
