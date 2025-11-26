import { Router } from 'express';
import counterController from '../controllers/counter.controller';
import { authMiddleware } from '../middleware/auth-middleware';

const router = Router();

router.get('/admin/counts/departments', authMiddleware, counterController.getDepartmentCount);
router.get('/admin/counts/document-types', authMiddleware, counterController.getDocumentTypeCount);
router.get('/admin/counts/document-actions', authMiddleware, counterController.getDocumentActionCount);
router.get('/admin/counts/users', authMiddleware, counterController.getUserCount);

export default router;
