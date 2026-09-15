import PDFDocument from "pdfkit";

export function buildProposalPdf(proposal) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const navy = "#0f1a54";
    const gold = "#c98a1f";
    const muted = "#6b7086";

    doc.fontSize(10).fillColor(muted).text(`PROPOSAL ${proposal.number}`, { characterSpacing: 1 });
    doc.moveDown(0.3);
    doc.fontSize(20).fillColor(navy).text("DS Permitting Services", { continued: false });
    doc.moveDown(1);

    doc.fontSize(11).fillColor("#111827");
    const row = (label, value) => {
      doc.font("Helvetica-Bold").fillColor(muted).text(label, { continued: false });
      doc.font("Helvetica").fillColor("#111827").text(value || "-");
      doc.moveDown(0.4);
    };
    row("Client", proposal.client_name);
    row("Project", proposal.project_description);
    row("Location", proposal.address);

    doc.moveDown(0.6);
    doc.font("Helvetica-Bold").fontSize(13).fillColor(navy).text("Services");
    doc.moveDown(0.3);
    doc.font("Helvetica").fontSize(11).fillColor("#111827");
    proposal.services.forEach((s) => {
      doc.text(`•  ${s}`);
    });

    doc.moveDown(0.8);
    doc.font("Helvetica-Bold").fontSize(13).fillColor(navy).text("Fees");
    doc.moveDown(0.3);
    doc.font("Helvetica").fontSize(11).fillColor("#111827");

    const startX = doc.x;
    proposal.fees.forEach((f) => {
      const y = doc.y;
      doc.text(f.label, startX, y, { continued: false, width: 350 });
      doc.text(`$${Number(f.amount || 0).toLocaleString()}`, startX + 350, y, { width: 120, align: "right" });
    });

    doc.moveDown(0.3);
    doc.moveTo(startX, doc.y).lineTo(startX + 470, doc.y).strokeColor("#e6e8ee").stroke();
    doc.moveDown(0.3);

    const totalY = doc.y;
    doc.font("Helvetica-Bold").fontSize(12).fillColor(navy);
    doc.text("Total", startX, totalY, { width: 350 });
    doc.text(`$${proposal.total.toLocaleString()}`, startX + 350, totalY, { width: 120, align: "right" });

    doc.moveDown(1.2);
    doc.font("Helvetica").fontSize(10).fillColor(muted).text(`Proposal valid until ${proposal.valid_until}`);

    doc.moveDown(2);
    doc.fontSize(9).fillColor(gold).text("DS Permitting Services", { continued: false });
    doc.fontSize(9).fillColor(muted).text("Fort McCoy, FL  ·  352-809-1717  ·  dspermitservices@gmail.com");

    doc.end();
  });
}
