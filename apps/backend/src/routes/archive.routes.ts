import { Router } from 'express';
import { ArchiveController } from '../controllers/archive.controller';
import { authMiddleware as authenticateToken } from '../middleware/auth-middleware';

const router = Router();
const archiveController = new ArchiveController();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Archive a document
router.post('/:documentId/archive', archiveController.archiveDocument);

// Restore an archived document
router.post('/:documentId/restore', archiveController.restoreDocument);

// Get all archived documents
router.get('/', archiveController.getArchivedDocuments);

// Get a specific archived document
router.get('/:documentId', archiveController.getArchivedDocument);

export default router;