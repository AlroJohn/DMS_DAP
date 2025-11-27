import { Router } from 'express';
import { DocumentTrailsController } from '../controllers/document-trails.controller';
import { authMiddleware, requirePermission } from '../middleware/auth-middleware';

const router = Router();
const documentTrailsController = new DocumentTrailsController();

// Apply authentication to all routes
router.use(authMiddleware);

// Get all document trails for a specific document
router.get('/:documentId/trails',
  requirePermission('document_read'),
  documentTrailsController.getDocumentTrails
);

// Get all document trails with optional filters
router.get('/trails',
  requirePermission('document_read'),
  documentTrailsController.getAllDocumentTrails
);

// Get a specific document trail by ID
router.get('/trails/:trailId',
  requirePermission('document_read'),
  documentTrailsController.getDocumentTrailById
);

// Create a new document trail
router.post('/trails',
  requirePermission('document_create'),
  documentTrailsController.createDocumentTrail
);

// Update an existing document trail
router.put('/trails/:trailId',
  requirePermission('document_edit'),
  documentTrailsController.updateDocumentTrail
);

// Delete a document trail
router.delete('/trails/:trailId',
  requirePermission('document_delete'),
  documentTrailsController.deleteDocumentTrail
);

export default router;