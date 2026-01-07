import { Request, Response } from 'express';
import { DocumentReportsService } from '../services/document-reports.service';
import { ScheduledReportsProcessor } from '../services/scheduled-reports.processor';
import * as fs from 'fs';
import { PrismaClient } from '@prisma/client';

const documentReportsService = new DocumentReportsService();
const prisma = new PrismaClient();

export const getUsageReport = async (req: Request, res: Response) => {
  try {
    const { dateRange } = req.query;
    const report = await documentReportsService.getUsageReport(dateRange as string || '30days');
    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error getting usage report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve usage report',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getVersionHistoryReport = async (req: Request, res: Response) => {
  try {
    const report = await documentReportsService.getVersionHistoryReport();
    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error getting version history report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve version history report',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getDocumentVersionHistory = async (req: Request, res: Response) => {
  try {
    const { documentId } = req.params;
    
    if (!documentId) {
      return res.status(400).json({
        success: false,
        message: 'Document ID is required'
      });
    }

    const versionHistory = await documentReportsService.getDocumentVersionHistory(documentId);
    res.json({
      success: true,
      data: versionHistory
    });
  } catch (error) {
    console.error('Error getting document version history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve document version history',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const compareDocumentVersions = async (req: Request, res: Response) => {
  try {
    const { fileId1, fileId2 } = req.body;

    if (!fileId1 || !fileId2) {
      return res.status(400).json({
        success: false,
        message: 'Both fileId1 and fileId2 are required in the request body'
      });
    }

    const comparison = await documentReportsService.compareDocumentVersions(fileId1, fileId2);
    res.json({
      success: true,
      data: comparison
    });
  } catch (error) {
    console.error('Error comparing document versions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to compare document versions',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getComplianceReport = async (req: Request, res: Response) => {
  try {
    const report = await documentReportsService.getComplianceReport();
    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error getting compliance report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve compliance report',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const exportComplianceReport = async (req: Request, res: Response) => {
  try {
    const { format } = req.query;
    const validFormats = ['pdf', 'csv', 'excel'];

    // Validate format
    if (format && !validFormats.includes(format as string)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid format. Please use pdf, csv, or excel.'
      });
    }

    const exportFormat = (format as 'pdf' | 'csv' | 'excel') || 'pdf';
    const exportData = await documentReportsService.exportComplianceReport(exportFormat);

    // Set appropriate headers for file download
    res.setHeader('Content-Type', exportData.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${exportData.filename}"`);

    res.send(exportData.data);
  } catch (error) {
    console.error('Error exporting compliance report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export compliance report',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const scheduleComplianceReport = async (req: Request, res: Response) => {
  try {
    const { frequency, day, time } = req.body;

    // Validate required fields
    if (!frequency || !time) {
      return res.status(400).json({
        success: false,
        message: 'Frequency and time are required fields.'
      });
    }

    const validFrequencies = ['daily', 'weekly', 'monthly'];
    if (!validFrequencies.includes(frequency)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid frequency. Please use daily, weekly, or monthly.'
      });
    }

    // Validate time format (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(time)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid time format. Please use HH:MM format (e.g., 09:00).'
      });
    }

    // Validate day if frequency is weekly or monthly
    if ((frequency === 'weekly' && (day === undefined || day < 0 || day > 6)) ||
        (frequency === 'monthly' && (day === undefined || day < 1 || day > 31))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid day for the selected frequency.'
      });
    }

    // Get user ID from the authenticated request
    const userId = (req as any).user.id;

    const schedule = {
      frequency,
      day: day ? parseInt(day) : undefined,
      time
    };

    const scheduledReport = await documentReportsService.scheduleComplianceReport(userId, schedule);

    res.json({
      success: true,
      data: scheduledReport
    });
  } catch (error) {
    console.error('Error scheduling compliance report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to schedule compliance report',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const downloadScheduledReport = async (req: Request, res: Response) => {
  try {
    const { reportId } = req.params;
    const userId = (req as any).user?.id; // User ID from auth middleware

    if (!reportId) {
      return res.status(400).json({
        success: false,
        message: 'Report ID is required'
      });
    }

    // Verify that the user has access to this report
    const scheduledReport = await documentReportsService.getScheduledReportById(reportId);

    if (!scheduledReport) {
      return res.status(404).json({
        success: false,
        message: 'Scheduled report not found'
      });
    }

    // Check if the user owns this report
    if (scheduledReport.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this report'
      });
    }

    // Check if the report file exists
    if (!scheduledReport.reportFilePath || !scheduledReport.reportFileName) {
      return res.status(404).json({
        success: false,
        message: 'Report file not available yet. The report may not have been generated yet.',
        details: 'Please wait for the scheduled time or manually trigger report generation.'
      });
    }

    // Check if the file exists on the filesystem
    if (!fs.existsSync(scheduledReport.reportFilePath)) {
      console.error(`Report file not found at path: ${scheduledReport.reportFilePath}`);
      return res.status(404).json({
        success: false,
        message: 'Report file not found on the server',
        details: `Expected file path: ${scheduledReport.reportFilePath}`
      });
    }

    // Check file size - if it's suspiciously small, it might be empty/corrupted
    const fileStats = fs.statSync(scheduledReport.reportFilePath);
    if (fileStats.size < 100) {
      console.warn(`Report file is suspiciously small (${fileStats.size} bytes). It may be empty or corrupted.`);
      return res.status(400).json({
        success: false,
        message: 'Report file appears to be empty or corrupted',
        details: 'Please regenerate the report using the "Regenerate" button.',
        fileSize: fileStats.size
      });
    }

    // Set headers for file download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(scheduledReport.reportFileName)}"`);

    // Stream the file to the response with error handling
    const fileStream = fs.createReadStream(scheduledReport.reportFilePath);
    
    fileStream.on('error', (error) => {
      console.error('Error reading report file:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Error reading report file',
          error: error.message
        });
      }
    });

    fileStream.pipe(res);

  } catch (error) {
    console.error('Error downloading scheduled report:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Failed to download scheduled report',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
};

/**
 * Get all scheduled reports for the current user
 */
export const getScheduledReports = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const scheduledReports = await prisma.scheduledReport.findMany({
      where: {
        user_id: userId
      },
      orderBy: {
        created_at: 'desc'
      },
      include: {
        user: {
          select: {
            user_id: true,
            first_name: true,
            last_name: true
          }
        }
      }
    });

    const formattedReports = scheduledReports.map(report => ({
      id: report.scheduled_report_id,
      userId: report.user_id,
      type: report.report_type,
      schedule: report.schedule_config ? {
        frequency: (report.schedule_config as any).frequency as 'daily' | 'weekly' | 'monthly',
        day: (report.schedule_config as any).day as number | undefined,
        time: (report.schedule_config as any).time as string
      } : null,
      nextRun: report.next_run,
      lastRun: report.last_run,
      isActive: report.is_active,
      reportFileName: (report as any).report_file_name || null,
      reportGeneratedAt: (report as any).report_generated_at || null,
      createdAt: report.created_at
    }));

    res.json({
      success: true,
      data: formattedReports
    });
  } catch (error) {
    console.error('Error getting scheduled reports:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve scheduled reports',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Manually trigger processing of scheduled reports (for testing)
 */
export const triggerScheduledReports = async (req: Request, res: Response) => {
  try {
    console.log('[MANUAL TRIGGER] Manually triggering scheduled reports processing...');
    
    // Create a new processor instance and trigger processing
    const processor = new ScheduledReportsProcessor();
    await processor.processScheduledReports();

    res.json({
      success: true,
      message: 'Scheduled reports processing triggered successfully. Check server logs for details.'
    });
  } catch (error) {
    console.error('Error triggering scheduled reports:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to trigger scheduled reports',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Regenerate a specific scheduled report
 */
export const regenerateScheduledReport = async (req: Request, res: Response) => {
  try {
    const { reportId } = req.params;
    const userId = (req as any).user.id;

    // Get the scheduled report
    const scheduledReport = await prisma.scheduledReport.findUnique({
      where: {
        scheduled_report_id: reportId
      }
    });

    if (!scheduledReport) {
      return res.status(404).json({
        success: false,
        message: 'Scheduled report not found'
      });
    }

    // Check if the user owns this report
    if (scheduledReport.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this report'
      });
    }

    // Regenerate the report
    const processor = new ScheduledReportsProcessor();
    await processor.regenerateReport(reportId);

    res.json({
      success: true,
      message: 'Report regenerated successfully. You can now download it.'
    });
  } catch (error) {
    console.error('Error regenerating scheduled report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to regenerate scheduled report',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Set next_run to past time for immediate testing
 */
export const setReportForImmediateRun = async (req: Request, res: Response) => {
  try {
    const { reportId } = req.params;
    const userId = (req as any).user.id;

    // Get the scheduled report
    const scheduledReport = await prisma.scheduledReport.findUnique({
      where: {
        scheduled_report_id: reportId
      }
    });

    if (!scheduledReport) {
      return res.status(404).json({
        success: false,
        message: 'Scheduled report not found'
      });
    }

    // Check if the user owns this report
    if (scheduledReport.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this report'
      });
    }

    // Set next_run to 1 minute ago to trigger immediate processing
    const pastTime = new Date();
    pastTime.setMinutes(pastTime.getMinutes() - 1);

    await prisma.scheduledReport.update({
      where: {
        scheduled_report_id: reportId
      },
      data: {
        next_run: pastTime
      }
    });

    res.json({
      success: true,
      message: 'Report scheduled for immediate processing. It will be processed within the next 5 minutes (or trigger manually).',
      nextRun: pastTime
    });
  } catch (error) {
    console.error('Error setting report for immediate run:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to set report for immediate run',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getSigningHistory = async (req: Request, res: Response) => {
  try {
    const { dateRange, filter } = req.query;
    const report = await documentReportsService.getSigningHistory(
      dateRange as string,
      filter as string
    );
    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error getting signing history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve signing history',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};