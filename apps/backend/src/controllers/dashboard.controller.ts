import { Request, Response } from 'express';
import { DashboardService } from '../services/dashboard.service';

interface AuthRequest extends Request {
  user?: {
    id: string;
    account_id: string;
  };
}

export class DashboardController {
  private dashboardService: DashboardService;

  constructor() {
    this.dashboardService = new DashboardService();
  }

  async getDocumentStats(req: Request, res: Response) {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized - User not authenticated'
        });
      }

      const stats = await this.dashboardService.getDocumentStats(userId);
      res.json({ success: true, data: stats });
    } catch (error: any) {
      console.error('Error in getDocumentStats controller:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Internal server error'
      });
    }
  }

  async getDashboardStats(req: Request, res: Response) {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized - User not authenticated'
        });
      }

      const stats = await this.dashboardService.getDashboardStats(userId);
      res.json({ success: true, data: stats });
    } catch (error: any) {
      console.error('Error in getDashboardStats controller:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Internal server error'
      });
    }
  }
}

export const dashboardController = new DashboardController();
