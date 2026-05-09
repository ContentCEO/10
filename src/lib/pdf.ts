import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { LineItem, PaymentMilestone, ProposalPhoto, TimelinePhase } from "@/lib/types";
import { currency, shortDate } from "@/lib/format";

type ExportInput = {
  client_name: string;
  client_email?: string;
  client_address?: string;
  project_type?: string;
  generated_text: string;
  line_items: LineItem[];
  payment_schedule: PaymentMilestone[];
  timeline: TimelinePhase[];
  terms: string;
  total_amount: number;
  photos: ProposalPhoto[];
};

export async function exportProposalPdf(input: ExportInput) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 48;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Header
  doc.setFillColor(26, 94, 245);
  doc.rect(0, 0, pageWidth, 72, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Project Proposal", margin, 44);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Generated ${shortDate(new Date())}`, pageWidth - margin, 44, { align: "right" });
  y = 100;

  // Client block
  doc.setTextColor(17, 24, 39);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(input.client_name || "Client", margin, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(75, 85, 99);
  y += 16;
  if (input.client_address) { doc.text(input.client_address, margin, y); y += 14; }
  if (input.client_email) { doc.text(input.client_email, margin, y); y += 14; }
  if (input.project_type) { doc.text(`Project: ${input.project_type}`, margin, y); y += 14; }
  y += 8;

  // Narrative
  if (input.generated_text) {
    doc.setTextColor(17, 24, 39);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Overview", margin, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(input.generated_text, contentWidth);
    for (const line of lines) {
      if (y > 740) { doc.addPage(); y = margin; }
      doc.text(line, margin, y);
      y += 14;
    }
    y += 10;
  }

  // Line items
  if (input.line_items.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [["Description", "Qty", "Unit", "Unit price", "Total"]],
      body: input.line_items.map((i) => [
        i.description,
        String(i.quantity),
        i.unit,
        currency(i.unit_price),
        currency(i.total),
      ]),
      foot: [["", "", "", "Subtotal", currency(input.total_amount)]],
      headStyles: { fillColor: [26, 94, 245], textColor: 255 },
      footStyles: { fillColor: [243, 244, 246], textColor: 17, fontStyle: "bold" },
      styles: { fontSize: 9, cellPadding: 6 },
      margin: { left: margin, right: margin },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 18;
  }

  // Payment schedule
  if (input.payment_schedule.length > 0) {
    if (y > 700) { doc.addPage(); y = margin; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Payment schedule", margin, y);
    y += 8;
    autoTable(doc, {
      startY: y + 4,
      head: [["Milestone", "Due", "%", "Amount"]],
      body: input.payment_schedule.map((m) => [m.label, m.due, `${m.percent}%`, currency(m.amount)]),
      headStyles: { fillColor: [26, 94, 245], textColor: 255 },
      styles: { fontSize: 9, cellPadding: 6 },
      margin: { left: margin, right: margin },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 18;
  }

  // Timeline
  if (input.timeline.length > 0) {
    if (y > 700) { doc.addPage(); y = margin; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Timeline", margin, y);
    y += 8;
    autoTable(doc, {
      startY: y + 4,
      head: [["Phase", "Start", "End", "Notes"]],
      body: input.timeline.map((t) => [t.phase, t.start, t.end, t.notes ?? ""]),
      headStyles: { fillColor: [26, 94, 245], textColor: 255 },
      styles: { fontSize: 9, cellPadding: 6 },
      margin: { left: margin, right: margin },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 18;
  }

  // Terms
  if (input.terms) {
    if (y > 660) { doc.addPage(); y = margin; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Terms & conditions", margin, y);
    y += 16;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(input.terms, contentWidth);
    for (const line of lines) {
      if (y > 760) { doc.addPage(); y = margin; }
      doc.text(line, margin, y);
      y += 12;
    }
  }

  // Photos page
  if (input.photos.length > 0) {
    doc.addPage();
    y = margin;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Project photos", margin, y);
    y += 20;
    const cellW = (contentWidth - 12) / 2;
    const cellH = cellW * 0.75;
    let col = 0;
    for (const photo of input.photos) {
      try {
        const dataUrl = await urlToDataUrl(photo.url);
        const x = margin + col * (cellW + 12);
        if (y + cellH > 760) { doc.addPage(); y = margin; }
        doc.addImage(dataUrl, "JPEG", x, y, cellW, cellH, undefined, "FAST");
        col += 1;
        if (col >= 2) { col = 0; y += cellH + 12; }
      } catch {
        // skip a photo if we can't load it (e.g. CORS)
      }
    }
  }

  doc.save(`${(input.client_name || "proposal").replace(/[^a-z0-9]+/gi, "_").toLowerCase()}-proposal.pdf`);
}

async function urlToDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
