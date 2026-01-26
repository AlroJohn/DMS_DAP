import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';

// Define formatDateTime function here to match the one in the component
const formatDateTime = (dateString: string) => {
  if (!dateString) return { full: 'N/A', date: 'N/A', time: 'N/A' };

  const date = new Date(dateString);

  if (isNaN(date.getTime())) {
    return { full: 'Invalid Date', date: 'Invalid Date', time: 'Invalid Date' };
  }

  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  };

  const full = date.toLocaleString('en-US', options);
  const dateOnly = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  const timeOnly = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  return { full, date: dateOnly, time: timeOnly };
};

// Full Report: Document Report + Routing History combined
export const generateFullReportPDF = async (document: any, trails: any[]) => {
  try {
    const doc = new jsPDF({ format: 'a4', unit: 'mm' });

    const { detail, status, created_at } = document || {};

    const docName = detail?.document_name || 'Document';
    const docCode = detail?.document_code || 'N/A';

    const creatorName = detail?.created_by_account?.user
      ? `${detail.created_by_account.user.first_name || ''} ${detail.created_by_account.user.last_name || ''}`.trim() || 'Unknown'
      : detail?.created_by_account?.email || (document as any)?.created_by || 'Unknown';

    const creatorDept = detail?.department?.name || document?.originating_department?.name || 'N/A';

    const classification = detail?.classification || (document as any)?.classification || 'simple';
    const formattedClassification = classification
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/^\w/, (c: string) => c.toUpperCase());

    const docDate = formatDateTime(created_at || '');

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Load logo
    let logoDataUrl: string | null = null;
    try {
      const logoRes = await fetch('/image/LOGO_BLUE.png');
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
      console.error('Error loading logo image:', error);
    }

    // Place logo centered at top
    const maxLogoW = pageWidth - 28;
    const maxLogoH = 60;
    let logoW = 70;
    let logoH = 35;
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
        logoW = Math.min(110, maxLogoW);
        logoH = logoW / aspect;
        if (logoH > maxLogoH) {
          logoH = maxLogoH;
          logoW = Math.min(logoH * aspect, maxLogoW);
        }
      } catch (e) {
        logoW = Math.min(70, maxLogoW);
        logoH = logoW * 0.5;
      }
      const logoX = (pageWidth - logoW) / 2;
      doc.addImage(logoDataUrl, 'PNG', logoX, logoY, logoW, logoH);
    }

    // Main title
    const titleY = logoDataUrl ? logoY + logoH + 10 : 18;
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text('Full Document Report', 14, titleY);

    // Document info
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    let yPos = titleY + 8;
    const labelWidth = 40;

    doc.text('Document Title:', 14, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(docName, 14 + labelWidth, yPos);

    yPos += 7;
    doc.setFont('helvetica', 'bold');
    doc.text('Document Code:', 14, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(docCode, 14 + labelWidth, yPos);

    // Separator
    yPos += 8;
    doc.setDrawColor(218, 165, 32); // Gold color
    doc.setLineWidth(1);
    doc.line(14, yPos, pageWidth - 14, yPos);

    // Section 1: Document Details
    yPos += 5;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Document Details', 14, yPos);
    yPos += 2;

    // Details table using autoTable
    const detailsData = [
      ['Status', formatText(status || '')],
      ['Classification', formattedClassification],
      ['Created Date', docDate.full || ''],
      ['Department', creatorDept],
      ['Created By', creatorName],
    ];

    (doc as any).autoTable({
      body: detailsData,
      startY: yPos + 3,
      margin: { left: 14, right: 14, bottom: 25 },
      styles: {
        fontSize: 9,
        cellPadding: 3,
        lineColor: [180, 180, 180],
        lineWidth: 0.1,
        textColor: [0, 0, 0],
      },
      columnStyles: {
        0: { cellWidth: 40, fontStyle: 'bold', fillColor: [255, 252, 240] },
        1: { cellWidth: 'auto' },
      },
      theme: 'grid',
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;

    // Section 2: Document Routing History
    // Check if we need a new page
    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Document Routing History', 14, yPos);
    yPos += 5;

    // Separator
    doc.setDrawColor(218, 165, 32);
    doc.setLineWidth(1);
    doc.line(14, yPos, pageWidth - 14, yPos);
    yPos += 5;

    // Routing trails
    if (trails && trails.length > 0) {
      trails.forEach((trail: any, index: number) => {
        // Check if we need a new page
        if (yPos > pageHeight - 45) {
          doc.addPage();
          yPos = 20;
        }

        const datetime = formatDateTime(trail.action_date || '');
        const statusName = formatText(trail.status || '');

        // Status header
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(statusName, 14, yPos);
        yPos += 6;

        // Trail details table
        const trailData = [
          ['Date:', datetime.full || 'N/A'],
          ['From:', trail.fromDept?.name || 'N/A'],
          ['To:', trail.toDept?.name || 'N/A'],
          ['Performed By:', trail.user ? `${trail.user.first_name} ${trail.user.last_name}` : 'System'],
          ['Remarks:', trail.remarks || '']
        ];

        (doc as any).autoTable({
          body: trailData,
          startY: yPos,
          margin: { left: 14, right: 14, bottom: 25 },
          styles: {
            fontSize: 9,
            cellPadding: 3,
            lineColor: [180, 180, 180],
            lineWidth: 0.1,
            textColor: [0, 0, 0],
          },
          columnStyles: {
            0: { cellWidth: 40, fontStyle: 'bold', fillColor: [255, 252, 240] },
            1: { cellWidth: 'auto' },
          },
          theme: 'grid',
        });

        yPos = (doc as any).lastAutoTable.finalY + 8;
      });
    } else {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('No routing history available', 14, yPos);
    }

    // Add footer to all pages
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      const footerHeight = 20;
      const footerY = pageHeight - footerHeight;

      // Blue footer background
      doc.setFillColor(30, 58, 138);
      doc.rect(0, footerY, pageWidth, footerHeight, 'F');

      // Thin gold stripe at bottom with gap
      doc.setFillColor(218, 165, 32);
      const stripeHeightMm = 1;
      const gapBelowPx = 12;
      const pxToMm = 25.4 / 96;
      const gapBelowMm = gapBelowPx * pxToMm;
      const stripeY = pageHeight - gapBelowMm - stripeHeightMm;
      const stripeYClamped = Math.max(0, stripeY);
      doc.rect(0, stripeYClamped, pageWidth, stripeHeightMm, 'F');

      // Footer text (white)
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'normal');
      const generatedText = `Generated on: ${format(new Date(), 'M/d/yyyy, h:mm:ss a')}`;
      const systemText = 'Document Tracking Management System';
      doc.text(generatedText, pageWidth / 2, footerY + 8, { align: 'center' });
      doc.text(systemText, pageWidth / 2, footerY + 13, { align: 'center' });

      // Page number (bottom right)
      const pageNumber = `${i}/${totalPages}`;
      doc.text(pageNumber, pageWidth - 14, footerY + 13, { align: 'right' });
    }

    // Save file
    doc.save(`full-report-${document.document_id || 'report'}.pdf`);
  } catch (error) {
    console.error('Error generating full report PDF:', error);
    alert(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const generateDocumentPDF = async (document: any) => {
  try {
    const doc = new jsPDF({ format: 'a4', unit: 'mm' });

    const { detail, status, created_at, document_logs = [], document_trails = [] } = document || {};

    const docName = detail?.document_name || 'Document';
    const docCode = detail?.document_code || 'N/A';

    const creatorName = detail?.created_by_account?.user
      ? `${detail.created_by_account.user.first_name || ''} ${detail.created_by_account.user.last_name || ''}`.trim() || 'Unknown'
      : detail?.created_by_account?.email || (document as any)?.created_by || 'Unknown';

    const creatorDept = detail?.department?.name || document?.originating_department?.name || 'N/A';

    const classification = detail?.classification || (document as any)?.classification || 'simple';
    const formattedClassification = classification
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/^\w/, (c: string) => c.toUpperCase());

    const docDate = formatDateTime(created_at || '');

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Load logo
    let logoDataUrl: string | null = null;
    try {
      const logoRes = await fetch('/image/LOGO_BLUE.png');
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
      console.error('Error loading logo image:', error);
    }

    // Place logo centered at top
    const maxLogoW = pageWidth - 28;
    const maxLogoH = 60;
    let logoW = 70;
    let logoH = 35;
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
        logoW = Math.min(110, maxLogoW);
        logoH = logoW / aspect;
        if (logoH > maxLogoH) {
          logoH = maxLogoH;
          logoW = Math.min(logoH * aspect, maxLogoW);
        }
      } catch (e) {
        logoW = Math.min(70, maxLogoW);
        logoH = logoW * 0.5;
      }
      const logoX = (pageWidth - logoW) / 2;
      doc.addImage(logoDataUrl, 'PNG', logoX, logoY, logoW, logoH);
    }

    // Main title
    const titleY = logoDataUrl ? logoY + logoH + 10 : 18;
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text('Document Report', 14, titleY);

    // Document info
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    let yPos = titleY + 8;
    const labelWidth = 40;

    doc.text('Document Title:', 14, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(docName, 14 + labelWidth, yPos);

    yPos += 7;
    doc.setFont('helvetica', 'bold');
    doc.text('Document Code:', 14, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(docCode, 14 + labelWidth, yPos);

    // Separator
    yPos += 8;
    doc.setDrawColor(218, 165, 32); // Gold color
    doc.setLineWidth(1);
    doc.line(14, yPos, pageWidth - 14, yPos);

    // Details table using autoTable
    const detailsData = [
      ['Status', formatText(status || '')],
      ['Classification', formattedClassification],
      ['Created Date', docDate.full || ''],
      ['Department', creatorDept],
      ['Created By', creatorName],
    ];

    (doc as any).autoTable({
      body: detailsData,
      startY: yPos + 3,
      margin: { left: 14, right: 14, bottom: 25 },
      styles: {
        fontSize: 9,
        cellPadding: 3,
        lineColor: [180, 180, 180],
        lineWidth: 0.1,
        textColor: [0, 0, 0],
      },
      columnStyles: {
        0: { cellWidth: 40, fontStyle: 'bold', fillColor: [255, 252, 240] },
        1: { cellWidth: 'auto' },
      },
      theme: 'grid',
    });

    // Add footer to all pages
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      const footerHeight = 20;
      const footerY = pageHeight - footerHeight;

      // Blue footer background
      doc.setFillColor(30, 58, 138);
      doc.rect(0, footerY, pageWidth, footerHeight, 'F');

      // Thin gold stripe at bottom with gap
      doc.setFillColor(218, 165, 32);
      const stripeHeightMm = 1;
      const gapBelowPx = 12;
      const pxToMm = 25.4 / 96;
      const gapBelowMm = gapBelowPx * pxToMm;
      const stripeY = pageHeight - gapBelowMm - stripeHeightMm;
      const stripeYClamped = Math.max(0, stripeY);
      doc.rect(0, stripeYClamped, pageWidth, stripeHeightMm, 'F');

      // Footer text (white)
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'normal');
      const generatedText = `Generated on: ${format(new Date(), 'M/d/yyyy, h:mm:ss a')}`;
      const systemText = 'Document Tracking Management System';
      doc.text(generatedText, pageWidth / 2, footerY + 8, { align: 'center' });
      doc.text(systemText, pageWidth / 2, footerY + 13, { align: 'center' });

      // Page number (bottom right)
      const pageNumber = `${i}/${totalPages}`;
      doc.text(pageNumber, pageWidth - 14, footerY + 13, { align: 'right' });
    }

    // Save file
    doc.save(`document-${(document as any).document_id || 'report'}.pdf`);
  } catch (error) {
    console.error('Error generating PDF:', error);
    alert(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Define DocumentData type
export interface DocumentData {
  detail?: {
    document_name?: string;
    document_code?: string;
    classification?: string;
    department?: {
      name?: string;
    };
    created_by_account?: {
      user?: {
        first_name?: string;
        last_name?: string;
      };
      email?: string;
    };
  };
  status?: string;
  created_at?: string;
  originating_department?: {
    name?: string;
  };
  files?: Array<any>;
  document_logs?: Array<any>;
  document_trails?: Array<any>;
  document_id?: string;
  tracking_code?: string;
  barcode?: string;
}

const formatText = (text: string | undefined): string => {
  if (!text) return '';
  return text
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/^\w/, (c: string) => c.toUpperCase());
};

export const exportToCSV = (doc: DocumentData) => {
  const { detail, status, created_at, document_logs = [] } = doc || {};

  const header = [
    'Document Name',
    'Document Code',
    'Status',
    'Classification',
    'Created Date',
    'Created By',
    'Department'
  ].join(',');

  const docName = detail?.document_name?.replace(/,/g, '') || 'Document';
  const docCode = detail?.document_code?.replace(/,/g, '') || 'N/A';
  const classification = detail?.classification || (doc as any)?.classification || "simple";
  const formattedClassification = classification
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/^\w/, (c: string) => c.toUpperCase());

  const creatorName = detail?.created_by_account?.user
    ? `${detail.created_by_account.user.first_name || ""} ${detail.created_by_account.user.last_name || ""}`.trim() || "Unknown"
    : detail?.created_by_account?.email || (doc as any)?.created_by || "Unknown";

  const creatorDept = detail?.department?.name || doc?.originating_department?.name || "N/A";
  const docDate = formatDateTime(created_at || '').full;

  const metadata = [
    `"${docName}"`,
    `"${docCode}"`,
    `"${status}"`,
    `"${formattedClassification}"`,
    `"${docDate}"`,
    `"${creatorName}"`,
    `"${creatorDept}"`
  ].join(',');

  const csvContent = [header, metadata].join('\n');

  let fileMetadataSection = '';
  if (doc.files && doc.files.length > 0) {
    fileMetadataSection = '\n\n"File Metadata","","","","","",""\n';
    doc.files.forEach((file: any, index: number) => {
      fileMetadataSection += `"\nFile ${index + 1}: ${file.original_name || 'Unnamed'}"\n`;
      if (file.DocumentMetadata) {
        const meta = file.DocumentMetadata;
        if (meta.file_type) fileMetadataSection += `"File Type","${meta.file_type}"\n`;
        if (meta.mime_type) fileMetadataSection += `"MIME Type","${meta.mime_type}"\n`;
        if (meta.author) fileMetadataSection += `"Author","${meta.author}"\n`;
        if (meta.creator) fileMetadataSection += `"Creator","${meta.creator}"\n`;
        if (meta.producer) fileMetadataSection += `"Producer","${meta.producer}"\n`;
        if (meta.creation_date) fileMetadataSection += `"Creation Date","${formatDateTime(meta.creation_date || '').date}"\n`;
        if (meta.modification_date) fileMetadataSection += `"Modification Date","${formatDateTime(meta.modification_date || '').date}"\n`;
        if (meta.security_level) fileMetadataSection += `"Security Level","${meta.security_level}"\n`;
        if (meta.retention_period) fileMetadataSection += `"Retention Period","${meta.retention_period} days"\n`;
        if (meta.is_encrypted !== undefined) fileMetadataSection += `"Encrypted","${meta.is_encrypted ? 'Yes' : 'No'}"\n`;
        if (meta.version) fileMetadataSection += `"Version","${meta.version}"\n`;
        if (meta.checksum) fileMetadataSection += `"Checksum","${meta.checksum}"\n`;
      } else {
        fileMetadataSection += `"No metadata available"\n`;
      }
    });
  }

  if (document_logs.length > 0) {
    const logsHeader = '\n\n"Document Logs","","","","","",""\n';
    const logsColumns = '"Action","Date","By","Remarks"\n';

    const logsRows = document_logs.map(log => {
      const action = formatText(log.action || '').replace(/"/g, '""');
      const date = formatDateTime(log.performed_at || '').full;
      const performer = log.performed_by_user
        ? `${log.performed_by_user.first_name} ${log.performed_by_user.last_name}`.replace(/"/g, '""')
        : '';
      const remarks = log.remarks?.replace(/"/g, '""') || '';

      return `"${action}","${date}","${performer}","${remarks}"`;
    }).join('\n');

    return csvContent + fileMetadataSection + logsHeader + logsColumns + logsRows;
  }

  return csvContent + fileMetadataSection;
};

export const downloadCSV = (doc: DocumentData) => {
  const csvContent = exportToCSV(doc);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const filename = `${doc.detail?.document_name || 'document'}-export.csv`;
  const link = document.createElement('a');

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export const downloadExcel = (doc: DocumentData) => {
  const csvContent = exportToCSV(doc);
  const blob = new Blob([csvContent], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=utf-8;' });
  const filename = `${doc.detail?.document_name || 'document'}-export.xlsx`;
  const link = document.createElement('a');

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export const exportRoutingHistoryToCSV = (doc: DocumentData, trails: any[]) => {
  const header = [
    'Status',
    'Action Date',
    'From Department',
    'To Department',
    'Performed By',
    'Action Type',
    'Remarks'
  ].join(',');

  const rows = trails.map((trail: any) => {
    const datetime = formatDateTime(trail.action_date || '').full;
    const statusName = formatText(trail.status || '');
    const fromDept = trail.fromDept?.name || '';
    const toDept = trail.toDept?.name || '';
    const performedBy = trail.user
      ? `${trail.user.first_name} ${trail.user.last_name}`.replace(/"/g, '""')
      : 'System';
    const actionType = trail.documentAction?.action_name?.replace(/"/g, '""') || '';
    const remarks = trail.remarks?.replace(/"/g, '""') || '';

    return `"${statusName}","${datetime}","${fromDept}","${toDept}","${performedBy}","${actionType}","${remarks}"`;
  }).join('\n');

  return [header, rows].join('\n');
};

export const downloadRoutingHistoryCSV = (doc: DocumentData, trails: any[]) => {
  const csvContent = exportRoutingHistoryToCSV(doc, trails);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const filename = `${doc.detail?.document_name || 'document'}-routing-history.csv`;
  const link = document.createElement('a');

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export const exportRoutingHistoryPDF = async (document: any, trails: any[]) => {
  try {
    const doc = new jsPDF({ format: 'a4', unit: 'mm' });

    const { detail } = document || {};
    const docName = detail?.document_name || 'Document';
    const docCode = detail?.document_code || 'N/A';

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Load logo
    let logoDataUrl: string | null = null;
    try {
      const logoRes = await fetch('/image/LOGO_BLUE.png');
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
      console.error('Error loading logo image:', error);
    }

    // Place logo centered at top
    const maxLogoW = pageWidth - 28;
    const maxLogoH = 60;
    let logoW = 70;
    let logoH = 35;
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
        logoW = Math.min(110, maxLogoW);
        logoH = logoW / aspect;
        if (logoH > maxLogoH) {
          logoH = maxLogoH;
          logoW = Math.min(logoH * aspect, maxLogoW);
        }
      } catch (e) {
        logoW = Math.min(70, maxLogoW);
        logoH = logoW * 0.5;
      }
      const logoX = (pageWidth - logoW) / 2;
      doc.addImage(logoDataUrl, 'PNG', logoX, logoY, logoW, logoH);
    }

    // Main title
    const titleY = logoDataUrl ? logoY + logoH + 10 : 18;
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text('Document Routing History', 14, titleY);

    // Document info
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    let yPos = titleY + 8;
    const labelWidth = 40;

    doc.text('Document Title:', 14, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(docName, 14 + labelWidth, yPos);

    yPos += 7;
    doc.setFont('helvetica', 'bold');
    doc.text('Document Code:', 14, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(docCode, 14 + labelWidth, yPos);

    // Separator
    yPos += 8;
    doc.setDrawColor(218, 165, 32); // Gold color
    doc.setLineWidth(1);
    doc.line(14, yPos, pageWidth - 14, yPos);
    yPos += 5;

    // Routing trails
    if (trails && trails.length > 0) {
      trails.forEach((trail: any, index: number) => {
        // Check if we need a new page
        if (yPos > pageHeight - 45) {
          doc.addPage();
          yPos = 20;
        }

        const datetime = formatDateTime(trail.action_date || '');
        const statusName = formatText(trail.status || '');

        // Status header
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(statusName, 14, yPos);
        yPos += 6;

        // Trail details table
        const trailData = [
          ['Date:', datetime.full || 'N/A'],
          ['From:', trail.fromDept?.name || 'N/A'],
          ['To:', trail.toDept?.name || 'N/A'],
          ['Performed By:', trail.user ? `${trail.user.first_name} ${trail.user.last_name}` : 'System'],
          ['Remarks:', trail.remarks || '']
        ];

        (doc as any).autoTable({
          body: trailData,
          startY: yPos,
          margin: { left: 14, right: 14, bottom: 25 },
          styles: {
            fontSize: 9,
            cellPadding: 3,
            lineColor: [180, 180, 180],
            lineWidth: 0.1,
            textColor: [0, 0, 0],
          },
          columnStyles: {
            0: { cellWidth: 40, fontStyle: 'bold', fillColor: [255, 252, 240] },
            1: { cellWidth: 'auto' },
          },
          theme: 'grid',
        });

        yPos = (doc as any).lastAutoTable.finalY + 8;
      });
    } else {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('No routing history available', 14, yPos);
    }

    // Add footer to all pages
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      const footerHeight = 20;
      const footerY = pageHeight - footerHeight;

      // Blue footer background
      doc.setFillColor(30, 58, 138);
      doc.rect(0, footerY, pageWidth, footerHeight, 'F');

      // Thin gold stripe at bottom with gap
      doc.setFillColor(218, 165, 32);
      const stripeHeightMm = 1;
      const gapBelowPx = 12;
      const pxToMm = 25.4 / 96;
      const gapBelowMm = gapBelowPx * pxToMm;
      const stripeY = pageHeight - gapBelowMm - stripeHeightMm;
      const stripeYClamped = Math.max(0, stripeY);
      doc.rect(0, stripeYClamped, pageWidth, stripeHeightMm, 'F');

      // Footer text (white)
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'normal');
      const generatedText = `Generated on: ${format(new Date(), 'M/d/yyyy, h:mm:ss a')}`;
      const systemText = 'Document Tracking Management System';
      doc.text(generatedText, pageWidth / 2, footerY + 8, { align: 'center' });
      doc.text(systemText, pageWidth / 2, footerY + 13, { align: 'center' });

      // Page number (bottom right)
      const pageNumber = `${i}/${totalPages}`;
      doc.text(pageNumber, pageWidth - 14, footerY + 13, { align: 'right' });
    }

    // Download instead of print
    doc.save(`routing-history-${(document as any).document_id || 'report'}.pdf`);
  } catch (error) {
    console.error('Error generating routing history PDF:', error);
    alert(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Version History Exports
export const generateVersionHistoryPDF = async (document: any) => {
  try {
    const doc = new jsPDF({ format: 'a4', unit: 'mm' });

    const { detail, files = [] } = document || {};

    const docName = detail?.document_name || 'Document';
    const docCode = detail?.document_code || 'N/A';

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Load logo
    let logoDataUrl: string | null = null;
    try {
      const logoRes = await fetch('/image/LOGO_BLUE.png');
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
      console.error('Error loading logo image:', error);
    }

    // Place logo centered at top
    const maxLogoW = pageWidth - 28;
    const maxLogoH = 60;
    let logoW = 70;
    let logoH = 35;
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
        logoW = Math.min(110, maxLogoW);
        logoH = logoW / aspect;
        if (logoH > maxLogoH) {
          logoH = maxLogoH;
          logoW = Math.min(logoH * aspect, maxLogoW);
        }
      } catch (e) {
        logoW = Math.min(70, maxLogoW);
        logoH = logoW * 0.5;
      }
      const logoX = (pageWidth - logoW) / 2;
      doc.addImage(logoDataUrl, 'PNG', logoX, logoY, logoW, logoH);
    }

    // Main title
    const titleY = logoDataUrl ? logoY + logoH + 10 : 18;
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text('Document History', 14, titleY);

    // Document info
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    let yPos = titleY + 8;
    const labelWidth = 40;

    doc.text('Document Title:', 14, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(docName, 14 + labelWidth, yPos);

    yPos += 7;
    doc.setFont('helvetica', 'bold');
    doc.text('Document Code:', 14, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(docCode, 14 + labelWidth, yPos);

    // Separator
    yPos += 8;
    doc.setDrawColor(218, 165, 32); // Gold color
    doc.setLineWidth(1);
    doc.line(14, yPos, pageWidth - 14, yPos);

    // Version history table using autoTable
    if (files && files.length > 0) {
      const sortedFiles = [...files].sort((a: any, b: any) => {
        const aParts = a.version?.split(".").map(Number) || [0, 0];
        const bParts = b.version?.split(".").map(Number) || [0, 0];
        if (aParts[0] !== bParts[0]) return bParts[0] - aParts[0];
        return bParts[1] - aParts[1];
      });

      const versionData = sortedFiles.map((file: any, index: number) => {
        const isCurrent = index === 0;
        const uploadedBy = file.uploaded_by_account?.user
          ? `${file.uploaded_by_account.user.first_name} ${file.uploaded_by_account.user.last_name}`
          : 'System';
        const uploadDate = file.uploadDate ? formatDateTime(file.uploadDate).full : 'N/A';
        const fileSize = file.file_size ? `${Math.round(file.file_size / 1024)} KB` : 'N/A';
        const status = isCurrent ? 'Current' : 'Previous';

        return [
          `v${file.version || 'N/A'}`,
          file.original_name || 'N/A',
          uploadDate,
          uploadedBy,
          fileSize,
          status
        ];
      });

      (doc as any).autoTable({
        head: [['Version', 'File Name', 'Upload Date', 'Uploaded By', 'Size', 'Status']],
        body: versionData,
        startY: yPos + 3,
        margin: { left: 14, right: 14, bottom: 25 },
        styles: {
          fontSize: 8,
          cellPadding: 2,
          lineColor: [180, 180, 180],
          lineWidth: 0.1,
          textColor: [0, 0, 0],
        },
        headStyles: {
          fillColor: [30, 58, 138],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 'auto' },
          2: { cellWidth: 35 },
          3: { cellWidth: 30 },
          4: { cellWidth: 20 },
          5: { cellWidth: 20 },
        },
        theme: 'grid',
      });
    } else {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('No version history available', 14, yPos + 10);
    }

    // Add footer to all pages
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      const footerHeight = 20;
      const footerY = pageHeight - footerHeight;

      // Blue footer background
      doc.setFillColor(30, 58, 138);
      doc.rect(0, footerY, pageWidth, footerHeight, 'F');

      // Thin gold stripe at bottom with gap
      doc.setFillColor(218, 165, 32);
      const stripeHeightMm = 1;
      const gapBelowPx = 12;
      const pxToMm = 25.4 / 96;
      const gapBelowMm = gapBelowPx * pxToMm;
      const stripeY = pageHeight - gapBelowMm - stripeHeightMm;
      const stripeYClamped = Math.max(0, stripeY);
      doc.rect(0, stripeYClamped, pageWidth, stripeHeightMm, 'F');

      // Footer text (white)
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'normal');
      const generatedText = `Generated on: ${format(new Date(), 'M/d/yyyy, h:mm:ss a')}`;
      const systemText = 'Document Tracking Management System';
      doc.text(generatedText, pageWidth / 2, footerY + 8, { align: 'center' });
      doc.text(systemText, pageWidth / 2, footerY + 13, { align: 'center' });

      // Page number (bottom right)
      const pageNumber = `${i}/${totalPages}`;
      doc.text(pageNumber, pageWidth - 14, footerY + 13, { align: 'right' });
    }

    // Save file
    doc.save(`document-history-${document.document_id || 'report'}.pdf`);
  } catch (error) {
    console.error('Error generating version history PDF:', error);
    alert(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const exportVersionHistoryToCSV = (document: any) => {
  const { detail, files = [] } = document || {};

  const header = [
    'Version',
    'File Name',
    'Upload Date',
    'Uploaded By',
    'File Size',
    'MIME Type',
    'Is Primary',
    'Status'
  ].join(',');

  const sortedFiles = [...files].sort((a: any, b: any) => {
    const aParts = a.version?.split(".").map(Number) || [0, 0];
    const bParts = b.version?.split(".").map(Number) || [0, 0];
    if (aParts[0] !== bParts[0]) return bParts[0] - aParts[0];
    return bParts[1] - aParts[1];
  });

  const rows = sortedFiles.map((file: any, index: number) => {
    const isCurrent = index === 0;
    const uploadedBy = file.uploaded_by_account?.user
      ? `${file.uploaded_by_account.user.first_name} ${file.uploaded_by_account.user.last_name}`.replace(/"/g, '""')
      : 'System';
    const uploadDate = file.uploadDate ? formatDateTime(file.uploadDate).full : 'N/A';
    const fileSize = file.file_size ? `${Math.round(file.file_size / 1024)} KB` : 'N/A';
    const status = isCurrent ? 'Current' : 'Previous';
    const fileName = (file.original_name || 'N/A').replace(/"/g, '""');

    return `"v${file.version || 'N/A'}","${fileName}","${uploadDate}","${uploadedBy}","${fileSize}","${file.mime_type || 'N/A'}","${file.is_primary ? 'Yes' : 'No'}","${status}"`;
  }).join('\n');

  return [header, rows].join('\n');
};

export const downloadVersionHistoryCSV = (document: any) => {
  const csvContent = exportVersionHistoryToCSV(document);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const filename = `${document.detail?.document_name || 'document'}-history.csv`;
  const link = document.createElement('a');

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export const downloadVersionHistoryExcel = (document: any) => {
  const csvContent = exportVersionHistoryToCSV(document);
  const blob = new Blob([csvContent], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=utf-8;' });
  const filename = `${document.detail?.document_name || 'document'}-history.xlsx`;
  const link = document.createElement('a');

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};