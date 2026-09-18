import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import fs from "fs";
import path from "path";

const NAVY = rgb(0.06, 0.1, 0.33);
const GOLD = rgb(0.79, 0.54, 0.12);
const BLUE_BG = rgb(0.918, 0.941, 0.984);
const BLUE_BORDER = rgb(0.765, 0.839, 0.949);
const BLUE_TEXT = rgb(0.173, 0.31, 0.588);
const MUTED = rgb(0.42, 0.44, 0.52);
const INK = rgb(0.07, 0.08, 0.1);
const LINE = rgb(0.9, 0.91, 0.93);

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export async function buildQuotationPdf(quotation) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]); // A4
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  // Embed the actual company logo instead of just text, so the PDF carries
  // the same branding as the email and the accept page.
  let logoImage = null;
  try {
    const logoBytes = fs.readFileSync(path.join(process.cwd(), "public", "logo-color.png"));
    logoImage = await pdf.embedPng(logoBytes);
  } catch {}

  const marginX = 50;
  const contentWidth = 495 - marginX; // right edge for text at 495
  let y = 780;

  const text = (str, opts = {}) => {
    const { x = marginX, size = 11, f = font, color = INK } = opts;
    page.drawText(String(str), { x, y, size, font: f, color });
  };
  const nl = (amount = 18) => {
    y -= amount;
  };

  // Header: logo + company name
  if (logoImage) {
    const logoSize = 34;
    page.drawImage(logoImage, { x: marginX, y: y - logoSize + 8, width: logoSize, height: logoSize });
    text("DS Permitting Services", { x: marginX + logoSize + 12, size: 17, f: bold, color: NAVY });
    // subtitle sits on its own line below the company name
    page.drawText("Fort McCoy, FL", { x: marginX + logoSize + 12, y: y - 14, size: 9.5, font, color: MUTED });
    nl(46);
  } else {
    text("DS Permitting Services", { size: 20, f: bold, color: NAVY });
    nl(30);
  }

  // Gold rule under the header
  page.drawLine({ start: { x: marginX, y: y + 8 }, end: { x: 495, y: y + 8 }, thickness: 2, color: GOLD });
  nl(4);

  text(`QUOTATION ${quotation.number}`, { size: 9, f: bold, color: MUTED });
  nl(24);

  const row = (label, value) => {
    if (!value) return;
    text(label, { size: 10, f: bold, color: MUTED });
    text(value, { x: marginX + 90, size: 11, f: font, color: INK });
    nl(19);
  };
  row("Client", quotation.client_name);
  row("Email", quotation.client_email);
  row("Project", quotation.project_description);
  row("Location", quotation.address);
  row("Date", fmtDate(quotation.created_at));

  nl(12);
  text("Services", { size: 13, f: bold, color: NAVY });
  nl(20);
  (quotation.services || []).forEach((s) => {
    text(`•  ${s}`, { size: 11 });
    nl(18);
  });

  nl(8);
  text("Fees", { size: 13, f: bold, color: NAVY });
  nl(22);
  (quotation.fees || []).forEach((f) => {
    text(f.label, { size: 11 });
    const amountStr = `$${Number(f.amount || 0).toLocaleString()}`;
    const w = font.widthOfTextAtSize(amountStr, 11);
    text(amountStr, { x: marginX + 445 - w, size: 11 });
    nl(20);
  });

  nl(2);
  page.drawLine({ start: { x: marginX, y }, end: { x: marginX + 445, y }, thickness: 1, color: LINE });
  nl(20);

  text("Total", { size: 12, f: bold, color: NAVY });
  const totalStr = `$${Number(quotation.total || 0).toLocaleString()}`;
  const totalW = bold.widthOfTextAtSize(totalStr, 12);
  text(totalStr, { x: marginX + 445 - totalW, size: 12, f: bold, color: NAVY });
  nl(30);

  // Highlighted "valid until" banner — the one date customers must not miss
  const bannerH = 26;
  page.drawRectangle({ x: marginX, y: y - 6, width: 445, height: bannerH, color: BLUE_BG, borderColor: BLUE_BORDER, borderWidth: 1 });
  page.drawText(`Quotation valid until ${quotation.valid_until || ""}`, { x: marginX + 12, y: y + 3, size: 10.5, font: bold, color: BLUE_TEXT });
  nl(bannerH + 24);

  // Footer: logo + company details
  const footerY = 90;
  page.drawLine({ start: { x: marginX, y: footerY + 34 }, end: { x: 495, y: footerY + 34 }, thickness: 1, color: LINE });
  if (logoImage) {
    page.drawImage(logoImage, { x: marginX, y: footerY - 4, width: 24, height: 24, opacity: 0.85 });
  }
  const footerTextX = marginX + (logoImage ? 32 : 0);
  page.drawText("DS Permitting Services", { x: footerTextX, y: footerY + 12, size: 9.5, font: bold, color: rgb(0.29, 0.34, 0.47) });
  page.drawText("Fort McCoy, FL  ·  (352) 809-1717  ·  dspermitting.com  ·  info@dspermitting.com", { x: footerTextX, y: footerY, size: 8.5, font, color: MUTED });
  page.drawText("Licensed & insured permit expediting for Central & North Florida", { x: footerTextX, y: footerY - 12, size: 8, font, color: MUTED });

  const bytes = await pdf.save();
  return Buffer.from(bytes);
}
