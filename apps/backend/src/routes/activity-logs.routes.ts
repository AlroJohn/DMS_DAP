import { Router, Request, Response } from 'express';
import { ActivityLogsController } from '../controllers/activity-logs.controller';
import { authMiddleware, AuthRequest } from '../middleware/auth-middleware';

const router = Router();
const activityLogsController = new ActivityLogsController();

// Get activity logs with optional filters
router.get('/activity-logs', authMiddleware, (req: Request, res: Response) => 
  activityLogsController.getActivityLogs(req as AuthRequest, res)
);

// Get activity statistics
router.get('/activity-stats', authMiddleware, (req: Request, res: Response) => 
  activityLogsController.getActivityStats(req as AuthRequest, res)
);

// Get activity logs for a specific document
router.get('/activity-logs/:documentId', authMiddleware, (req: Request, res: Response) => 
  activityLogsController.getActivityLogsByDocument(req as AuthRequest, res)
);

export default router;
