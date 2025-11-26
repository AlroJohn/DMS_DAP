import express from 'express';
import { DocumentCheckoutController } from '../controllers/document-checkout.controller';
import { authMiddleware, requirePermission } from '../middleware/auth-middleware';

const router = express.Router();
const checkoutController = new DocumentCheckoutController();

// All routes in this file will be under /api/files/
// and should have auth middleware applied.
router.use(authMiddleware);

// GET /api/files/:fileId/status - Get the checkout status of a file
router.get('/:fileId/status',
  requirePermission('document_read'),
  checkoutController.getFileCheckoutStatus
);

// POST /api/files/:fileId/checkout - Check out a file for editing
router.post('/:fileId/checkout',
  requirePermission('document_edit'),
  checkoutController.checkoutFile
);

// POST /api/files/:fileId/checkin - Check in a file to release the lock
router.post('/:fileId/checkin',
  requirePermission('document_edit'),
  checkoutController.checkinFile
);

// POST /api/files/:fileId/override-checkout - Forcefully override a file checkout
router.post('/:fileId/override-checkout',
  requirePermission('document_edit'), // Consider a more specific 'document_override_lock' permission
  checkoutController.overrideFileCheckout
);

export default router;
