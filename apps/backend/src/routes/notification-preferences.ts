import { Router } from 'express';
import { 
  getNotificationPreferences,
  updateNotificationSettings,
  updateNotificationPreference,
  updateBulkNotificationPreferences
} from '../controllers/notification-preferences.controller';
import { authMiddleware as authenticateToken } from '../middleware/auth-middleware';

const router = Router();

router.get('/', authenticateToken, getNotificationPreferences);
router.patch('/settings', authenticateToken, updateNotificationSettings);
router.patch('/preference', authenticateToken, updateNotificationPreference);
router.patch('/bulk', authenticateToken, updateBulkNotificationPreferences);

export default router;
