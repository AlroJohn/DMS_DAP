import jsPDF from "jspdf";
import "jspdf-autotable";
import { format } from "date-fns";

export interface DocumentTrailDetail {
  id: string;
  documentId: string;
  actionDate: string;
  createdAt?: string;
  updatedAt?: string;
  user: string;
  fromDepartment: string;
  toDepartment: string;
  status: string;
  remarks: string;
}

export interface DocumentInfo {
  id: string;
  title: string;
  code: string;
  type: string;
  classification: string;
  status: string;
  createdAt: string;
}

export function getStatusText(status: string) {
  switch (status) {
    case "pending":
      return "Pending";
    case "intransit":
      return "In Transit";
    case "received":
      return "Received";
    case "completed":
      return "Completed";
    case "deleted":
      return "Deleted";
    case "archive":
      return "Archived";
    case "placeholder_added":
      return "Signature Placeholder Added";
    case "signed":
      return "Document Signed";
    case "checkout":
      return "Check Out";
    case "checkin":
      return "Check In";
    default:
      return status;
  }
}

/**
 * Generate and save a Document Trails PDF using jspdf + autotable.
 * Mirrors the visual design from the document trails page.
 */
export async function exportDocumentTrailsPDF(
  documentInfo: DocumentInfo,
  trails: DocumentTrailDetail[],
  filename?: string
): Promise<void> {
  const doc = new jsPDF({ format: "a4", unit: "mm" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // top blue header bar (matches design) - #19268f
  doc.setFillColor(25, 38, 143);
  const headerBarHeight = 8; // mm
  doc.rect(0, 0, pageWidth, headerBarHeight, "F");

  // Load header images (logo left and ribbon/top-right)
  let logoDataUrl: string | null = null;
  let ribbonDataUrl: string | null = null;
  try {
    const [logoRes, ribbonRes] = await Promise.all([
      fetch("/image/dap_logo.png"),
      fetch("/image/ribbon.png"),
    ]);

    if (logoRes.ok) {
      const blob = await logoRes.blob();
      logoDataUrl = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = reject;
        r.readAsDataURL(blob);
      });
    }

    if (ribbonRes.ok) {
      const blob2 = await ribbonRes.blob();
      ribbonDataUrl = await new Promise((resolve, reject) => {
        const r2 = new FileReader();
        r2.onload = () => resolve(r2.result as string);
        r2.onerror = reject;
        r2.readAsDataURL(blob2);
      });
    }
  } catch (e) {
    // ignore image load failures
  }

  // place logo at top-left (adjust size as needed)
  if (logoDataUrl) {
    // keep logo reasonably sized on A4
    const logoW = 50; // mm
    const logoH = 50; // mm
    doc.addImage(logoDataUrl, "PNG", 14, 8, logoW, logoH);
  }

  // place ribbon / decorative image on the top-right
  if (ribbonDataUrl) {
    const ribbonW = 110; // mm
    const ribbonH = 110; // mm
    // position ribbon flush to the right (r-0)
    const ribbonX = Math.max(0, pageWidth - ribbonW);
    doc.addImage(ribbonDataUrl, "PNG", ribbonX, 0, ribbonW, ribbonH);
  }

  // Main title
  doc.setFontSize(16);
  doc.setTextColor(25, 38, 143);
  doc.setFont("helvetica", "bold");
  doc.text("Document Trail History Report", 14, 50);

  // Document info
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  let yPos = 65;
  const labelWidth = 45;

  doc.text("Document Title:", 14, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(documentInfo.title || "-", 14 + labelWidth, yPos);

  yPos += 7;
  doc.setFont("helvetica", "bold");
  doc.text("Document Code:", 14, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(documentInfo.code || "-", 14 + labelWidth, yPos);

  yPos += 7;
  doc.setFont("helvetica", "bold");
  doc.text("Document Type:", 14, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(documentInfo.type || "-", 14 + labelWidth, yPos);

  yPos += 7;
  doc.setFont("helvetica", "bold");
  doc.text("Classification:", 14, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(documentInfo.classification || "-", 14 + labelWidth, yPos);

  yPos += 7;
  doc.setFont("helvetica", "bold");
  doc.text("Status:", 14, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(getStatusText(documentInfo.status || "-"), 14 + labelWidth, yPos);

  yPos += 7;
  doc.setFont("helvetica", "bold");
  doc.text("Created:", 14, yPos);
  doc.setFont("helvetica", "normal");
  try {
    doc.text(
      format(new Date(documentInfo.createdAt), "MMM d, yyyy h:mm a"),
      14 + labelWidth,
      yPos
    );
  } catch {
    doc.text("-", 14 + labelWidth, yPos);
  }

  // Separator
  yPos += 10;
  doc.setDrawColor(218, 165, 32);
  doc.setLineWidth(0.5);
  doc.line(14, yPos, pageWidth - 14, yPos);

  // Table
  const tableColumn = [
    "Action Date",
    "User",
    "From\nDepartment",
    "To\nDepartment",
    "Status",
    "Remarks",
  ];

  const tableRows = (trails || []).map((trail) => [
    (() => {
      try {
        return format(new Date(trail.actionDate), "MMM d, yyyy\nh:mm a");
      } catch {
        return trail.actionDate || "-";
      }
    })(),
    trail.user || "-",
    trail.fromDepartment || "-",
    trail.toDepartment || "-",
    getStatusText(trail.status || "-"),
    trail.remarks || "",
  ]);

  (doc as any).autoTable({
    head: [tableColumn],
    body: tableRows,
    startY: yPos + 5,
    margin: { left: 14, right: 14 },
    styles: {
      fontSize: 8,
      cellPadding: 4,
      lineColor: [200, 200, 200],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [218, 165, 32],
      textColor: [0, 0, 0],
      fontStyle: "bold",
      halign: "center",
      valign: "middle",
    },
    columnStyles: {
      0: { cellWidth: 28, halign: "center" },
      1: { cellWidth: 25 },
      2: { cellWidth: 30 },
      3: { cellWidth: 30 },
      4: { cellWidth: 25, halign: "center" },
      5: { cellWidth: "auto" },
    },
    alternateRowStyles: { fillColor: [252, 252, 252] },
    didDrawPage: function (data: any) {
      const footerHeight = 22; // mm
      const footerY = pageHeight - footerHeight;

      // footer background (blue) - match header color #19268f
      doc.setFillColor(25, 38, 143);
      doc.rect(0, pageHeight - footerHeight, pageWidth, footerHeight, "F");

      // thin gold bottom stripe
      doc.setFillColor(218, 165, 32);
      doc.rect(0, pageHeight - 2, pageWidth, 2, "F");

      // footer text (white)
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "normal");
      const generatedText = `Generated on: ${format(new Date(), "M/d/yyyy, h:mm:ss a")}`;
      const systemText = "Document Management System - Ateneo de Manila University";
      doc.text(generatedText, pageWidth / 2, pageHeight - 9, { align: "center" });
      doc.text(systemText, pageWidth / 2, pageHeight - 4, { align: "center" });
    },
  });

  const outName = filename || `document-trail-${documentInfo.code || documentInfo.id}.pdf`;
  doc.save(outName);
}

export default exportDocumentTrailsPDF;
