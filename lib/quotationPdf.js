import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import fs from "fs";
import path from "path";

const NAVY = rgb(0.06, 0.1, 0.33);
const GOLD = rgb(0.79, 0.54, 0.12);
const BLUE_BG = rgb(0.918, 0.941, 0.984);
const BLUE_BORDER = rgb(0.765, 0.839, 0.949);
const BLUE_TEXT = rgb(0.173, 0.31, 0.588);
const MUTED = rgb(0.42, 0.44, 0.52);
const MUTED_LIGHT = rgb(0.58, 0.6, 0.66);
const INK = rgb(0.07, 0.08, 0.1);
const LINE = rgb(0.9, 0.91, 0.93);
const ROW_ALT = rgb(0.976, 0.98, 0.988);
const HEAD_BG = rgb(0.06, 0.1, 0.33);

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function money(n) {
  return `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Invoice-style quotation document: branded header, a Bill To / info strip,
// a fully itemized table (services + fees as line items), totals, a
// highlighted validity notice, and a notes section — mirroring the layout
// of the company's own invoices so both documents read as one family.
export async function buildQuotationPdf(quotation) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]); // A4
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let logoImage = null;
  try {
    const logoBytes = fs.readFileSync(path.join(process.cwd(), "public", "logo-color.png"));
    logoImage = await pdf.embedPng(logoBytes);
  } catch {}

  const marginX = 50;
  const rightEdge = 545;
  const contentWidth = rightEdge - marginX;

  const textAt = (str, x, y, opts = {}) => {
    const { size = 11, f = font, color = INK } = opts;
    page.drawText(String(str), { x, y, size, font: f, color });
  };
  const textRight = (str, xEnd, y, opts = {}) => {
    const { size = 11, f = font, color = INK } = opts;
    const s = String(str);
    const w = f.widthOfTextAtSize(s, size);
    page.drawText(s, { x: xEnd - w, y, size, font: f, color });
  };
  const textCenter = (str, xCenter, y, opts = {}) => {
    const { size = 11, f = font, color = INK } = opts;
    const s = String(str);
    const w = f.widthOfTextAtSize(s, size);
    page.drawText(s, { x: xCenter - w / 2, y, size, font: f, color });
  };

  // ---- Header: logo left, company block + document title right ----
  let y = 780;
  const headerTop = y;
  textRight("QUOTATION", rightEdge, y, { size: 23, f: bold, color: NAVY });
  y -= 26;
  textRight("DS Permitting Services", rightEdge, y, { size: 12, f: bold, color: INK });
  y -= 13;
  textRight("Fort McCoy, FL", rightEdge, y, { size: 8.5, f: font, color: MUTED });
  y -= 11;
  textRight("(352) 809-1717", rightEdge, y, { size: 8.5, f: font, color: MUTED });
  y -= 11;
  textRight("dspermitting.com  |  info@dspermitting.com", rightEdge, y, { size: 8.5, f: font, color: MUTED });
  const headerTextBottom = y;

  const headerLogoSize = 70;
  if (logoImage) {
    page.drawImage(logoImage, { x: marginX, y: headerTop - headerLogoSize + 16, width: headerLogoSize, height: headerLogoSize });
  }

  y = Math.min(headerTextBottom, headerTop - headerLogoSize + 16) - 14;
  page.drawLine({ start: { x: marginX, y }, end: { x: rightEdge, y }, thickness: 2, color: GOLD });
  y -= 28;

  // ---- Info strip: quotation meta (left) + boxed total (right) ----
  const infoTop = y;
  const metaRow = (label, value) => {
    if (!value) return;
    textAt(label, marginX, y, { size: 9.5, f: bold, color: MUTED });
    textAt(value, marginX + 92, y, { size: 10.5, f: font, color: INK });
    y -= 17;
  };
  metaRow("Quotation No#:", quotation.number);
  metaRow("Date:", fmtDate(quotation.created_at));
  metaRow("Valid Until:", quotation.valid_until);
  const metaBottom = y;

  // Boxed total, echoing the amount-due box on the company's invoices
  const boxW = 165;
  const boxH = 62;
  const boxX = rightEdge - boxW;
  const boxY = infoTop - boxH + 12;
  page.drawRectangle({ x: boxX, y: boxY, width: boxW, height: boxH, color: BLUE_BG, borderColor: BLUE_BORDER, borderWidth: 1 });
  textCenter(money(quotation.total), boxX + boxW / 2, boxY + boxH - 26, { size: 19, f: bold, color: NAVY });
  textCenter("QUOTATION TOTAL", boxX + boxW / 2, boxY + 12, { size: 8, f: bold, color: BLUE_TEXT });

  y = Math.min(metaBottom, boxY) - 22;

  // ---- Bill To ----
  textAt("BILL TO", marginX, y, { size: 9.5, f: bold, color: NAVY });
  y -= 16;
  textAt(quotation.client_name || "—", marginX, y, { size: 12, f: bold, color: INK });
  y -= 15;
  if (quotation.client_email) {
    textAt(quotation.client_email, marginX, y, { size: 10, f: font, color: BLUE_TEXT });
    y -= 14;
  }
  if (quotation.project_description) {
    textAt(quotation.project_description, marginX, y, { size: 10, f: font, color: MUTED });
    y -= 14;
  }
  if (quotation.address) {
    textAt(quotation.address, marginX, y, { size: 10, f: font, color: MUTED });
    y -= 14;
  }
  y -= 14;

  // ---- Itemized table: services + fees as line items ----
  const col = { num: marginX, desc: marginX + 26, qty: 372, price: 470, amount: rightEdge };
  const rows = [
    ...((quotation.services || []).map((s) => ({ desc: s, qty: 1, price: null, amount: null }))),
    ...((quotation.fees || []).map((f) => ({ desc: f.label, qty: 1, price: f.amount, amount: f.amount }))),
  ];

  const headerRowH = 22;
  page.drawRectangle({ x: marginX, y: y - headerRowH + 6, width: contentWidth, height: headerRowH, color: HEAD_BG });
  const headY = y - headerRowH + 13;
  textAt("#", col.num + 6, headY, { size: 8.5, f: bold, color: rgb(1, 1, 1) });
  textAt("DESCRIPTION", col.desc, headY, { size: 8.5, f: bold, color: rgb(1, 1, 1) });
  textCenter("QTY", col.qty, headY, { size: 8.5, f: bold, color: rgb(1, 1, 1) });
  textRight("PRICE", col.price, headY, { size: 8.5, f: bold, color: rgb(1, 1, 1) });
  textRight("AMOUNT", col.amount - 4, headY, { size: 8.5, f: bold, color: rgb(1, 1, 1) });
  y -= headerRowH + 4;

  const rowH = 22;
  rows.forEach((r, i) => {
    if (i % 2 === 1) {
      page.drawRectangle({ x: marginX, y: y - rowH + 6, width: contentWidth, height: rowH, color: ROW_ALT });
    }
    const ty = y - rowH + 13;
    textAt(String(i + 1), col.num + 6, ty, { size: 9.5, f: font, color: MUTED });
    textAt(r.desc, col.desc, ty, { size: 9.5, f: font, color: INK });
    textCenter(String(r.qty), col.qty, ty, { size: 9.5, f: font, color: MUTED });
    textRight(r.price == null ? "—" : money(r.price), col.price, ty, { size: 9.5, f: font, color: MUTED });
    textRight(r.amount == null ? "—" : money(r.amount), col.amount - 4, ty, { size: 9.5, f: bold, color: INK });
    y -= rowH;
  });
  if (rows.length === 0) {
    textAt("No services or fees added yet", col.desc, y - rowH + 13, { size: 9.5, f: font, color: MUTED_LIGHT });
    y -= rowH;
  }
  page.drawLine({ start: { x: marginX, y: y + 6 }, end: { x: rightEdge, y: y + 6 }, thickness: 1, color: LINE });
  y -= 16;

  // ---- Totals ----
  textAt("Subtotal", col.price - 70, y, { size: 10, f: font, color: MUTED });
  textRight(money(quotation.total), col.amount - 4, y, { size: 10, f: font, color: INK });
  y -= 16;
  page.drawLine({ start: { x: col.price - 70, y }, end: { x: rightEdge, y }, thickness: 1, color: LINE });
  y -= 22;
  textAt("TOTAL", col.price - 70, y, { size: 12.5, f: bold, color: NAVY });
  textRight(money(quotation.total), col.amount - 4, y, { size: 12.5, f: bold, color: NAVY });
  y -= 38;

  // Highlighted "valid until" banner — the one date customers must not miss.
  // Text is vertically centered in the box (equal padding top and bottom).
  const bannerH = 32;
  const bannerBottom = y - bannerH;
  page.drawRectangle({ x: marginX, y: bannerBottom, width: contentWidth, height: bannerH, color: BLUE_BG, borderColor: BLUE_BORDER, borderWidth: 1 });
  textAt(`Quotation valid until ${quotation.valid_until || ""}`, marginX + 14, bannerBottom + bannerH / 2 - 4, { size: 10.5, f: bold, color: BLUE_TEXT });
  y = bannerBottom - 28;

  // ---- Notes ----
  textAt("NOTES", marginX, y, { size: 9.5, f: bold, color: NAVY });
  y -= 15;
  const notes = [
    "This quotation is an estimate based on the information provided and is not a final invoice.",
    "Pricing may be adjusted if project scope or municipality requirements change.",
    "Please reach out with any questions before accepting.",
  ];
  notes.forEach((line) => {
    textAt(line, marginX, y, { size: 9, f: font, color: MUTED });
    y -= 13;
  });

  // ---- Footer: logo + company details ----
  const footerRuleY = 168;
  page.drawLine({ start: { x: marginX, y: footerRuleY }, end: { x: rightEdge, y: footerRuleY }, thickness: 1, color: LINE });
  const footerLogoSize = 70;
  const footerLogoY = footerRuleY - 18 - footerLogoSize;
  if (logoImage) {
    page.drawImage(logoImage, { x: marginX, y: footerLogoY, width: footerLogoSize, height: footerLogoSize, opacity: 0.9 });
  }
  const footerTextX = marginX + (logoImage ? footerLogoSize + 14 : 0);
  const footerTextCenterY = footerLogoY + footerLogoSize / 2;
  page.drawText("DS Permitting Services", { x: footerTextX, y: footerTextCenterY + 14, size: 10, font: bold, color: rgb(0.29, 0.34, 0.47) });
  page.drawText("Fort McCoy, FL  ·  (352) 809-1717  ·  dspermitting.com  ·  info@dspermitting.com", { x: footerTextX, y: footerTextCenterY, size: 8.5, font, color: MUTED });
  page.drawText("Licensed & insured permit expediting for Central & North Florida", { x: footerTextX, y: footerTextCenterY - 14, size: 8, font, color: MUTED });

  const bytes = await pdf.save();
  return Buffer.from(bytes);
}
