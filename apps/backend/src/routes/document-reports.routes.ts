import { Router } from 'express';
import {
  getVersionHistoryReport,
  getDocumentVersionHistory,
  compareDocumentVersions
} from '../controllers/document-reports.controller';
import { authMiddleware } from '../middleware/auth-middleware';

const router = Router();

// Get version history report for all documents
router.get('/versions', authMiddleware, getVersionHistoryReport);

// Get version history for a specific document
router.get('/versions/:documentId', authMiddleware, getDocumentVersionHistory);

// Compare two document versions
router.post('/versions/compare', authMiddleware, compareDocumentVersions);

export default router;