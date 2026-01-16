import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';
import { authMiddleware, AuthRequest } from '../middleware/auth-middleware';

const router = Router();
const dashboardController = new DashboardController();

router.get('/stats', authMiddleware, (req, res) =>
  dashboardController.getStats(req as AuthRequest, res)
);

export default router;
