import { Router } from 'express';
import { 
  getNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead, 
  deleteNotification,
  deleteAllNotifications,
  createNotification 
} from '../controllers/notificationController';
import { authMiddleware as authenticateToken } from '../middleware/auth-middleware';

const router = Router();

router.get('/', authenticateToken, getNotifications);
router.patch('/read-all', authenticateToken, markAllNotificationsAsRead);
router.delete('/delete-all', authenticateToken, deleteAllNotifications);
router.patch('/:notificationId/read', authenticateToken, markNotificationAsRead);
router.delete('/:notificationId', authenticateToken, deleteNotification);
router.post('/', authenticateToken, createNotification); // Only for admin/internal use

export default router;