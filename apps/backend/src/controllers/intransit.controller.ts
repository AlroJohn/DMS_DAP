import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth-middleware';
import { IntransitService } from '../services/intransit.service';

export class IntransitController {
  private intransitService: IntransitService;

  constructor() {
    this.intransitService = new IntransitService();
  }

  async getIncomingDocuments(req: Request, res: Response) {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      if (!userId) {
        return res.status(401).json({ error: 'User ID not found in token' });
      }

      const result = await this.intransitService.getIncomingDocuments(userId, page, limit);

      res.json(result);
    } catch (error) {
      console.error('Error in getIncomingDocuments:', error);
      res.status(500).json({ error: 'Failed to fetch incoming documents' });
    }
  }

  async getOutgoingDocuments(req: Request, res: Response) {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      if (!userId) {
        return res.status(401).json({ error: 'User ID not found in token' });
      }

      const result = await this.intransitService.getOutgoingDocuments(userId, page, limit);

      res.json(result);
    } catch (error) {
      console.error('Error in getOutgoingDocuments:', error);
      res.status(500).json({ error: 'Failed to fetch outgoing documents' });
    }
  }
}