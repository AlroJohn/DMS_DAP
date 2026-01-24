import jsPDF from "jspdf";
import "jspdf-autotable";
import { format } from "date-fns";

// Define types for jspdf-autotable hooks
interface AutoTableHookData {
  section: 'head' | 'body' | 'foot';
  cell: any;
  row: any;
  column: any;
  table: any;
  pageCount: number;
  pageNumber: number;
  settings: any;
}

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

  // place logo at top-left
  if (logoDataUrl) {
    const logoW = 45; // mm
    const logoH = 20; // mm
    doc.addImage(logoDataUrl, "PNG", 14, 10, logoW, logoH);
  }

  // place ribbon / decorative image on the top-right
  if (ribbonDataUrl) {
    const ribbonW = 25; // mm
    const ribbonH = 25; // mm
    const ribbonX = pageWidth - ribbonW - 5;
    doc.addImage(ribbonDataUrl, "PNG", ribbonX, 5, ribbonW, ribbonH);
  }

  // Main title
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.text("Document Trail History Report", 14, 40);

  // Document info
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  let yPos = 50;
  const labelWidth = 40;

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
  yPos += 8;
  doc.setDrawColor(218, 165, 32);
  doc.setLineWidth(1);
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
    startY: yPos + 3,
    margin: { left: 14, right: 14 },
    styles: {
      fontSize: 7,
      cellPadding: 3,
      lineColor: [180, 180, 180],
      lineWidth: 0.1,
      textColor: [0, 0, 0],
    },
    headStyles: {
      fillColor: [255, 235, 156],
      textColor: [0, 0, 0],
      fontStyle: "bold",
      halign: "center",
      valign: "middle",
      lineColor: [180, 180, 180],
      lineWidth: 0.1,
    },
    columnStyles: {
      0: { cellWidth: 25, halign: "center", valign: "top" },
      1: { cellWidth: 22, valign: "top" },
      2: { cellWidth: 28, valign: "top" },
      3: { cellWidth: 28, valign: "top" },
      4: { cellWidth: 25, halign: "center", valign: "top" },
      5: { cellWidth: "auto", valign: "top" },
    },
    didParseCell: function(data: AutoTableHookData) {
      // Footer settings
      const footerHeight = 20; // mm
      const footerY = pageHeight - footerHeight;

      // footer background (blue) - #1e3a8a
      doc.setFillColor(30, 58, 138);
      doc.rect(0, footerY, pageWidth, footerHeight, "F");

      // thin gold bottom stripe
      doc.setFillColor(218, 165, 32);
      doc.rect(0, pageHeight - 3, pageWidth, 3, "F");

      // footer text (white)
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "normal");
      const generatedText = `Generated on: ${format(new Date(), "M/d/yyyy, h:mm:ss a")}`;
      const systemText = "Document Tracking Management System";
      doc.text(generatedText, pageWidth / 2, footerY + 8, { align: "center" });
      doc.text(systemText, pageWidth / 2, footerY + 13, { align: "center" });

      // Page number (bottom right)
      const pageNumber = `${data.pageNumber}/${doc.getNumberOfPages()}`;
      doc.text(pageNumber, pageWidth - 14, footerY + 13, { align: "right" });
    },
  });

  const outName = filename || `document-trail-${documentInfo.code || documentInfo.id}.pdf`;
  doc.save(outName);
}

export default exportDocumentTrailsPDF;
