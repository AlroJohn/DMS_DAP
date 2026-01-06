import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';
import { authMiddleware } from '../middleware/auth-middleware';

const router = Router();
const dashboardController = new DashboardController();

router.get('/stats', authMiddleware, dashboardController.getStats);

export default router;