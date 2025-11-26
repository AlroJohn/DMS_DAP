import { Router } from 'express';
import { 
  getNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead, 
  deleteNotification,
  createNotification 
} from '../controllers/notificationController';
import { authMiddleware as authenticateToken } from '../middleware/auth-middleware';

const router = Router();

router.get('/', authenticateToken, getNotifications);
router.patch('/:notificationId/read', authenticateToken, markNotificationAsRead);
router.patch('/read-all', authenticateToken, markAllNotificationsAsRead);
router.delete('/:notificationId', authenticateToken, deleteNotification);
router.post('/', authenticateToken, createNotification); // Only for admin/internal use

export default router;