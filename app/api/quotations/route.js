import { NextResponse } from "next/server";
import { getQuotations, createQuotation } from "../../../lib/quotationsStore";
import { quotationEmailHtml } from "../../../lib/quotationEmail";
import { buildQuotationPdf } from "../../../lib/quotationPdf";
import { sendEmail } from "../../../lib/mailer";
import { getLead, updateLead, ensureDocToken } from "../../../lib/leadsStore";

// Sending a quotation moves the lead to "Quotation Sent" so the status is
// the same on the leads list, the lead detail page and the dashboard.
async function syncLeadOnSend(quotation) {
  if (!quotation.lead_id) return;
  try {
    const lead = await getLead(quotation.lead_id);
    if (!lead) return;
    const activity = Array.isArray(lead.activity) ? [...lead.activity] : [];
    activity.push({ text: `Quotation ${quotation.number} sent to client`, at: quotation.created_at, kind: "quote" });
    await updateLead(lead.id, { status: "quote_sent", activity });
  } catch {}
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
    await syncLeadOnSend(quotation);
    const origin = new URL(request.url).origin;
    const acceptUrl = `${origin}/quotations/${quotation.token}`;
    // Include the client's own document-upload link in the same email, so
    // they can send their paperwork right from the quotation they got.
    const docToken = quotation.lead_id ? await ensureDocToken(quotation.lead_id) : null;
    const docUploadUrl = docToken ? `${origin}/documents/${docToken}` : null;

    try {
      const pdfBuffer = await buildQuotationPdf(quotation);
      await sendEmail({
        to: quotation.client_email,
        subject: `Quotation ${quotation.number} from DS Permitting Services`,
        html: quotationEmailHtml(quotation, acceptUrl, origin, docUploadUrl),
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
