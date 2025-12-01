import { Request, Response } from 'express';
import { RecycleBinService } from '../services/recyclebin.service';
import { AuthRequest } from '../middleware/auth-middleware';
import { asyncHandler } from '../middleware/error-handler';
import { sendSuccess, sendError, getPaginationParams } from '../utils/response';

export class RecycleBinController {
  private recycleBinService: RecycleBinService;

  constructor() {
    this.recycleBinService = new RecycleBinService();
  }

  async getRecycleBinDocuments(req: Request, res: Response) {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id as string;
      const { page, limit } = getPaginationParams(req);

      if (!userId) {
        return res.status(401).json({ error: 'User ID not found in token' });
      }

      const result = await this.recycleBinService.getRecycleBinDocuments(userId, page, limit);

      res.json(result);
    } catch (error) {
      console.error('Error in getRecycleBinDocuments:', error);
      res.status(500).json({ error: 'Failed to fetch recycle bin documents' });
    }
  }

  async restoreDocument(req: Request, res: Response) {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id as string;
      const { id } = req.params;

      if (!userId) {
        return res.status(401).json({ error: 'User ID not found in token' });
      }

      if (!id) {
        return res.status(400).json({ error: 'Document ID is required' });
      }

      const result = await this.recycleBinService.restoreDocument(id, userId);

      if (result) {
        res.status(200).json({ message: 'Document restored successfully' });
      } else {
        res.status(500).json({ error: 'Failed to restore document' });
      }
    } catch (error) {
      console.error('Error in restoreDocument:', error);
      res.status(500).json({ error: 'Failed to restore document' });
    }
  }

  /**
   * DELETE /api/recycle-bin - Empty the entire recycle bin for the user's department
   */
  async emptyRecycleBin(req: Request, res: Response) {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id as string;

      if (!userId) {
        return res.status(401).json({ error: 'User ID not found in token' });
      }

      const result = await this.recycleBinService.emptyRecycleBin(userId);

      if (result) {
        res.status(200).json({ message: 'Recycle bin emptied successfully', count: result.count });
      } else {
        res.status(500).json({ error: 'Failed to empty recycle bin' });
      }
    } catch (error) {
      console.error('Error in emptyRecycleBin:', error);
      res.status(500).json({ error: 'Failed to empty recycle bin' });
    }
  }

  /**
   * POST /api/recycle-bin/bulk-restore - Bulk restore documents from recycle bin
   */
  async bulkRestoreDocuments(req: Request, res: Response) {
    try {
      console.log('📍 [RecycleBinController.bulkRestoreDocuments] Request received');
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id as string;
      const { documentIds } = req.body;

      console.log('📍 [RecycleBinController.bulkRestoreDocuments] User ID:', userId, 'Document IDs:', documentIds);

      if (!userId) {
        console.log('📍 [RecycleBinController.bulkRestoreDocuments] User ID not found in token');
        return res.status(401).json({ error: 'User ID not found in token' });
      }

      if (!Array.isArray(documentIds) || documentIds.length === 0) {
        console.log('📍 [RecycleBinController.bulkRestoreDocuments] Invalid document IDs');
        return res.status(400).json({ error: 'Document IDs must be a non-empty array.' });
      }

      console.log('📍 [RecycleBinController.bulkRestoreDocuments] Calling service method');
      const result = await this.recycleBinService.bulkRestoreDocuments(documentIds, userId);
      console.log('📍 [RecycleBinController.bulkRestoreDocuments] Service method completed with result:', result);

      res.status(200).json({
        message: `${result.count} document(s) restored successfully`,
        count: result.count,
        failed: result.failed
      });
    } catch (error: any) {
      console.error('Error in bulkRestoreDocuments:', error);
      console.error('Error stack:', error.stack);
      res.status(500).json({
        error: 'Failed to restore documents from recycle bin',
        message: error.message || 'Internal server error'
      });
    }
  }
}