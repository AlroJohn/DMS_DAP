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
    const [logoRes] = await Promise.all([
      fetch("/image/qby.png"),
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
  } catch (error) {
    console.error("Error loading logo image:", error);
  }

  // place logo centered at top — preserve aspect ratio and cap size to avoid blur
  const maxLogoW = pageWidth - 28; // leave 14mm side margins
  const maxLogoH = 60; // mm max height (increased to allow larger logos)
  let logoW = 70; // fallback width (mm) — larger default
  let logoH = 35; // fallback height (mm)
  const logoY = 6;
  if (logoDataUrl) {
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = logoDataUrl as string;
      });
      const aspect = (img.naturalWidth && img.naturalHeight) ? img.naturalWidth / img.naturalHeight : 1;
      // preferred width but not wider than page margins (allow larger maximum)
      logoW = Math.min(110, maxLogoW);
      logoH = logoW / aspect;
      // if computed height exceeds max, clamp by height instead
      if (logoH > maxLogoH) {
        logoH = maxLogoH;
        logoW = Math.min(logoH * aspect, maxLogoW);
      }
    } catch (e) {
      // keep fallback sizes if image load fails
      logoW = Math.min(70, maxLogoW);
      logoH = logoW * 0.5;
    }
    const logoX = (pageWidth - logoW) / 2;
    doc.addImage(logoDataUrl, "PNG", logoX, logoY, logoW, logoH);
  }

  // Main title (positioned closer to top; below logo when present)
  const titleY = logoDataUrl ? logoY + logoH + 10 : 18;
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.text("Document Trail History Report", 14, titleY);

  // Document info
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  let yPos = titleY + 8;
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

      // thin gold bottom stripe: make thinner and leave a small gap below (~6px)
      doc.setFillColor(218, 165, 32);
      const stripeHeightMm = 1; // mm (thin)
      const gapBelowPx = 12; // pixels (user requested)
      const pxToMm = 25.4 / 96; // convert px (96dpi) to mm
      const gapBelowMm = gapBelowPx * pxToMm;
      const stripeY = pageHeight - gapBelowMm - stripeHeightMm;
      // ensure stripe doesn't go off-page
      const stripeYClamped = Math.max(0, stripeY);
      doc.rect(0, stripeYClamped, pageWidth, stripeHeightMm, "F");

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

// Export CSV and Excel helpers so other UI code can reuse the same formatting
export async function exportDocumentTrailsCSV(
  documentInfo: DocumentInfo,
  trails: DocumentTrailDetail[],
  filename?: string
): Promise<void> {
  let csvContent = `Document Trail History Report\n`;
  csvContent += `Document: ${documentInfo.title}\n`;
  csvContent += `Code: ${documentInfo.code}\n`;
  csvContent += `Type: ${documentInfo.type}\n`;
  csvContent += `Classification: ${documentInfo.classification}\n`;
  csvContent += `Status: ${getStatusText(documentInfo.status)}\n`;
  try {
    csvContent += `Created: ${format(new Date(documentInfo.createdAt), "MMM d, yyyy h:mm a")}\n\n`;
  } catch {
    csvContent += `Created: -\n\n`;
  }

  csvContent += `Action Date,User,From Department,To Department,Status,Remarks\n`;
  trails.forEach((trail) => {
    let actionDate = trail.actionDate || "-";
    try {
      actionDate = format(new Date(trail.actionDate), "MMM d, yyyy h:mm a");
    } catch {}
    const remarks = (trail.remarks || "").replace(/"/g, '""').replace(/\n/g, " ");
    csvContent += `"${actionDate}","${trail.user || "-"}","${trail.fromDepartment || "-"}","${trail.toDepartment || "-"}","${getStatusText(trail.status || "-")}","${remarks}"\n`;
  });

  const outName = filename || `document-trail-${documentInfo.code || documentInfo.id}-${new Date().toISOString().split("T")[0]}.csv`;
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", outName);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function exportDocumentTrailsExcel(
  documentInfo: DocumentInfo,
  trails: DocumentTrailDetail[],
  filename?: string
): Promise<void> {
  const { utils, writeFile } = await import("xlsx");

  const infoData: any[] = [
    ["Document Trail History Report"],
    [""],
    ["Document Title", documentInfo.title],
    ["Document Code", documentInfo.code],
    ["Document Type", documentInfo.type],
    ["Classification", documentInfo.classification],
    ["Status", getStatusText(documentInfo.status)],
  ];
  try {
    infoData.push(["Created", format(new Date(documentInfo.createdAt), "MMM d, yyyy h:mm a")]);
  } catch {
    infoData.push(["Created", "-"]);
  }
  infoData.push([""]); // spacer
  infoData.push(["Trail History"]);
  infoData.push(["Action Date", "User", "From Department", "To Department", "Status", "Remarks"]);

  trails.forEach((trail) => {
    let actionDate = trail.actionDate || "-";
    try {
      actionDate = format(new Date(trail.actionDate), "MMM d, yyyy h:mm a");
    } catch {}
    infoData.push([
      actionDate,
      trail.user || "",
      trail.fromDepartment || "",
      trail.toDepartment || "",
      getStatusText(trail.status || ""),
      trail.remarks || "",
    ]);
  });

  const wb = utils.book_new();
  const ws = utils.aoa_to_sheet(infoData);

  // Auto column width: compute max length per column across all rows
  const colCount = Math.max(...infoData.map((r) => r.length));
  const colWidths: { wch: number }[] = [];
  for (let c = 0; c < colCount; c++) {
    let maxLen = 10; // default minimum
    for (let r = 0; r < infoData.length; r++) {
      const cell = infoData[r][c];
      if (cell == null) continue;
      const len = String(cell).length;
      if (len > maxLen) maxLen = len;
    }
    // add small padding
    colWidths.push({ wch: Math.min(Math.max(maxLen + 2, 10), 100) });
  }
  ws["!cols"] = colWidths;

  utils.book_append_sheet(wb, ws, "Document Trail");

  const outName = filename || `document-trail-${documentInfo.code || documentInfo.id}-${new Date().toISOString().split("T")[0]}.xlsx`;
  writeFile(wb, outName);
}

export default exportDocumentTrailsPDF;
