import express from 'express';
import { UserController } from '../controllers/user.controller';
import { authMiddleware } from '../middleware/auth-middleware';

const router = express.Router();
const userController = new UserController();

// Apply authentication to all routes
router.use(authMiddleware);

// GET /api/users/search - Get users for document sharing (requires document_share permission)
router.get('/search', userController.getUsersForDocumentSharing);

export default router;