import { Request, Response } from 'express';
import { DashboardService } from '../services/dashboard.service';
import { AuthRequest } from '../middleware/auth-middleware';

export class DashboardController {
  private dashboardService: DashboardService;

  constructor() {
    this.dashboardService = new DashboardService();
  }

  getStats = async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      const stats = await this.dashboardService.getDashboardStats(req.user.user_id);
      res.json({ success: true, data: stats });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };
}