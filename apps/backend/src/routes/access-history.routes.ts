import { Router, Request, Response } from 'express';
import { AccessHistoryController } from '../controllers/access-history.controller';
import { authMiddleware, AuthRequest } from '../middleware/auth-middleware';

const router = Router();
const accessHistoryController = new AccessHistoryController();

// Get access history with optional filters
router.get('/access-history', authMiddleware, (req: Request, res: Response) =>
  accessHistoryController.getAccessHistory(req as AuthRequest, res)
);

// Get access history statistics
router.get('/access-history-stats', authMiddleware, (req: Request, res: Response) =>
  accessHistoryController.getAccessHistoryStats(req as AuthRequest, res)
);

// Get access history for a specific document
router.get('/access-history/document/:documentId', authMiddleware, (req: Request, res: Response) =>
  accessHistoryController.getAccessHistoryByDocument(req as AuthRequest, res)
);

// Get access history for a specific user
router.get('/access-history/user/:userId', authMiddleware, (req: Request, res: Response) =>
  accessHistoryController.getAccessHistoryByUser(req as AuthRequest, res)
);

export default router;
