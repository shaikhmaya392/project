import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const NAVY = rgb(0.06, 0.1, 0.33);
const GOLD = rgb(0.79, 0.54, 0.12);
const MUTED = rgb(0.42, 0.44, 0.52);
const INK = rgb(0.07, 0.08, 0.1);

export async function buildProposalPdf(proposal) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]); // A4
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const marginX = 50;
  let y = 780;

  const text = (str, opts = {}) => {
    const { x = marginX, size = 11, f = font, color = INK } = opts;
    page.drawText(String(str), { x, y, size, font: f, color });
  };
  const nl = (amount = 18) => {
    y -= amount;
  };

  text(`PROPOSAL ${proposal.number}`, { size: 9, f: bold, color: MUTED });
  nl(26);
  text("DS Permitting Services", { size: 20, f: bold, color: NAVY });
  nl(34);

  const row = (label, value) => {
    text(label, { size: 10, f: bold, color: MUTED });
    text(value || "-", { x: marginX + 90, size: 11, f: font, color: INK });
    nl(20);
  };
  row("Client", proposal.client_name);
  row("Project", proposal.project_description);
  row("Location", proposal.address);

  nl(14);
  text("Services", { size: 13, f: bold, color: NAVY });
  nl(20);
  proposal.services.forEach((s) => {
    text(`•  ${s}`, { size: 11 });
    nl(18);
  });

  nl(10);
  text("Fees", { size: 13, f: bold, color: NAVY });
  nl(22);
  proposal.fees.forEach((f) => {
    text(f.label, { size: 11 });
    const amountStr = `$${Number(f.amount || 0).toLocaleString()}`;
    const w = font.widthOfTextAtSize(amountStr, 11);
    text(amountStr, { x: marginX + 470 - w, size: 11 });
    nl(20);
  });

  nl(2);
  page.drawLine({
    start: { x: marginX, y },
    end: { x: marginX + 470, y },
    thickness: 1,
    color: rgb(0.9, 0.91, 0.93),
  });
  nl(20);

  text("Total", { size: 12, f: bold, color: NAVY });
  const totalStr = `$${proposal.total.toLocaleString()}`;
  const totalW = bold.widthOfTextAtSize(totalStr, 12);
  text(totalStr, { x: marginX + 470 - totalW, size: 12, f: bold, color: NAVY });
  nl(30);

  text(`Proposal valid until ${proposal.valid_until}`, { size: 10, color: MUTED });
  nl(50);

  text("DS Permitting Services", { size: 9, f: bold, color: GOLD });
  nl(14);
  text("Fort McCoy, FL  ·  352-809-1717  ·  dspermitservices@gmail.com", { size: 9, color: MUTED });

  const bytes = await pdf.save();
  return Buffer.from(bytes);
}
