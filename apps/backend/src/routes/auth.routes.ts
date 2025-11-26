import express from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth-middleware';

const router = express.Router();
const authController = new AuthController();

// POST /api/auth/register - Register new user (requires admin permissions)
router.post('/register', authMiddleware, authController.register);

// POST /api/auth/login - Login user (no auth required)
router.post('/login', authController.login);

// POST /api/auth/refresh - Refresh access token (no auth required)
router.post('/refresh', authController.refreshToken);

// POST /api/auth/logout - Logout user (no auth required, handled client-side)
router.post('/logout', authController.logout);

// GET /api/auth/me - Get current user info (requires authentication)
router.get('/me', authMiddleware, authController.getCurrentUser);

// GET /api/auth/socket-token - Get token for Socket.IO authentication (requires authentication)
router.get('/socket-token', authMiddleware, authController.getSocketToken);

// PUT /api/auth/permissions - Update user permissions (DEPRECATED - use role management)
router.put('/permissions', authMiddleware, authController.updatePermissions);

// POST /api/auth/forgot-password - Request password reset (no auth required)
router.post('/forgot-password', authController.forgotPassword);

// POST /api/auth/reset-password - Reset password with token (no auth required)
router.post('/reset-password', authController.resetPassword);

// POST /api/auth/verify-reset-token - Verify reset token validity (no auth required)
router.post('/verify-reset-token', authController.verifyResetToken);

// Role management endpoints (all require authentication)
// GET /api/auth/roles - Get all available roles (requires role_read permission)
router.get('/roles', authMiddleware, authController.getAllRoles);

// GET /api/auth/user/:userId/roles - Get user roles (requires role_read permission)
router.get('/user/:userId/roles', authMiddleware, authController.getUserRoles);

// POST /api/auth/user/:userId/roles - Assign role to user (requires role_assign permission)
router.post('/user/:userId/roles', authMiddleware, authController.assignRoleToUser);

// DELETE /api/auth/user/:userId/roles/:roleId - Remove role from user (requires role_assign permission)
router.delete('/user/:userId/roles/:roleId', authMiddleware, authController.removeRoleFromUser);

export default router;
