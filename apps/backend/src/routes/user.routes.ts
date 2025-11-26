import express from 'express';
import { UserController } from '../controllers/user.controller';
import { authMiddleware } from '../middleware/auth-middleware';

const router = express.Router();
const userController = new UserController();

// All user management routes require authentication
router.use(authMiddleware);

// User CRUD operations (admin only)
// POST /api/admin/users - Create new user (requires user_create permission)
router.post('/', userController.createUser);

// GET /api/admin/users - Get all users (requires user_read permission)
router.get('/', userController.getAllUsers);

// GET /api/admin/users/:id - Get user by ID (requires user_read permission)
router.get('/:id', userController.getUserById);

// PUT /api/admin/users/:id - Update user (requires user_edit permission)
router.put('/:id', userController.updateUser);

// PATCH /api/admin/users/:id/toggle-status - Toggle user status (requires user_activate permission)
router.patch('/:id/toggle-status', userController.toggleUserStatus);

// DELETE /api/admin/users/:id - Soft delete user (requires user_delete permission)
router.delete('/:id', userController.deleteUser);

// Document sharing related route - allows searching users with minimal info
// GET /api/users/search - Get users for document sharing (requires document_share permission)
router.get('/search', userController.getUsersForDocumentSharing);

export default router;
