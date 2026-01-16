import { Router } from 'express';
import { DocumentTrailingController } from '../controllers/document-trailing.controller';
import { authMiddleware, requirePermission, AuthRequest } from '../middleware/auth-middleware';

const router = Router();
const documentTrailingController = new DocumentTrailingController();

// Apply authentication to all routes
router.use(authMiddleware);

// Get document trails for a specific department
router.get('/departments/:departmentId/trails', 
  requirePermission('document_read'),
  (req, res) => documentTrailingController.getDocumentTrailsForDepartment(req as AuthRequest, res)
);

// Get detailed trail history for a specific document
router.get('/documents/:documentId/trails', 
  requirePermission('document_read'),
  (req, res) => documentTrailingController.getDocumentTrailDetails(req as AuthRequest, res)
);

export default router;
