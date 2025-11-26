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
}