import express from 'express';
import { asyncHandler } from '../middleware/error-handler';
import { authMiddleware } from '../middleware/auth-middleware';
import { DocumentController } from '../controllers/documents.controller';

const router = express.Router();
const documentController = new DocumentController();

// POST /api/documents/:documentId/sign - Sign a document from placeholders
router.post('/:documentId/sign', authMiddleware, asyncHandler(documentController.signDocument));

export default router;
