import { Request, Response } from 'express';
import { AuthService, LoginCredentials, RegisterData } from '../services/auth.service';
import { PermissionService } from '../services/permission.service';
import { asyncHandler } from '../middleware/error-handler';
import { sendSuccess, sendError, validateRequiredFields } from '../utils/response';
import { AuthRequest } from '../middleware/auth-middleware';
import config from '../config'; // Import config
import { parseExpiresIn } from '../utils/time'; // Import parseExpiresIn

export class AuthController {
  private authService: AuthService;
  private permissionService: PermissionService;

  constructor() {
    this.authService = new AuthService();
    this.permissionService = new PermissionService();
  }

  /**
   * POST /api/auth/register - Register new user (ADMIN ONLY)
   * This endpoint is now restricted to admin users only
   */
  register = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;

    // Check if user has user creation permissions
    const canCreateUsers = await this.permissionService.hasAnyPermission(
      authReq.user.id,
      ['user_create', 'user_edit', 'user_delete']
    );

    if (!canCreateUsers) {
      return sendError(res, 'Only administrators can create new user accounts', 403);
    }

    const missingFields = validateRequiredFields(req.body, ['email', 'password']);

    if (missingFields.length > 0) {
      return sendError(res, `Missing required fields: ${missingFields.join(', ')}`, 400);
    }

    const { email, password, name, departmentId } = req.body;

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return sendError(res, 'Invalid email format', 400);
    }

    // Password strength validation
    if (password.length < 6) {
      return sendError(res, 'Password must be at least 6 characters long', 400);
    }

    try {
      const registerData: RegisterData = { email, password, name, departmentId };
      const result = await this.authService.register(registerData);

      return sendSuccess(res, result, 201);
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  });

  /**
   * POST /api/auth/login - Login user
   */
  login = asyncHandler(async (req: Request, res: Response) => {
    const missingFields = validateRequiredFields(req.body, ['email', 'password']);

    if (missingFields.length > 0) {
      return sendError(res, `Missing required fields: ${missingFields.join(', ')}`, 400);
    }

    const { email, password } = req.body;
    const credentials: LoginCredentials = { email, password }; // Define credentials

    try {
      const { user, token, refreshToken } = await this.authService.login(credentials);

      // Set HttpOnly cookies
      res.cookie('accessToken', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax', // Fixed casing
        domain: 'localhost', // Added for localhost development
        maxAge: parseExpiresIn(config.jwt.expiresIn), // Use helper function
      });
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax', // Fixed casing
        domain: 'localhost', // Added for localhost development
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      return sendSuccess(res, { user });
    } catch (error: any) {
      return sendError(res, error.message, 401);
    }
  });

  /**
   * POST /api/auth/refresh - Refresh access token
   */
  refreshToken = asyncHandler(async (req: Request, res: Response) => {
    const currentRefreshToken = req.cookies.refreshToken; // Get refresh token from cookie

    if (!currentRefreshToken) {
      return sendError(res, 'Refresh token is required', 400);
    }

    try {
      const { token, refreshToken } = await this.authService.refreshToken(currentRefreshToken);

      // Set new HttpOnly cookies
      res.cookie('accessToken', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax', // Fixed casing
        maxAge: parseExpiresIn(config.jwt.expiresIn), // Use helper function
      });
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax', // Fixed casing
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      return sendSuccess(res, { message: 'Tokens refreshed successfully' });
    } catch (error: any) {
      return sendError(res, error.message, 401);
    }
  });

  /**
   * POST /api/auth/logout - Logout user (client-side token removal)
   */
  logout = asyncHandler(async (req: Request, res: Response) => {
    // Clear HttpOnly cookies
    res.cookie('accessToken', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // Fixed casing
      expires: new Date(0),
    });
    res.cookie('refreshToken', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // Fixed casing
      expires: new Date(0),
    });

    return sendSuccess(res, { message: 'Logged out successfully' });
  });

  /**
   * GET /api/auth/me - Get current user info
   */
  getCurrentUser = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;

    if (!authReq.user) {
      return sendError(res, 'User not authenticated', 401);
    }

    const user = await this.authService.getUserById(authReq.user.id);

    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    // Prevent caching of user data
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    return sendSuccess(res, user);
  });

  /**
   * PUT /api/auth/permissions - Update user permissions (admin only)
   * DEPRECATED: Use role management endpoints instead
   */
  updatePermissions = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const { userId, permissions } = req.body;

    if (!userId || !permissions || !Array.isArray(permissions)) {
      return sendError(res, 'userId and permissions array are required', 400);
    }

    // Check if user has permission management rights
    const canManagePermissions = await this.permissionService.hasAnyPermission(
      authReq.user.id,
      ['permission_assign', 'permission_revoke', 'role_assign']
    );

    if (!canManagePermissions) {
      return sendError(res, 'Insufficient permissions to update user permissions', 403);
    }

    // This method is deprecated - redirect to role management
    return sendError(res, 'This endpoint is deprecated. Use role management endpoints instead.', 410);
  });

  /**
   * Generate tokens for OAuth user
   */
  async generateTokensForUser(userId: string): Promise<{ token: string; refreshToken: string }> {
    return await this.authService.generateTokensForUser(userId);
  }

  /**
   * Link Google account to existing user
   */
  async linkGoogleAccount(userId: string, googleId: string): Promise<boolean> {
    return await this.authService.linkGoogleAccount(userId, googleId);
  }

  /**
   * Unlink Google account from user
   */
  async unlinkGoogleAccount(userId: string): Promise<boolean> {
    return await this.authService.unlinkGoogleAccount(userId);
  }

  /**
   * POST /api/auth/forgot-password - Request password reset
   */
  forgotPassword = asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;

    if (!email) {
      return sendError(res, 'Email is required', 400);
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return sendError(res, 'Invalid email format', 400);
    }

    try {
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent');

      const result = await this.authService.requestPasswordReset(email, ipAddress, userAgent);

      return sendSuccess(res, result);
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  });

  /**
   * POST /api/auth/reset-password - Reset password with token
   */
  resetPassword = asyncHandler(async (req: Request, res: Response) => {
    const { token, password } = req.body;

    if (!token || !password) {
      return sendError(res, 'Token and password are required', 400);
    }

    // Password strength validation
    if (password.length < 6) {
      return sendError(res, 'Password must be at least 6 characters long', 400);
    }

    try {
      const result = await this.authService.resetPassword(token, password);

      if (result.success) {
        return sendSuccess(res, result);
      } else {
        return sendError(res, result.message, 400);
      }
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  });

  /**
   * POST /api/auth/verify-reset-token - Verify reset token validity
   */
  verifyResetToken = asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.body;

    if (!token) {
      return sendError(res, 'Token is required', 400);
    }

    try {
      const result = await this.authService.verifyResetToken(token);

      if (result.valid) {
        return sendSuccess(res, result);
      } else {
        return sendError(res, result.message, 400);
      }
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  });

  /**
   * GET /api/auth/roles - Get all available roles (admin only)
   */
  getAllRoles = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;

    // Check if user has role read permissions
    const canReadRoles = await this.permissionService.hasPermission(
      authReq.user.id,
      'role_read'
    );

    if (!canReadRoles) {
      return sendError(res, 'Insufficient permissions to view roles', 403);
    }

    try {
      const roles = await this.permissionService.getAllRoles();
      return sendSuccess(res, roles);
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  });

  /**
   * GET /api/auth/user/:userId/roles - Get user roles (admin only)
   */
  getUserRoles = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const { userId } = req.params;

    // Check if user has role read permissions
    const canReadRoles = await this.permissionService.hasPermission(
      authReq.user.id,
      'role_read'
    );

    if (!canReadRoles) {
      return sendError(res, 'Insufficient permissions to view user roles', 403);
    }

    try {
      const roles = await this.permissionService.getUserRoles(userId);
      return sendSuccess(res, roles);
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  });

  /**
   * POST /api/auth/user/:userId/roles - Assign role to user (admin only)
   */
  assignRoleToUser = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const { userId } = req.params;
    const { roleId, expiresAt } = req.body;

    // Check if user has role assignment permissions
    const canAssignRoles = await this.permissionService.hasPermission(
      authReq.user.id,
      'role_assign'
    );

    if (!canAssignRoles) {
      return sendError(res, 'Insufficient permissions to assign roles', 403);
    }

    if (!roleId) {
      return sendError(res, 'roleId is required', 400);
    }

    try {
      const success = await this.permissionService.assignRoleToUser(
        userId,
        roleId,
        authReq.user.id,
        expiresAt ? new Date(expiresAt) : undefined
      );

      if (success) {
        return sendSuccess(res, { message: 'Role assigned successfully' });
      } else {
        return sendError(res, 'Failed to assign role', 500);
      }
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  });

  /**
   * DELETE /api/auth/user/:userId/roles/:roleId - Remove role from user (admin only)
   */
  removeRoleFromUser = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const { userId, roleId } = req.params;

    // Check if user has role assignment permissions
    const canAssignRoles = await this.permissionService.hasPermission(
      authReq.user.id,
      'role_assign'
    );

    if (!canAssignRoles) {
      return sendError(res, 'Insufficient permissions to remove roles', 403);
    }

    try {
      const success = await this.permissionService.removeRoleFromUser(userId, roleId);

      if (success) {
        return sendSuccess(res, { message: 'Role removed successfully' });
      } else {
        return sendError(res, 'Failed to remove role', 500);
      }
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  });

  /**
   * GET /api/auth/socket-token - Get token for Socket.IO authentication
   * Returns the current user's access token from cookies for WebSocket auth
   */
  getSocketToken = asyncHandler(async (req: Request, res: Response) => {
    // Get the access token from cookies
    const token = req.cookies.accessToken;

    if (!token) {
      return sendError(res, 'No access token found', 401);
    }

    // Return the token for Socket.IO authentication
    return sendSuccess(res, { token });
  });
}
