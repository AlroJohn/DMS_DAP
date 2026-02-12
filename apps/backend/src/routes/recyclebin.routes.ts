import { Router } from 'express';
import { RecycleBinController } from '../controllers/recyclebin.controller';
import { authMiddleware } from '../middleware/auth-middleware';
import { requirePermission } from '../middleware/auth-middleware';
import { recycleBinCleanupProcessor } from '../services/recycle-bin-cleanup.processor';

const router = Router();
const recycleBinController = new RecycleBinController();

// Apply authentication to all routes
router.use(authMiddleware);

// GET /api/recycle-bin - Get documents in recycle bin (requires document_read permission)
router.get('/',
  requirePermission('document_read'),
  recycleBinController.getRecycleBinDocuments.bind(recycleBinController)
);

// GET /api/recycle-bin/stats - Get recycle bin statistics including auto-cleanup info
router.get('/stats',
  requirePermission('document_read'),
  async (req, res) => {
    try {
      const stats = await recycleBinCleanupProcessor.getRecycleBinStats();
      res.json({
        success: true,
        data: {
          ...stats,
          retentionDays: recycleBinCleanupProcessor.getRetentionDays(),
          autoCleanupEnabled: true,
        },
      });
    } catch (error) {
      console.error('Error getting recycle bin stats:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to get recycle bin statistics' },
      });
    }
  }
);

// POST /api/recycle-bin/trigger-cleanup - Manually trigger cleanup (admin only)
router.post('/trigger-cleanup',
  requirePermission('document_recycle_permanent_delete'),
  async (req, res) => {
    try {
      const result = await recycleBinCleanupProcessor.triggerCleanup();
      res.json({
        success: result.success,
        message: result.message,
      });
    } catch (error) {
      console.error('Error triggering cleanup:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to trigger cleanup' },
      });
    }
  }
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