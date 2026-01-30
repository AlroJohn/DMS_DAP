import { Router } from 'express';
import {
  getUsageReport,
  getVersionHistoryReport,
  getDocumentVersionHistory,
  compareDocumentVersions,
  getComplianceReport,
  exportComplianceReport,
  scheduleComplianceReport,
  downloadScheduledReport,
  getScheduledReports,
  triggerScheduledReports,
  setReportForImmediateRun,
  regenerateScheduledReport,
  getSigningHistory,
  getDocumentTypeAndProcessStats
} from '../controllers/document-reports.controller';
import { authMiddleware } from '../middleware/auth-middleware';

const router = Router();

// Get usage report
router.get('/usage', authMiddleware, getUsageReport);

// Get version history report for all documents
router.get('/versions', authMiddleware, getVersionHistoryReport);

// Get version history for a specific document
router.get('/versions/:documentId', authMiddleware, getDocumentVersionHistory);

// Compare two document versions
router.post('/versions/compare', authMiddleware, compareDocumentVersions);

// Get compliance report
router.get('/compliance', authMiddleware, getComplianceReport);

// Export compliance report
router.get('/compliance/export', authMiddleware, exportComplianceReport);

// Schedule compliance report
router.post('/compliance/schedule', authMiddleware, scheduleComplianceReport);

// Get all scheduled reports for current user
router.get('/scheduled', authMiddleware, getScheduledReports);

// Manually trigger scheduled reports processing (for testing)
router.post('/scheduled/trigger', authMiddleware, triggerScheduledReports);

// Set a scheduled report to run immediately (for testing)
router.post('/scheduled/:reportId/run-now', authMiddleware, setReportForImmediateRun);

// Regenerate a scheduled report
router.post('/scheduled/:reportId/regenerate', authMiddleware, regenerateScheduledReport);

// Download scheduled report
router.get('/scheduled/:reportId/download', authMiddleware, downloadScheduledReport);

// Get signing history
router.get('/signing', authMiddleware, getSigningHistory);

// Get document type and process statistics
router.get('/stats', authMiddleware, getDocumentTypeAndProcessStats);

export default router;