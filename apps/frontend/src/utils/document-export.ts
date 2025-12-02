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

export const generateDocumentPDF = (document: DocumentData) => {
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

  // Format document logs
  const logsHTML = document_logs.length > 0 
    ? `
        <div class="section">
          <h3>Document History</h3>
          <div class="timeline">
            ${document_logs.map(log => `
              <div class="timeline-item">
                <div class="log-header">
                  <p><span class="label">Action:</span> ${formatText(log.action)}</p>
                  <p><span class="label">Date:</span> ${formatDateTime(log.performed_at).full}</p>
                </div>
                ${log.performed_by_user ? `<p><span class="label">By:</span> ${log.performed_by_user.first_name} ${log.performed_by_user.last_name}</p>` : ''}
                ${log.remarks ? `<p><span class="label">Remarks:</span> ${log.remarks}</p>` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      `
    : '';

  // Format document trails
  const trailsHTML = document_trails.length > 0 
    ? `
        <div class="section">
          <h3>Document Routing History</h3>
          <div class="trails-container">
            ${document_trails.map(trail => {
              const datetime = formatDateTime(trail.action_date);
              const statusName = formatText(trail.status);
              return `
                <div class="trail-item">
                  <div class="trail-header">
                    <p><span class="label">Status:</span> ${statusName}</p>
                    <p><span class="label">Date:</span> ${datetime.full}</p>
                  </div>
                  ${trail.fromDept && trail.toDept ? `
                    <div class="dept-flow">
                      <p><span class="label">From:</span> ${trail.fromDept.name}</p>
                      <p><span class="label">To:</span> ${trail.toDept.name}</p>
                    </div>
                  ` : ''}
                  ${trail.user ? `<p><span class="label">Performed By:</span> ${trail.user.first_name} ${trail.user.last_name}</p>` : ''}
                  ${trail.documentAction ? `<p><span class="label">Action:</span> ${trail.documentAction.action_name}</p>` : ''}
                  ${trail.remarks ? `<p><span class="label">Remarks:</span> ${trail.remarks}</p>` : ''}
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `
    : '';

  const printContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Document Report - ${docName}</title>
        <meta charset="utf-8">
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 30px;
            color: #333;
            line-height: 1.6;
            background-color: #fff;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 15px;
            border-bottom: 2px solid #e5e7eb;
          }
          .header h1 {
            color: #1f2937;
            font-size: 28px;
            margin: 0 0 8px 0;
          }
          .header h2 {
            color: #4b5563;
            font-size: 22px;
            font-weight: 500;
            margin: 0;
          }
          .header p {
            color: #6b7280;
            font-size: 16px;
            margin-top: 8px;
          }
          .section {
            margin-bottom: 30px;
            page-break-inside: avoid;
          }
          .section h3 {
            color: #374151;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 8px;
            margin: 0 0 15px 0;
            font-size: 18px;
          }
          .label {
            font-weight: 600;
            color: #4b5563;
            min-width: 100px;
            display: inline-block;
          }
          .metadata-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
          }
          .metadata-item {
            background: #f9fafb;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #3b82f6;
          }
          .metadata-item .label {
            display: block;
            font-size: 12px;
            text-transform: uppercase;
            color: #6b7280;
            margin-bottom: 5px;
          }
          .metadata-item p {
            margin: 0;
            font-size: 16px;
            color: #1f2937;
          }
          .timeline {
            margin-left: 20px;
          }
          .timeline-item {
            margin-bottom: 20px;
            padding: 15px;
            border-left: 3px solid #d1d5db;
            background-color: #f9fafb;
            border-radius: 0 4px 4px 0;
          }
          .log-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            border-bottom: 1px dashed #e5e7eb;
            padding-bottom: 10px;
          }
          .trails-container {
            margin-top: 15px;
          }
          .trail-item {
            margin-bottom: 20px;
            padding: 15px;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            background-color: #f9fafb;
          }
          .trail-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 10px;
          }
          .dept-flow {
            margin: 10px 0;
            display: flex;
            gap: 20px;
          }
          .footer {
            margin-top: 40px;
            text-align: center;
            color: #6b7280;
            font-size: 14px;
            padding-top: 15px;
            border-top: 1px solid #e5e7eb;
          }
          @media print {
            body {
              padding: 20px;
            }
            .header {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Document Report</h1>
          <h2>${docName}</h2>
          <p>Document Code: ${docCode}</p>
        </div>

        <div class="section">
          <div class="metadata-grid">
            <div class="metadata-item">
              <span class="label">Status</span>
              <p>${formatText(status)}</p>
            </div>
            <div class="metadata-item">
              <span class="label">Classification</span>
              <p>${formattedClassification}</p>
            </div>
            <div class="metadata-item">
              <span class="label">Created Date</span>
              <p>${docDate.full}</p>
            </div>
            <div class="metadata-item">
              <span class="label">Origin/Department</span>
              <p>${creatorDept}</p>
            </div>
            <div class="metadata-item">
              <span class="label">Created By</span>
              <p>${creatorName}</p>
            </div>
          </div>
        </div>

        ${logsHTML}
        ${trailsHTML}

        <div class="footer">
          <p>Generated on ${new Date().toLocaleString()}</p>
          <p>Document Management System - Ateneo de Manila University</p>
        </div>
      </body>
    </html>
  `;

  // Open the print window
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (printWindow) {
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    
    // Wait for content to load before printing
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };
  } else {
    alert('Please allow popups for this site to enable printing.');
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
  
  // Prepare document metadata
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
  
  // Add logs if available
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
    
    return csvContent + logsHeader + logsColumns + logsRows;
  }
  
  return csvContent;
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

// To use Excel export, we need to install xlsx library
// For now, we'll simulate Excel export by providing CSV with .xlsx extension
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
  // Prepare routing history header
  const header = [
    'Status',
    'Action Date',
    'From Department',
    'To Department',
    'Performed By',
    'Action Type',
    'Remarks'
  ].join(',');

  // Format routing history rows
  const rows = trails.map(trail => {
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

export const exportRoutingHistoryPDF = (document: DocumentData, trails: any[]) => {
  const docName = document.detail?.document_name || 'Document';
  const docCode = document.detail?.document_code || 'N/A';

  const trailsHTML = trails.length > 0
    ? `
        <div class="section">
          <h3>Document Routing History</h3>
          <div class="trails-container">
            ${trails.map(trail => {
              const datetime = formatDateTime(trail.action_date);
              const statusName = formatText(trail.status);
              return `
                <div class="trail-item">
                  <div class="trail-header">
                    <div class="trail-info">
                      <p><span class="label">Status:</span> ${statusName}</p>
                      <p><span class="label">Date:</span> ${datetime.full}</p>
                    </div>

                    ${trail.fromDept && trail.toDept ? `
                      <div class="dept-flow">
                        <div class="dept-info">
                          <p><span class="label">From:</span> ${trail.fromDept.name}</p>
                          <p><span class="label">To:</span> ${trail.toDept.name}</p>
                        </div>
                      </div>
                    ` : ''}

                    <div class="user-info">
                      <p><span class="label">Performed By:</span> ${trail.user ? `${trail.user.first_name} ${trail.user.last_name}` : 'System'}</p>
                    </div>

                    ${trail.documentAction ? `
                      <div class="action-info">
                        <p><span class="label">Action:</span> ${trail.documentAction.action_name}</p>
                      </div>
                    ` : ''}

                    ${trail.remarks ? `
                      <div class="remarks-section">
                        <p><span class="label">Remarks:</span> ${trail.remarks}</p>
                      </div>
                    ` : ''}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `
    : '<p>No routing history available</p>';

  const printContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Document Routing History - ${docName}</title>
        <meta charset="utf-8">
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 30px;
            color: #333;
            line-height: 1.6;
            background-color: #fff;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 15px;
            border-bottom: 2px solid #e5e7eb;
          }
          .header h1 {
            color: #1f2937;
            font-size: 28px;
            margin: 0 0 8px 0;
          }
          .header h2 {
            color: #4b5563;
            font-size: 22px;
            font-weight: 500;
            margin: 0;
          }
          .header p {
            color: #6b7280;
            font-size: 16px;
            margin-top: 8px;
          }
          .section {
            margin-bottom: 30px;
            page-break-inside: avoid;
          }
          .section h3 {
            color: #374151;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 8px;
            margin: 0 0 15px 0;
            font-size: 18px;
          }
          .label {
            font-weight: 600;
            color: #4b5563;
          }
          .trail-item {
            margin-bottom: 20px;
            padding: 15px;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            background-color: #f9fafb;
          }
          .trail-header {
            display: flex;
            flex-direction: column;
            gap: 10px;
          }
          .trail-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 10px;
          }
          .dept-flow {
            margin: 10px 0;
          }
          .dept-info {
            display: flex;
            gap: 20px;
          }
          .footer {
            margin-top: 40px;
            text-align: center;
            color: #6b7280;
            font-size: 14px;
            padding-top: 15px;
            border-top: 1px solid #e5e7eb;
          }
          @media print {
            body {
              padding: 20px;
            }
            .header {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Document Routing Report</h1>
          <h2>${docName}</h2>
          <p>Document Code: ${docCode}</p>
        </div>

        ${trailsHTML}

        <div class="footer">
          <p>Generated on ${new Date().toLocaleString()}</p>
          <p>Document Management System - Ateneo de Manila University</p>
        </div>
      </body>
    </html>
  `;

  // Open the print window
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (printWindow) {
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();

    // Wait for content to load before printing
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };
  } else {
    alert('Please allow popups for this site to enable printing.');
  }
};