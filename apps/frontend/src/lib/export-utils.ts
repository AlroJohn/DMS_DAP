import { UsageReportData } from '@/types/usage-report';

/**
 * Export usage report as PDF with logo
 */
export const exportUsageReportAsPDF = async (reportData: UsageReportData, dateRange: string) => {
  try {
    // Dynamically import jsPDF and html2canvas
    const { jsPDF } = await import('jspdf');
    await import('jspdf-autotable');
    
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(22);
    doc.text('Usage Report', 20, 20);
    
    // Add date range
    doc.setFontSize(12);
    doc.text(`Date Range: ${dateRange}`, 20, 30);
    
    // Add logo if available
    try {
      const logoResponse = await fetch('/image/qby.png');
      if (logoResponse.ok) {
        const logoBlob = await logoResponse.blob();
        const logoUrl = URL.createObjectURL(logoBlob);
        
        // Add logo to the top right
        doc.addImage(logoUrl, 'PNG', 170, 10, 30, 15);
        
        // Clean up the object URL
        URL.revokeObjectURL(logoUrl);
      }
    } catch (error) {
      console.warn('Could not load logo:', error);
    }
    
    // Add statistics table
    const statsData = [
      ['Total Documents', reportData?.statistics.totalDocuments?.toLocaleString() || '0'],
      ['Active Users', reportData?.statistics.activeUsers?.toLocaleString() || '0'],
      ['Storage Used', reportData?.statistics.storageUsed || '0 GB'],
      ['API Calls', reportData?.statistics.apiCalls?.toLocaleString() || '0'],
    ];
    
    (doc as any).autoTable({
      startY: 40,
      head: [['Metric', 'Value']],
      body: statsData,
      theme: 'grid',
      headStyles: { fillColor: [22, 163, 74] }, // green-600
    });
    
    // Add department usage table
    if (reportData?.departmentUsage && reportData.departmentUsage.length > 0) {
      const deptData = reportData.departmentUsage.map(dept => [
        dept.name,
        dept.documents.toString(),
        dept.users.toString(),
        dept.storage,
        `${dept.activity}%`
      ]);
      
      (doc as any).autoTable({
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [['Department', 'Documents', 'Users', 'Storage', 'Activity']],
        body: deptData,
        theme: 'grid',
      });
    }
    
    // Add recent activity table
    if (reportData?.recentActivity && reportData?.recentActivity.length > 0) {
      const activityData = reportData.recentActivity.map(activity => [
        activity.action,
        activity.user,
        activity.time
      ]);

      (doc as any).autoTable({
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [['Action', 'User', 'Time']],
        body: activityData,
        theme: 'grid',
      });
    }
    
    // Save the PDF
    doc.save(`usage-report-${dateRange}-${new Date().toISOString().split('T')[0]}.pdf`);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF report');
  }
};

/**
 * Export usage report as CSV
 */
export const exportUsageReportAsCSV = (reportData: UsageReportData, dateRange: string) => {
  try {
    // Create CSV content
    let csvContent = `Usage Report - ${dateRange}\n\n`;
    
    // Add statistics
    csvContent += 'Statistics\n';
    csvContent += `Metric,Value\n`;
    csvContent += `Total Documents,${reportData?.statistics.totalDocuments || 0}\n`;
    csvContent += `Active Users,${reportData?.statistics.activeUsers || 0}\n`;
    csvContent += `Storage Used,${reportData?.statistics.storageUsed || '0 GB'}\n`;
    csvContent += `API Calls,${reportData?.statistics.apiCalls || 0}\n\n`;
    
    // Add department usage
    csvContent += 'Department Usage\n';
    csvContent += `Department,Documents,Users,Storage,Activity\n`;
    if (reportData?.departmentUsage) {
      reportData.departmentUsage.forEach(dept => {
        csvContent += `"${dept.name}",${dept.documents},${dept.users},"${dept.storage}",${dept.activity}%\n`;
      });
    }
    csvContent += '\n';
    
    // Add recent activity
    csvContent += 'Recent Activity\n';
    csvContent += `Action,User,Time\n`;
    if (reportData?.recentActivity) {
      reportData.recentActivity.forEach(activity => {
        csvContent += `"${activity.action}","${activity.user}","${activity.time}"\n`;
      });
    }
    
    // Create and download the CSV file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `usage-report-${dateRange}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error generating CSV:', error);
    throw new Error('Failed to generate CSV report');
  }
};

/**
 * Export usage report as Excel
 */
export const exportUsageReportAsExcel = async (reportData: UsageReportData, dateRange: string) => {
  try {
    // Dynamically import xlsx
    const { utils, writeFile } = await import('xlsx');
    
    // Create worksheets for different data sections
    const statsData = [
      ['Metric', 'Value'],
      ['Total Documents', reportData?.statistics.totalDocuments || 0],
      ['Active Users', reportData?.statistics.activeUsers || 0],
      ['Storage Used', reportData?.statistics.storageUsed || '0 GB'],
      ['API Calls', reportData?.statistics.apiCalls || 0],
    ];
    
    const deptData = [
      ['Department', 'Documents', 'Users', 'Storage', 'Activity']
    ];
    if (reportData?.departmentUsage) {
      reportData.departmentUsage.forEach(dept => {
        deptData.push([dept.name, dept.documents, dept.users, dept.storage, `${dept.activity}%`]);
      });
    }
    
    const activityData = [
      ['Action', 'User', 'Time']
    ];
    if (reportData?.recentActivity) {
      reportData.recentActivity.forEach(activity => {
        activityData.push([activity.action, activity.user, activity.time]);
      });
    }
    
    // Create workbook and add worksheets
    const wb = utils.book_new();
    const statsWs = utils.aoa_to_sheet(statsData);
    const deptWs = utils.aoa_to_sheet(deptData);
    const activityWs = utils.aoa_to_sheet(activityData);
    
    utils.book_append_sheet(wb, statsWs, 'Statistics');
    utils.book_append_sheet(wb, deptWs, 'Department Usage');
    utils.book_append_sheet(wb, activityWs, 'Recent Activity');
    
    // Write the file
    writeFile(wb, `usage-report-${dateRange}-${new Date().toISOString().split('T')[0]}.xlsx`);
  } catch (error) {
    console.error('Error generating Excel:', error);
    throw new Error('Failed to generate Excel report');
  }
};