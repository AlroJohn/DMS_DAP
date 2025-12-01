import { Router } from 'express';
import { RecycleBinController } from '../controllers/recyclebin.controller';
import { authMiddleware } from '../middleware/auth-middleware';
import { requirePermission } from '../middleware/auth-middleware';

const router = Router();
const recycleBinController = new RecycleBinController();

// Apply authentication to all routes
router.use(authMiddleware);

// GET /api/recycle-bin - Get documents in recycle bin (requires document_read permission)
router.get('/',
  requirePermission('document_read'),
  recycleBinController.getRecycleBinDocuments.bind(recycleBinController)
);

// PUT /api/recycle-bin/:id/restore - Restore document from recycle bin (requires document_restore permission)
router.put('/:id/restore',
  requirePermission('document_restore'),
  recycleBinController.restoreDocument.bind(recycleBinController)
);

// DELETE /api/recycle-bin - Empty the entire recycle bin (requires document_recycle_permanent_delete permission)
router.delete('/',
  requirePermission('document_recycle_permanent_delete'),
  recycleBinController.emptyRecycleBin.bind(recycleBinController)
);

// POST /api/recycle-bin/bulk-restore - Bulk restore documents from recycle bin (requires document_recycle_bulk_restore permission)
router.post('/bulk-restore',
  requirePermission('document_recycle_bulk_restore'),
  recycleBinController.bulkRestoreDocuments.bind(recycleBinController)
);

export default router;