import { Router } from 'express';
import {
  getUsageReport,
  getVersionHistoryReport,
  getDocumentVersionHistory,
  compareDocumentVersions
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

export default router;