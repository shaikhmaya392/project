import { NextResponse } from "next/server";
import { getProposals, createProposal } from "../../../lib/proposalsStore";
import { proposalEmailHtml } from "../../../lib/proposalEmail";
import { sendEmail } from "../../../lib/mailer";

export async function GET() {
  const proposals = await getProposals();
  return NextResponse.json(proposals);
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (!body.client_email) {
      return NextResponse.json({ error: "Client email is required to send a proposal" }, { status: 400 });
    }
    const proposal = await createProposal(body);
    const origin = new URL(request.url).origin;
    const acceptUrl = `${origin}/proposals/${proposal.token}`;

    try {
      await sendEmail({
        to: proposal.client_email,
        subject: `Proposal ${proposal.number} from DS Permitting Services`,
        html: proposalEmailHtml(proposal, acceptUrl),
      });
    } catch (mailErr) {
      return NextResponse.json(
        { proposal, warning: `Proposal saved, but email failed to send: ${mailErr.message}` },
        { status: 201 }
      );
    }

    return NextResponse.json({ proposal }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
