// Define formatDateTime function here to match the one in the component
const formatDateTime = (dateString: string) => {
  try {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      time: date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      full: date.toLocaleString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  } catch {
    return { date: "Invalid Date", time: "", full: "Invalid Date" };
  }
};

export interface DocumentLog {
  id?: string;
  action: string;
  performed_at: string;
  remarks?: string;
  performed_by_user?: {
    first_name: string;
    last_name: string;
  };
}

export interface DocumentData {
  document_id?: string;
  tracking_code?: string;
  status: string;
  created_at: string;
  detail: {
    document_code: string;
    document_name: string;
    classification: string;
    origin?: string;
    delivery?: string;
    created_by?: string;
    document_type?: {
      name: string;
    };
    department?: {
      name: string;
    };
    created_by_account: {
      email: string;
      user?: {
        first_name: string;
        last_name: string;
      };
    };
  };
  current_department?: {
    name: string;
  };
  originating_department?: {
    name: string;
  };
  document_logs?: DocumentLog[];
  document_trails?: any[];
  qrCode?: string;
  barcode?: string;
  blockchain?: {
    status?: string | null;
    projectUuid?: string | null;
    transactionHash?: string | null;
    redirectUrl?: string | null;
    signedAt?: string | null;
    signedBy?: string | null;
  };
  title?: string;
  document_code?: string;
  classification?: string;
}

// Declare jsPDF type - check multiple possible locations
declare global {
  interface Window {
    jspdf?: {
      jsPDF: any;
    };
    jsPDF?: any;
  }
}

const getJsPDF = () => {
  // Try different ways jsPDF might be loaded
  if (typeof window !== 'undefined') {
    if (window.jspdf && window.jspdf.jsPDF) {
      return window.jspdf.jsPDF;
    }
    if (window.jsPDF) {
      return window.jsPDF;
    }
    // Try requiring if it's available
    try {
      const jsPDF = require('jspdf');
      return jsPDF.jsPDF || jsPDF;
    } catch (e) {
      console.error('jsPDF not found');
    }
  }
  return null;
};

export const generateDocumentPDF = (document: any) => {
  try {
    const jsPDF = getJsPDF();
    
    if (!jsPDF) {
      alert('PDF library not loaded. Please refresh the page and try again.');
      console.error('jsPDF is not available. Make sure the library is properly loaded.');
      return;
    }

    const doc = new jsPDF();

    const { detail, status, created_at, document_logs = [], document_trails = [] } = document || {};
    
    const docName = detail?.document_name || 'Document';
    const docCode = detail?.document_code || 'N/A';
    
    // Get document creator information
    const creatorName = detail?.created_by_account?.user
      ? `${detail.created_by_account.user.first_name || ""} ${detail.created_by_account.user.last_name || ""}`.trim() || "Unknown"
      : detail?.created_by_account?.email || detail?.created_by || "Unknown";
    
    const creatorDept = detail?.department?.name || document?.originating_department?.name || "N/A";
    
    // Format classification
    const classification = detail?.classification || (document as any)?.classification || "simple";
    const formattedClassification = classification
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/^\w/, (c: string) => c.toUpperCase());

    const docDate = formatDateTime(created_at);

    let yPos = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);

    // Header
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text('Document Report', pageWidth / 2, yPos, { align: 'center' });
    
    yPos += 10;
    doc.setFontSize(16);
    doc.text(docName, pageWidth / 2, yPos, { align: 'center' });
    
    yPos += 8;
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.text(`Document Code: ${docCode}`, pageWidth / 2, yPos, { align: 'center' });
    
    yPos += 15;
    doc.setDrawColor(229, 231, 235);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 10;

    // Document Details
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    
    const addField = (label: string, value: string) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFont(undefined, 'bold');
      doc.text(`${label}:`, margin, yPos);
      doc.setFont(undefined, 'normal');
      doc.text(value, margin + 50, yPos);
      yPos += 7;
    };

    addField('Status', formatText(status));
    addField('Classification', formattedClassification);
    addField('Created Date', docDate.full);
    addField('Department', creatorDept);
    addField('Created By', creatorName);

    // File Metadata
    if ((document as any)?.files && (document as any).files.length > 0) {
      yPos += 5;
      doc.setFont(undefined, 'bold');
      doc.setFontSize(12);
      doc.text('Document File Metadata', margin, yPos);
      yPos += 7;
      doc.setFontSize(10);

      (document as any).files.forEach((file: any, index: number) => {
        if (yPos > 260) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFont(undefined, 'bold');
        doc.text(`File ${index + 1}: ${file.original_name || 'Unnamed File'}`, margin, yPos);
        yPos += 6;
        doc.setFont(undefined, 'normal');

        const metadata = file.DocumentMetadata;
        if (metadata) {
          if (metadata.file_type) addField('  File Type', metadata.file_type);
          if (metadata.mime_type) addField('  MIME Type', metadata.mime_type);
          if (metadata.author) addField('  Author', metadata.author);
          if (metadata.creator) addField('  Creator', metadata.creator);
          if (metadata.producer) addField('  Producer', metadata.producer);
          if (metadata.creation_date) addField('  Creation Date', formatDateTime(metadata.creation_date).date);
          if (metadata.modification_date) addField('  Modification Date', formatDateTime(metadata.modification_date).date);
          if (metadata.security_level) addField('  Security Level', metadata.security_level);
          if (metadata.retention_period) addField('  Retention Period', `${metadata.retention_period} days`);
          if (metadata.is_encrypted !== undefined) addField('  Encrypted', metadata.is_encrypted ? 'Yes' : 'No');
          if (metadata.version) addField('  Version', metadata.version);
        } else {
          doc.text('  No metadata available', margin, yPos);
          yPos += 7;
        }
        yPos += 3;
      });
    }

    // Document History
    if (document_logs.length > 0) {
      yPos += 5;
      if (yPos > 260) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFont(undefined, 'bold');
      doc.setFontSize(12);
      doc.text('Document History', margin, yPos);
      yPos += 7;
      doc.setFontSize(10);

      document_logs.forEach((log: any) => {
        if (yPos > 260) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFont(undefined, 'bold');
        doc.text(`${formatText(log.action)}`, margin, yPos);
        yPos += 6;
        doc.setFont(undefined, 'normal');
        
        doc.text(`Date: ${formatDateTime(log.performed_at).full}`, margin + 5, yPos);
        yPos += 6;
        
        if (log.performed_by_user) {
          doc.text(`By: ${log.performed_by_user.first_name} ${log.performed_by_user.last_name}`, margin + 5, yPos);
          yPos += 6;
        }
        
        if (log.remarks) {
          const remarks = doc.splitTextToSize(`Remarks: ${log.remarks}`, contentWidth - 10);
          doc.text(remarks, margin + 5, yPos);
          yPos += (remarks.length * 6);
        }
        
        yPos += 3;
      });
    }

    // Document Routing History
    if (document_trails.length > 0) {
      yPos += 5;
      if (yPos > 260) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFont(undefined, 'bold');
      doc.setFontSize(12);
      doc.text('Document Routing History', margin, yPos);
      yPos += 7;
      doc.setFontSize(10);

      document_trails.forEach((trail: any) => {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }

        const datetime = formatDateTime(trail.action_date);
        const statusName = formatText(trail.status);

        doc.setFont(undefined, 'bold');
        doc.text(`${statusName}`, margin, yPos);
        yPos += 6;
        doc.setFont(undefined, 'normal');
        
        doc.text(`Date: ${datetime.full}`, margin + 5, yPos);
        yPos += 6;

        if (trail.fromDept && trail.toDept) {
          doc.text(`From: ${trail.fromDept.name}  To: ${trail.toDept.name}`, margin + 5, yPos);
          yPos += 6;
        }

        if (trail.user) {
          doc.text(`Performed By: ${trail.user.first_name} ${trail.user.last_name}`, margin + 5, yPos);
          yPos += 6;
        }

        if (trail.documentAction) {
          doc.text(`Action: ${trail.documentAction.action_name}`, margin + 5, yPos);
          yPos += 6;
        }

        if (trail.remarks) {
          const remarks = doc.splitTextToSize(`Remarks: ${trail.remarks}`, contentWidth - 10);
          doc.text(remarks, margin + 5, yPos);
          yPos += (remarks.length * 6);
        }

        yPos += 3;
      });
    }

    // Footer
    const pageCount = doc.internal.pages.length - 1;
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.text(
        `Generated on ${new Date().toLocaleString()}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 15,
        { align: 'center' }
      );
      doc.text(
        'Document Management System - Ateneo de Manila University',
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }

    // Download instead of print
    doc.save(`document-${document.document_id || 'report'}.pdf`);
  } catch (error) {
    console.error('Error generating PDF:', error);
    alert(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

const formatText = (text: string): string => {
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
    : detail?.created_by_account?.email || detail?.created_by || "Unknown";

  const creatorDept = detail?.department?.name || doc?.originating_department?.name || "N/A";
  const docDate = formatDateTime(created_at).full;
  
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
  if ((doc as any)?.files && (doc as any).files.length > 0) {
    fileMetadataSection = '\n\n"File Metadata","","","","","",""\n';
    (doc as any).files.forEach((file: any, index: number) => {
      fileMetadataSection += `"\nFile ${index + 1}: ${file.original_name || 'Unnamed'}"\n`;
      if (file.DocumentMetadata) {
        const meta = file.DocumentMetadata;
        if (meta.file_type) fileMetadataSection += `"File Type","${meta.file_type}"\n`;
        if (meta.mime_type) fileMetadataSection += `"MIME Type","${meta.mime_type}"\n`;
        if (meta.author) fileMetadataSection += `"Author","${meta.author}"\n`;
        if (meta.creator) fileMetadataSection += `"Creator","${meta.creator}"\n`;
        if (meta.producer) fileMetadataSection += `"Producer","${meta.producer}"\n`;
        if (meta.creation_date) fileMetadataSection += `"Creation Date","${formatDateTime(meta.creation_date).date}"\n`;
        if (meta.modification_date) fileMetadataSection += `"Modification Date","${formatDateTime(meta.modification_date).date}"\n`;
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
      const action = formatText(log.action).replace(/"/g, '""');
      const date = formatDateTime(log.performed_at).full;
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
    const datetime = formatDateTime(trail.action_date).full;
    const statusName = formatText(trail.status);
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

export const exportRoutingHistoryPDF = (document: any, trails: any[]) => {
  try {
    const jsPDF = getJsPDF();
    
    if (!jsPDF) {
      alert('PDF library not loaded. Please refresh the page and try again.');
      console.error('jsPDF is not available. Make sure the library is properly loaded.');
      return;
    }

    const doc = new jsPDF();

    const docName = document.detail?.document_name || 'Document';
    const docCode = document.detail?.document_code || 'N/A';

    let yPos = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);

    // Header
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text('Document Routing Report', pageWidth / 2, yPos, { align: 'center' });
    
    yPos += 10;
    doc.setFontSize(16);
    doc.text(docName, pageWidth / 2, yPos, { align: 'center' });
    
    yPos += 8;
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.text(`Document Code: ${docCode}`, pageWidth / 2, yPos, { align: 'center' });
    
    yPos += 15;
    doc.setDrawColor(229, 231, 235);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 10;

    // Routing History
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Document Routing History', margin, yPos);
    yPos += 7;
    doc.setFontSize(10);

    trails.forEach((trail: any) => {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      const datetime = formatDateTime(trail.action_date);
      const statusName = formatText(trail.status);

      doc.setFont(undefined, 'bold');
      doc.text(`${statusName}`, margin, yPos);
      yPos += 6;
      doc.setFont(undefined, 'normal');
      
      doc.text(`Date: ${datetime.full}`, margin + 5, yPos);
      yPos += 6;

      if (trail.fromDept && trail.toDept) {
        doc.text(`From: ${trail.fromDept.name}  To: ${trail.toDept.name}`, margin + 5, yPos);
        yPos += 6;
      }

      if (trail.user) {
        doc.text(`Performed By: ${trail.user.first_name} ${trail.user.last_name}`, margin + 5, yPos);
        yPos += 6;
      }

      if (trail.documentAction) {
        doc.text(`Action: ${trail.documentAction.action_name}`, margin + 5, yPos);
        yPos += 6;
      }

      if (trail.remarks) {
        const remarks = doc.splitTextToSize(`Remarks: ${trail.remarks}`, contentWidth - 10);
        doc.text(remarks, margin + 5, yPos);
        yPos += (remarks.length * 6);
      }

      yPos += 3;
    });

    // Footer
    const pageCount = doc.internal.pages.length - 1;
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.text(
        `Generated on ${new Date().toLocaleString()}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 15,
        { align: 'center' }
      );
      doc.text(
        'Document Management System - Ateneo de Manila University',
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }

    // Download instead of print
    doc.save(`routing-history-${document.document_id || 'report'}.pdf`);
  } catch (error) {
    console.error('Error generating routing history PDF:', error);
    alert(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};