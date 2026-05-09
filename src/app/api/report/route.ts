import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { getBusiness, latestAudit, listChecklist, listTasks } from "@/lib/data";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const businessId = url.searchParams.get("businessId");
  if (!businessId) return new NextResponse("businessId required", { status: 400 });
  const business = await getBusiness(businessId);
  if (!business) return new NextResponse("not found", { status: 404 });
  const audit = await latestAudit(business.id);
  const checklist = await listChecklist(business.id);
  const tasks = await listTasks(business.id);

  const buffer = await new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "LETTER" });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c as Buffer));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Header
    doc.fontSize(22).fillColor("#1d4ed8").text("LocalRank AI", { continued: false });
    doc.moveDown(0.2);
    doc.fontSize(10).fillColor("#64748b").text(`Monthly SEO Report — ${new Date().toLocaleDateString()}`);
    doc.moveDown(1);

    // Business
    doc.fontSize(18).fillColor("#0f172a").text(business.name);
    doc.fontSize(10).fillColor("#475569").text(
      [business.category, [business.city, business.region, business.country].filter(Boolean).join(", ")]
        .filter(Boolean)
        .join(" · "),
    );
    if (business.website) doc.fillColor("#1d4ed8").text(business.website);
    doc.moveDown(1);

    // Score + summary
    section(doc, "Executive summary");
    if (audit) {
      doc.fontSize(36).fillColor("#1d4ed8").text(`${audit.score}/100`);
      doc.moveDown(0.2);
      doc.fontSize(11).fillColor("#0f172a").text(audit.summary);
    } else {
      doc.fontSize(11).fillColor("#475569").text("No audit has been generated yet.");
    }
    doc.moveDown(1);

    // Findings
    section(doc, "Findings");
    if (audit && audit.findings.length) {
      audit.findings.forEach((f) => {
        doc.fontSize(11).fillColor("#0f172a").text(`[${f.severity.toUpperCase()}] ${f.area}: ${f.issue}`);
        doc.fontSize(10).fillColor("#475569").text(`→ ${f.recommendation}`);
        doc.moveDown(0.5);
      });
    } else {
      doc.fontSize(10).fillColor("#475569").text("No findings yet.");
    }
    doc.moveDown(0.5);

    // Plan
    section(doc, "Improvement plan");
    if (audit && audit.plan.length) {
      audit.plan.forEach((p) => {
        doc.fontSize(11).fillColor("#0f172a").text(`${p.step}. ${p.title}  ·  effort:${p.effort} / impact:${p.impact}`);
        doc.fontSize(10).fillColor("#475569").text(p.detail);
        doc.moveDown(0.4);
      });
    } else {
      doc.fontSize(10).fillColor("#475569").text("No plan yet.");
    }
    doc.moveDown(0.5);

    // Checklist progress
    section(doc, "Checklist progress");
    const done = checklist.filter((c) => c.status === "done").length;
    doc.fontSize(11).fillColor("#0f172a").text(`${done} of ${checklist.length} items completed`);
    doc.moveDown(0.5);

    // Tasks completed
    section(doc, "Tasks completed");
    const completed = tasks.filter((t) => t.status === "done");
    if (completed.length) {
      completed.forEach((t) => doc.fontSize(10).fillColor("#0f172a").text(`✓ ${t.title}`));
    } else {
      doc.fontSize(10).fillColor("#475569").text("No tasks marked done yet.");
    }

    doc.end();
  });

  const arr = new Uint8Array(buffer);
  return new NextResponse(arr, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="localrank-${business.name.replace(/\s+/g, "-").toLowerCase()}.pdf"`,
    },
  });
}

function section(doc: PDFKit.PDFDocument, title: string) {
  doc.fontSize(13).fillColor("#1d4ed8").text(title);
  doc.moveTo(doc.x, doc.y).lineTo(550, doc.y).strokeColor("#dbeafe").stroke();
  doc.moveDown(0.5);
}
