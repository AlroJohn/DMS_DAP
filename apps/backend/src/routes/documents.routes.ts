import express from 'express';
import { DocumentController } from '../controllers/documents.controller';
import { authMiddleware, requirePermission } from '../middleware/auth-middleware';
import { uploadSingle, uploadMultiple } from '../middleware/upload.middleware';

const router = express.Router();
const documentController = new DocumentController();

// Apply authentication to all routes
router.use(authMiddleware);

// GET /api/documents/owned - Get documents owned by current user (requires document_read permission)
router.get('/owned',
  requirePermission('document_read'),
  documentController.getOwnedDocuments
);

// GET /api/documents/completed - Get completed documents (requires document_read permission)
router.get('/completed',
  requirePermission('document_read'),
  documentController.getCompletedDocuments
);

// GET /api/documents/received - Get received documents (requires document_read permission)
router.get('/received',
  requirePermission('document_read'),
  documentController.getReceivedDocuments
);



// GET /api/documents - Get all documents (requires document_read permission)
router.get('/',
  (req, res, next) => {
    next();
  },
  requirePermission('document_read'),
  documentController.getAllDocuments
);

// GET /api/documents/search - Search documents (requires document_read permission)
router.get('/search',
  requirePermission('document_read'),
  documentController.searchDocuments
);

// GET /api/documents/types - Get all document types (requires document_type_read permission)
router.get('/types',
  requirePermission('document_type_read'),
  documentController.getDocumentTypes
);





// GET /api/documents/:id - Get document by ID (requires document_read permission)
router.get('/:id',
  requirePermission('document_read'),
  documentController.getDocumentById
);

// POST /api/documents - Create new document (requires document_create permission)
router.post('/',
  requirePermission('document_create'),
  documentController.createDocument
);

// POST /api/documents/scan - Scan a directory and create documents
router.post('/scan',
  requirePermission('document_create'),
  documentController.scanDocuments
);

// POST /api/documents/upload - Create document with single file upload
router.post('/upload',
  requirePermission('document_create'),
  uploadSingle,
  documentController.createDocumentWithFile
);

// POST /api/documents/:id/files - Upload multiple files to an existing document
router.post('/:id/files',
  requirePermission('document_edit'),
  uploadMultiple,
  documentController.uploadFilesToDocument
);

// GET /api/documents/:id/files - List document files
router.get('/:id/files',
  requirePermission('document_read'),
  documentController.getDocumentFiles
);

// GET /api/documents/:id/files/:fileId/stream - Stream a specific document file inline
router.get('/:id/files/:fileId/stream',
  requirePermission('document_read'),
  documentController.streamDocumentFile
);

// GET /api/documents/:id/files/:fileId/download - Download a specific document file
router.get('/:id/files/:fileId/download',
  requirePermission('document_read'),
  documentController.downloadDocumentFile
);

// DELETE /api/documents/:id/files/:fileId - Delete a specific document file
router.delete('/:id/files/:fileId',
  requirePermission('document_edit'),
  documentController.deleteDocumentFile
);

// PUT /api/documents/:id - Update document (requires document_edit permission)
router.put('/:id',
  requirePermission('document_edit'),
  documentController.updateDocument
);

// DELETE /api/documents/bulk-delete - Bulk delete documents
router.delete('/bulk-delete',
  requirePermission('document_delete'),
  documentController.bulkDeleteDocuments
);



// DELETE /api/documents/:id - Delete document (requires document_delete permission)
router.delete('/:id',
  requirePermission('document_delete'),
  documentController.deleteDocument
);

// POST /api/documents/:id/complete - Mark a document as complete
router.post('/:id/complete',
  requirePermission('document_write'),
  documentController.completeDocument
);

// POST /api/documents/:id/cancel - Cancel a document
router.post('/:id/cancel',
  requirePermission('document_write'),
  documentController.cancelDocument
);

// POST /api/documents/:id/receive - Receive a document
router.post('/:id/receive',
  requirePermission('document_write'),
  documentController.receiveDocument
);

// POST /api/documents/:id/sign - Sign document with blockchain
router.post('/:id/sign',
  requirePermission('document_write'),
  documentController.signDocument
);

// POST /api/documents/:id/share - Share document with specific users
router.post('/:id/share',
  requirePermission('document_write'),
  documentController.shareDocument
);



export default router;