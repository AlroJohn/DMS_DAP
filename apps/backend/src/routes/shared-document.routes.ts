import { Router } from 'express';
import { SharedDocumentController } from '../controllers/shared-document.controller';
import { authMiddleware } from '../middleware/auth-middleware';
import { requirePermission } from '../middleware/auth-middleware';

const router = Router();
const sharedDocumentController = new SharedDocumentController();

// Apply authentication to all routes
router.use(authMiddleware);

// GET /api/shared - Get documents shared to current user (requires document_read permission)
router.get('/',
  requirePermission('document_read'),
  sharedDocumentController.getSharedDocuments.bind(sharedDocumentController)
);

// POST /api/shared/:id/share - Share a document with specific users (requires document_write permission)
router.post('/:id/share',
  requirePermission('document_write'),
  sharedDocumentController.shareDocument.bind(sharedDocumentController)
);

export default router;