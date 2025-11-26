import express from 'express';
import { DocumentReleaseController } from '../controllers/document-release.controller';
import { authMiddleware, requirePermission } from '../middleware/auth-middleware';

const router = express.Router();
const documentReleaseController = new DocumentReleaseController();

// Apply authentication to all routes
router.use(authMiddleware);

// POST /api/documents/:id/release - Release a document to another department
router.post('/:id/release',
  requirePermission('document_write'),
  documentReleaseController.releaseDocument
);

// POST /api/documents/:id/receive - Receive a document
router.post('/:id/receive',
  requirePermission('document_write'),
  documentReleaseController.receiveDocument
);

export default router;