import { PrismaClient } from '@prisma/client';
import { DocumentReportsService } from './document-reports.service';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import PDFDocument from 'pdfkit';

const prisma = new PrismaClient();

export class ScheduledReportsProcessor {
  private documentReportsService: DocumentReportsService;
  private isRunning: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;

  constructor() {
    this.documentReportsService = new DocumentReportsService();
  }

  /**
   * Regenerate a specific scheduled report
   */
  public async regenerateReport(reportId: string): Promise<void> {
    try {
      const scheduledReport = await prisma.scheduledReport.findUnique({
        where: {
          scheduled_report_id: reportId
        },
        include: {
          user: true
        }
      });

      if (!scheduledReport) {
        throw new Error(`Scheduled report ${reportId} not found`);
      }

      console.log(`[REGENERATE] Regenerating report ${reportId} for user ${scheduledReport.user_id}`);

      // Generate the report based on its type
      let reportData: Buffer;
      let fileName: string;

      switch (scheduledReport.report_type) {
        case 'compliance':
          console.log(`[REGENERATE] Generating compliance report...`);
          reportData = await this.generateComplianceReport(scheduledReport);
          fileName = `compliance-report-${scheduledReport.scheduled_report_id}-${new Date().toISOString().split('T')[0]}.pdf`;
          break;
        case 'usage':
          console.log(`[REGENERATE] Generating usage report...`);
          reportData = await this.generateUsageReport(scheduledReport);
          fileName = `usage-report-${scheduledReport.scheduled_report_id}-${new Date().toISOString().split('T')[0]}.pdf`;
          break;
        case 'version':
          console.log(`[REGENERATE] Generating version report...`);
          reportData = await this.generateVersionReport(scheduledReport);
          fileName = `version-report-${scheduledReport.scheduled_report_id}-${new Date().toISOString().split('T')[0]}.pdf`;
          break;
        default:
          throw new Error(`Unknown report type: ${scheduledReport.report_type}`);
      }

      // Validate report data
      if (!reportData || !Buffer.isBuffer(reportData)) {
        throw new Error('Report data is not a valid Buffer');
      }

      if (reportData.length === 0) {
        throw new Error('Report data buffer is empty');
      }

      console.log(`[REGENERATE] Report buffer size: ${reportData.length} bytes`);

      // Define the path where the report will be stored
      const reportsDir = path.join(__dirname, '..', '..', 'reports');
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
        console.log(`[REGENERATE] Created reports directory: ${reportsDir}`);
      }

      const filePath = path.join(reportsDir, fileName);
      console.log(`[REGENERATE] Writing report to: ${filePath}`);

      // Write the report to the file system (binary mode for PDF)
      fs.writeFileSync(filePath, reportData);
      
      // Verify file was written
      if (!fs.existsSync(filePath)) {
        throw new Error(`Failed to write report file to ${filePath}`);
      }

      const fileStats = fs.statSync(filePath);
      console.log(`[REGENERATE] File written successfully. Size: ${fileStats.size} bytes`);
      
      if (fileStats.size === 0) {
        throw new Error(`Report file is empty after writing: ${filePath}`);
      }

      // Update the scheduled report record with file information
      await prisma.scheduledReport.update({
        where: {
          scheduled_report_id: reportId
        },
        data: {
          report_file_path: filePath,
          report_file_name: fileName,
          report_generated_at: new Date(),
          last_run: new Date()
        }
      });

      console.log(`[REGENERATE] ✓✓✓ Successfully regenerated report ${fileName}`);
    } catch (error) {
      console.error(`[REGENERATE] ✗✗✗ Error regenerating report ${reportId}:`, error);
      throw error;
    }
  }

  /**
   * Start the scheduled reports processor
   */
  public start(): void {
    if (this.isRunning) {
      console.log('Scheduled reports processor is already running');
      return;
    }

    console.log('Starting scheduled reports processor...');
    this.isRunning = true;

    // Run immediately on startup
    this.processScheduledReports().catch(console.error);

    // Run every 5 minutes to check for scheduled reports
    this.intervalId = setInterval(() => {
      this.processScheduledReports().catch(console.error);
    }, 5 * 60 * 1000); // 5 minutes
  }

  /**
   * Stop the scheduled reports processor
   */
  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('Scheduled reports processor stopped');
  }

  /**
   * Process all scheduled reports that are due to run
   * Made public for manual triggering during testing
   */
  public async processScheduledReports(): Promise<void> {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ========== Checking for scheduled reports to process ==========`);

    try {
      // Find all active scheduled reports that are due to run
      const now = new Date();
      const scheduledReports = await prisma.scheduledReport.findMany({
        where: {
          is_active: true,
          next_run: {
            lte: now
          }
        },
        include: {
          user: true
        }
      });

      console.log(`[${timestamp}] Found ${scheduledReports.length} scheduled report(s) due for processing`);
      
      if (scheduledReports.length === 0) {
        // Also log all active reports for debugging
        const allActiveReports = await prisma.scheduledReport.findMany({
          where: {
            is_active: true
          },
          select: {
            scheduled_report_id: true,
            report_type: true,
            next_run: true,
            user_id: true
          }
        });
        
        if (allActiveReports.length > 0) {
          console.log(`[${timestamp}] Active scheduled reports (not due yet):`);
          allActiveReports.forEach(report => {
            const timeUntilRun = report.next_run.getTime() - now.getTime();
            const minutesUntilRun = Math.floor(timeUntilRun / 60000);
            console.log(`  - Report ${report.scheduled_report_id} (${report.report_type}): Next run in ${minutesUntilRun} minutes (${report.next_run.toISOString()})`);
          });
        } else {
          console.log(`[${timestamp}] No active scheduled reports found in database`);
        }
        return;
      }

      for (const scheduledReport of scheduledReports) {
        const reportStartTime = new Date().toISOString();
        try {
          console.log(`[${reportStartTime}] >>> Processing scheduled report ${scheduledReport.scheduled_report_id} for user ${scheduledReport.user_id}`);
          console.log(`[${reportStartTime}] Report type: ${scheduledReport.report_type}`);
          console.log(`[${reportStartTime}] Schedule config:`, JSON.stringify(scheduledReport.schedule_config));

          // Generate the report based on its type
          let reportData: Buffer;
          let fileName: string;

          switch (scheduledReport.report_type) {
            case 'compliance':
              console.log(`[${reportStartTime}] Generating compliance report...`);
              reportData = await this.generateComplianceReport(scheduledReport);
              fileName = `compliance-report-${scheduledReport.scheduled_report_id}-${new Date().toISOString().split('T')[0]}.pdf`;
              break;
            case 'usage':
              console.log(`[${reportStartTime}] Generating usage report...`);
              reportData = await this.generateUsageReport(scheduledReport);
              fileName = `usage-report-${scheduledReport.scheduled_report_id}-${new Date().toISOString().split('T')[0]}.pdf`;
              break;
            case 'version':
              console.log(`[${reportStartTime}] Generating version report...`);
              reportData = await this.generateVersionReport(scheduledReport);
              fileName = `version-report-${scheduledReport.scheduled_report_id}-${new Date().toISOString().split('T')[0]}.pdf`;
              break;
            default:
              console.error(`[${reportStartTime}] Unknown report type: ${scheduledReport.report_type}`);
              continue;
          }

          // Validate report data
          if (!reportData || !Buffer.isBuffer(reportData)) {
            throw new Error('Report data is not a valid Buffer');
          }

          if (reportData.length === 0) {
            throw new Error('Report data buffer is empty');
          }

          console.log(`[${reportStartTime}] Report buffer size: ${reportData.length} bytes`);

          // Define the path where the report will be stored
          const reportsDir = path.join(__dirname, '..', '..', 'reports');
          if (!fs.existsSync(reportsDir)) {
            fs.mkdirSync(reportsDir, { recursive: true });
            console.log(`[${reportStartTime}] Created reports directory: ${reportsDir}`);
          }

          const filePath = path.join(reportsDir, fileName);
          console.log(`[${reportStartTime}] Writing report to: ${filePath}`);

          // Write the report to the file system (binary mode for PDF)
          fs.writeFileSync(filePath, reportData);
          
          // Verify file was written
          if (!fs.existsSync(filePath)) {
            throw new Error(`Failed to write report file to ${filePath}`);
          }

          const fileStats = fs.statSync(filePath);
          console.log(`[${reportStartTime}] File written successfully. Size: ${fileStats.size} bytes`);
          
          if (fileStats.size === 0) {
            throw new Error(`Report file is empty after writing: ${filePath}`);
          }

          // Update the scheduled report record with file information
          // Note: The following fields will be available after Prisma client regeneration
          const nextRunTime = this.calculateNextRun(
            scheduledReport.schedule_config as any,
            scheduledReport.report_type
          );
          
          await prisma.scheduledReport.update({
            where: {
              scheduled_report_id: scheduledReport.scheduled_report_id
            },
            data: {
              report_file_path: filePath,
              report_file_name: fileName,
              report_generated_at: new Date(),
              last_run: new Date(),
              next_run: nextRunTime
            }
          });

          const reportEndTime = new Date().toISOString();
          console.log(`[${reportEndTime}] ✓✓✓ Successfully generated report ${fileName}`);
          console.log(`[${reportEndTime}] File saved to: ${filePath}`);
          console.log(`[${reportEndTime}] Next run scheduled for: ${nextRunTime.toISOString()}`);
          console.log(`[${reportEndTime}] <<< Completed processing scheduled report ${scheduledReport.scheduled_report_id}`);
        } catch (error) {
          const errorTime = new Date().toISOString();
          console.error(`[${errorTime}] ✗✗✗ Error processing scheduled report ${scheduledReport.scheduled_report_id}:`, error);
          if (error instanceof Error) {
            console.error(`[${errorTime}] Error message: ${error.message}`);
            console.error(`[${errorTime}] Error stack: ${error.stack}`);
          }
        }
      }
      
      const endTime = new Date().toISOString();
      console.log(`[${endTime}] ========== Finished processing scheduled reports ==========`);
    } catch (error) {
      const errorTime = new Date().toISOString();
      console.error(`[${errorTime}] ✗✗✗ Error in processScheduledReports:`, error);
      if (error instanceof Error) {
        console.error(`[${errorTime}] Error message: ${error.message}`);
        console.error(`[${errorTime}] Error stack: ${error.stack}`);
      }
    }
  }

  /**
   * Generate a compliance report as PDF
   */
  private async generateComplianceReport(scheduledReport: any): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        // Get compliance report data
        const reportData = await this.documentReportsService.getComplianceReport();
        
        if (!reportData) {
          throw new Error('Failed to retrieve compliance report data');
        }

        // Create PDF document
        const doc = new PDFDocument({ margin: 50 });
        const buffers: Buffer[] = [];

        // Collect PDF data
        doc.on('data', (chunk: Buffer) => {
          buffers.push(chunk);
        });
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          console.log(`Generated PDF buffer size: ${pdfBuffer.length} bytes`);
          if (pdfBuffer.length === 0) {
            reject(new Error('Generated PDF buffer is empty'));
          } else {
            resolve(pdfBuffer);
          }
        });
        doc.on('error', (error: Error) => {
          console.error('PDF generation error:', error);
          reject(error);
        });

        // Add header
        doc.fontSize(20).text('COMPLIANCE REPORT', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Generated at: ${new Date().toLocaleString()}`, { align: 'center' });
        doc.text(`Report ID: ${scheduledReport.scheduled_report_id}`, { align: 'center' });
        doc.moveDown();
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown();

        // Compliance Metrics
        doc.fontSize(16).font('Helvetica-Bold').text('COMPLIANCE METRICS');
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica');
        
        if (reportData.complianceMetrics) {
          const metrics = reportData.complianceMetrics;
          doc.text(`Documents Signed: ${metrics.documentsSigned || 0}`, { continued: false });
          doc.text(`Total Documents: ${metrics.totalDocuments || 0}`, { continued: false });
          doc.text(`Compliance Rate: ${metrics.complianceRate || '0%'}`, { continued: false });
          doc.text(`Pending Signatures: ${metrics.pendingSignatures || 0}`, { continued: false });
          doc.text(`Failed Verifications: ${metrics.failedVerifications || 0}`, { continued: false });
          doc.text(`Status: ${metrics.status || 'Unknown'}`, { continued: false });
        }
        doc.moveDown();
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown();

        // Pending Signatures
        doc.fontSize(16).font('Helvetica-Bold').text('PENDING SIGNATURES');
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica');
        
        if (reportData.pendingSignatures && reportData.pendingSignatures.length > 0) {
          doc.text(`Total Documents with Placeholders: ${reportData.pendingSignatures.length}`, { continued: false });
          doc.moveDown(0.3);
          
          // Table header
          doc.font('Helvetica-Bold');
          doc.text('Document', 50, doc.y, { width: 200, continued: true });
          doc.text('Code', 250, doc.y, { width: 100, continued: true });
          doc.text('Days Overdue', 350, doc.y, { width: 80, continued: true });
          doc.text('Priority', 430, doc.y, { width: 120 });
          doc.moveDown(0.3);
          doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
          doc.moveDown(0.2);
          
          // Table rows
          doc.font('Helvetica');
          reportData.pendingSignatures.forEach((sig: any) => {
            if (doc.y > 750) { // New page if needed
              doc.addPage();
            }
            const docName = (sig.document || 'N/A').substring(0, 30);
            const code = (sig.documentCode || 'N/A').substring(0, 15);
            const days = String(sig.daysOverdue || 0);
            const priority = sig.priority || 'N/A';
            
            doc.text(docName, 50, doc.y, { width: 200, continued: true });
            doc.text(code, 250, doc.y, { width: 100, continued: true });
            doc.text(days, 350, doc.y, { width: 80, continued: true });
            doc.text(priority, 430, doc.y, { width: 120 });
            doc.moveDown(0.3);
          });
          doc.moveDown(0.3);
          doc.fontSize(9).font('Helvetica-Oblique');
          doc.text('Note: This includes all documents that have signature placeholders, regardless of signing status.', { continued: false });
          doc.fontSize(10).font('Helvetica');
        } else {
          doc.text('No documents with signature placeholders found.', { continued: false });
        }
        doc.moveDown();
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown();

        // Recent Signatures
        doc.fontSize(16).font('Helvetica-Bold').text('RECENT SIGNATURES');
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica');
        
        if (reportData.recentSignatures && reportData.recentSignatures.length > 0) {
          // Table header
          doc.font('Helvetica-Bold');
          doc.text('Document', 50, doc.y, { width: 200, continued: true });
          doc.text('Signer', 250, doc.y, { width: 150, continued: true });
          doc.text('Date', 400, doc.y, { width: 80, continued: true });
          doc.text('Status', 480, doc.y, { width: 70 });
          doc.moveDown(0.3);
          doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
          doc.moveDown(0.2);
          
          // Table rows
          doc.font('Helvetica');
          reportData.recentSignatures.forEach((sig: any) => {
            if (doc.y > 750) { // New page if needed
              doc.addPage();
            }
            const docName = (sig.document || 'N/A').substring(0, 30);
            const signer = (sig.signer || 'N/A').substring(0, 20);
            const date = (sig.date || 'N/A').substring(0, 10);
            const status = sig.status || 'N/A';
            
            doc.text(docName, 50, doc.y, { width: 200, continued: true });
            doc.text(signer, 250, doc.y, { width: 150, continued: true });
            doc.text(date, 400, doc.y, { width: 80, continued: true });
            doc.text(status, 480, doc.y, { width: 70 });
            doc.moveDown(0.3);
          });
        } else {
          doc.text('No recent signatures', { continued: false });
        }
        doc.moveDown();
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown();

        // Timeline Events
        doc.fontSize(16).font('Helvetica-Bold').text('COMPLIANCE TIMELINE');
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica');
        
        if (reportData.timeline && reportData.timeline.length > 0) {
          reportData.timeline.forEach((event: any, index: number) => {
            if (doc.y > 750) { // New page if needed
              doc.addPage();
            }
            doc.text(`${index + 1}. ${event.title || 'Event'}`, { continued: false });
            doc.text(`   ${event.description || 'No description'}`, { indent: 20, continued: false });
            doc.text(`   Date: ${event.date || 'N/A'}`, { indent: 20, continued: false });
            doc.moveDown(0.3);
          });
        } else {
          doc.text('No compliance events to display', { continued: false });
        }

        // Footer
        doc.moveDown();
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown();
        doc.fontSize(12).font('Helvetica-Bold').text('END OF REPORT', { align: 'center' });

        // Finalize PDF
        doc.end();
      } catch (error) {
        console.error('Error generating compliance report:', error);
        reject(error);
      }
    });
  }

  /**
   * Generate a usage report
   */
  private async generateUsageReport(scheduledReport: any): Promise<Buffer> {
    try {
      // Get usage report data
      const reportData = await this.documentReportsService.getUsageReport();
      
      if (!reportData) {
        throw new Error('Failed to retrieve usage report data');
      }

      const lines: string[] = [];
      
      // Header
      lines.push('='.repeat(80));
      lines.push('USAGE REPORT');
      lines.push('='.repeat(80));
      lines.push('');
      lines.push(`Generated at: ${new Date().toLocaleString()}`);
      lines.push(`Report ID: ${scheduledReport.scheduled_report_id}`);
      lines.push('');
      lines.push('='.repeat(80));
      lines.push('');

      // Statistics
      if (reportData.statistics) {
        lines.push('STATISTICS');
        lines.push('-'.repeat(80));
        const stats = reportData.statistics;
        lines.push(`Total Documents: ${stats.totalDocuments || 0}`);
        lines.push(`Active Users: ${stats.activeUsers || 0}`);
        lines.push(`Storage Used: ${stats.storageUsed || '0 GB'}`);
        lines.push(`API Calls: ${stats.apiCalls || 0}`);
        lines.push(`Documents This Month: ${stats.documentsThisMonth || 0}`);
        lines.push(`Users This Month: ${stats.usersThisMonth || 0}`);
        lines.push(`Storage Change: ${stats.storageChange || '0%'}`);
        lines.push(`API Call Change: ${stats.apiCallChange || '0%'}`);
        lines.push('');
      }

      // Department Usage
      if (reportData.departmentUsage && reportData.departmentUsage.length > 0) {
        lines.push('DEPARTMENT USAGE');
        lines.push('-'.repeat(80));
        lines.push(`${'Department'.padEnd(30)} ${'Documents'.padEnd(15)} ${'Users'.padEnd(10)} ${'Storage'.padEnd(15)} Activity`);
        lines.push('-'.repeat(80));
        reportData.departmentUsage.forEach((dept: any) => {
          const name = (dept.name || 'N/A').substring(0, 28).padEnd(30);
          const docs = String(dept.documents || 0).padEnd(15);
          const users = String(dept.users || 0).padEnd(10);
          const storage = (dept.storage || '0 GB').padEnd(15);
          const activity = `${dept.activity || 0}%`;
          lines.push(`${name} ${docs} ${users} ${storage} ${activity}`);
        });
        lines.push('');
      }

      // Recent Activity
      if (reportData.recentActivity && reportData.recentActivity.length > 0) {
        lines.push('RECENT ACTIVITY');
        lines.push('-'.repeat(80));
        reportData.recentActivity.forEach((activity: any, index: number) => {
          lines.push(`${index + 1}. ${activity.action || 'Activity'}`);
          lines.push(`   User: ${activity.user || 'Unknown'}`);
          lines.push(`   Time: ${activity.time || 'N/A'}`);
          lines.push('');
        });
      }

      lines.push('='.repeat(80));
      lines.push('END OF REPORT');
      lines.push('='.repeat(80));

      const reportContent = lines.join('\n');
      
      if (!reportContent || reportContent.trim().length === 0) {
        throw new Error('Generated report content is empty');
      }

      console.log(`Generated usage report with ${reportContent.length} characters`);
      
      return Buffer.from(reportContent, 'utf-8');
    } catch (error) {
      console.error('Error generating usage report:', error);
      const errorReport = `ERROR GENERATING USAGE REPORT\n\n` +
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}\n` +
        `Time: ${new Date().toISOString()}\n` +
        `Report ID: ${scheduledReport.scheduled_report_id}\n\n` +
        `Please check server logs for more details.`;
      return Buffer.from(errorReport, 'utf-8');
    }
  }

  /**
   * Generate a version report
   */
  private async generateVersionReport(scheduledReport: any): Promise<Buffer> {
    try {
      // Get version history report data
      const reportData = await this.documentReportsService.getVersionHistoryReport();
      
      if (!reportData) {
        throw new Error('Failed to retrieve version history report data');
      }

      const lines: string[] = [];
      
      // Header
      lines.push('='.repeat(80));
      lines.push('VERSION HISTORY REPORT');
      lines.push('='.repeat(80));
      lines.push('');
      lines.push(`Generated at: ${new Date().toLocaleString()}`);
      lines.push(`Report ID: ${scheduledReport.scheduled_report_id}`);
      lines.push('');
      lines.push('='.repeat(80));
      lines.push('');

      // Statistics
      if (reportData.statistics) {
        lines.push('STATISTICS');
        lines.push('-'.repeat(80));
        const stats = reportData.statistics;
        lines.push(`Total Versions: ${stats.totalVersions || 0}`);
        lines.push(`Versions This Month: ${stats.versionsThisMonth || 0}`);
        lines.push(`Average Versions Per Document: ${stats.avgVersionsPerDoc || 0}`);
        lines.push('');
      }

      // Recent Changes
      if (reportData.recentChanges && reportData.recentChanges.length > 0) {
        lines.push('RECENT VERSION CHANGES');
        lines.push('-'.repeat(80));
        lines.push(`${'Document'.padEnd(40)} ${'Version'.padEnd(10)} ${'Uploaded By'.padEnd(25)} Date`);
        lines.push('-'.repeat(80));
        reportData.recentChanges.forEach((change: any) => {
          const doc = (change.documentTitle || change.documentCode || 'N/A').substring(0, 38).padEnd(40);
          const version = String(change.version || 'N/A').padEnd(10);
          const uploadedBy = (change.uploadedBy || 'Unknown').substring(0, 23).padEnd(25);
          const date = change.uploadedAt ? new Date(change.uploadedAt).toLocaleDateString() : 'N/A';
          lines.push(`${doc} ${version} ${uploadedBy} ${date}`);
        });
        lines.push('');
      } else {
        lines.push('RECENT VERSION CHANGES');
        lines.push('-'.repeat(80));
        lines.push('No recent version changes');
        lines.push('');
      }

      lines.push('='.repeat(80));
      lines.push('END OF REPORT');
      lines.push('='.repeat(80));

      const reportContent = lines.join('\n');
      
      if (!reportContent || reportContent.trim().length === 0) {
        throw new Error('Generated report content is empty');
      }

      console.log(`Generated version report with ${reportContent.length} characters`);
      
      return Buffer.from(reportContent, 'utf-8');
    } catch (error) {
      console.error('Error generating version report:', error);
      const errorReport = `ERROR GENERATING VERSION HISTORY REPORT\n\n` +
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}\n` +
        `Time: ${new Date().toISOString()}\n` +
        `Report ID: ${scheduledReport.scheduled_report_id}\n\n` +
        `Please check server logs for more details.`;
      return Buffer.from(errorReport, 'utf-8');
    }
  }

  /**
   * Calculate the next run time based on the schedule configuration
   */
  private calculateNextRun(scheduleConfig: { frequency: 'daily' | 'weekly' | 'monthly'; day?: number; time: string }, reportType: string): Date {
    const now = new Date();
    const [hours, minutes] = scheduleConfig.time.split(':').map(Number);

    let nextRun = new Date(now);
    nextRun.setHours(hours, minutes, 0, 0); // Set to scheduled time today

    // Adjust based on frequency
    switch (scheduleConfig.frequency) {
      case 'daily':
        if (nextRun <= now) {
          nextRun.setDate(nextRun.getDate() + 1); // Tomorrow
        }
        break;
      case 'weekly':
        // For weekly, we'll schedule for next week at the same day
        const targetDayWeekly = scheduleConfig.day || 1; // Default to Monday if no day specified
        const currentDay = nextRun.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const daysUntilTarget = (targetDayWeekly - currentDay + 7) % 7 || 7; // Ensure at least 1 day if today is the target day
        nextRun.setDate(nextRun.getDate() + daysUntilTarget);
        break;
      case 'monthly':
        // For monthly, we'll schedule for the same date next month
        const targetDayMonthly = scheduleConfig.day || 1; // Default to 1st if no day specified
        nextRun.setDate(targetDayMonthly);
        if (nextRun <= now) {
          nextRun.setMonth(nextRun.getMonth() + 1);
        }
        break;
    }

    return nextRun;
  }
}