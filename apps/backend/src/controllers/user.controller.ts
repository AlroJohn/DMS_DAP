import { Request, Response } from 'express';
import { UserService, CreateUserData, UpdateUserData } from '../services/user.service';
import { PermissionService } from '../services/permission.service';
import { asyncHandler } from '../middleware/error-handler';
import { sendSuccess, sendError, validateRequiredFields } from '../utils/response';
import { AuthRequest } from '../middleware/auth-middleware';

export class UserController {
  private userService: UserService;
  private permissionService: PermissionService;

  constructor() {
    this.userService = new UserService();
    this.permissionService = new PermissionService();
  }

  /**
   * GET /api/admin/users - Get all users (admin only)
   */
  getAllUsers = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;

    // Check if user has user read permissions
    const canReadUsers = await this.permissionService.hasPermission(
      authReq.user.id,
      'user_read'
    );

    if (!canReadUsers) {
      return sendError(res, 'Insufficient permissions to read users', 403);
    }

    try {
      const users = await this.userService.getAllUsersWithRelations();

      return sendSuccess(res, users);
    } catch (error) {
      console.error('Error fetching users:', error);
      return sendError(res, 'Failed to fetch users', 500);
    }
  });

  /**
   * GET /api/admin/users/:id - Get user by ID (admin only)
   */
  getUserById = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const { id } = req.params;

    // Check if user has user read permissions
    const canReadUsers = await this.permissionService.hasPermission(
      authReq.user.id,
      'user_read'
    );

    if (!canReadUsers) {
      return sendError(res, 'Insufficient permissions to read users', 403);
    }

    try {
      const user = await this.userService.getUserByIdWithRelations(id);

      if (!user) {
        return sendError(res, 'User not found', 404);
      }

      return sendSuccess(res, user);
    } catch (error) {
      console.error('Error fetching user:', error);
      return sendError(res, 'Failed to fetch user', 500);
    }
  });

  /**
   * POST /api/admin/users - Create new user (admin only)
   */
  createUser = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;

    // Check if user has user creation permissions
    const canCreateUsers = await this.permissionService.hasPermission(
      authReq.user.id,
      'user_create'
    );

    if (!canCreateUsers) {
      return sendError(res, 'Insufficient permissions to create users', 403);
    }

    const missingFields = validateRequiredFields(req.body, [
      'email', 'password', 'first_name', 'last_name', 'department_id', 'role_id'
    ]);

    if (missingFields.length > 0) {
      return sendError(res, `Missing required fields: ${missingFields.join(', ')}`, 400);
    }

    const {
      email,
      password,
      first_name,
      last_name,
      middle_name,
      user_name,
      title,
      type,
      department_id,
      role_id
    } = req.body;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return sendError(res, 'Invalid email format', 400);
    }

    // Validate password strength
    if (password.length < 8) {
      return sendError(res, 'Password must be at least 8 characters long', 400);
    }

    // Validate names
    if (first_name.length < 1 || first_name.length > 50) {
      return sendError(res, 'First name must be between 1 and 50 characters', 400);
    }

    if (last_name.length < 1 || last_name.length > 50) {
      return sendError(res, 'Last name must be between 1 and 50 characters', 400);
    }

    try {
      const userData: CreateUserData = {
        email,
        password,
        first_name,
        last_name,
        middle_name,
        user_name,
        title,
        type,
        department_id,
        role_id,
      };

      // console.log('🔍 Controller - authReq.user:', authReq.user);
      const newUser = await this.userService.createUser(userData, authReq.user.id);

      return sendSuccess(res, newUser, 201);
    } catch (error: any) {
      console.error('Error creating user:', error);

      if (error.message === 'Email already exists') {
        return sendError(res, 'Email already exists', 409);
      }

      if (error.message === 'Username already exists') {
        return sendError(res, 'Username already exists', 409);
      }

      return sendError(res, 'Failed to create user', 500);
    }
  });

  /**
   * PUT /api/admin/users/:id - Update user (admin only)
   */
  updateUser = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const { id } = req.params;

    // Check if user has user edit permissions
    const canEditUsers = await this.permissionService.hasPermission(
      authReq.user.id,
      'user_edit'
    );

    if (!canEditUsers) {
      return sendError(res, 'Insufficient permissions to edit users', 403);
    }

    const {
      first_name,
      last_name,
      middle_name,
      user_name,
      title,
      type,
      department_id,
      active
    } = req.body;

    // Validate names if provided
    if (first_name && (first_name.length < 1 || first_name.length > 50)) {
      return sendError(res, 'First name must be between 1 and 50 characters', 400);
    }

    if (last_name && (last_name.length < 1 || last_name.length > 50)) {
      return sendError(res, 'Last name must be between 1 and 50 characters', 400);
    }

    try {
      const userData: UpdateUserData = {
        first_name,
        last_name,
        middle_name,
        user_name,
        title,
        type,
        department_id,
        active,
      };

      const updatedUser = await this.userService.updateUser(id, userData);

      if (!updatedUser) {
        return sendError(res, 'User not found', 404);
      }

      return sendSuccess(res, updatedUser);
    } catch (error: any) {
      console.error('Error updating user:', error);

      if (error.message === 'User not found') {
        return sendError(res, 'User not found', 404);
      }

      if (error.message === 'Username already exists') {
        return sendError(res, 'Username already exists', 409);
      }

      return sendError(res, 'Failed to update user', 500);
    }
  });

  /**
   * PATCH /api/admin/users/:id/toggle-status - Toggle user status (admin only)
   */
  toggleUserStatus = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const { id } = req.params;

    // Check if user has user activation/deactivation permissions
    const canActivateUsers = await this.permissionService.hasPermission(
      authReq.user.id,
      'user_activate'
    );

    if (!canActivateUsers) {
      return sendError(res, 'Insufficient permissions to activate/deactivate users', 403);
    }

    try {
      const updatedUser = await this.userService.toggleUserStatus(id);

      if (!updatedUser) {
        return sendError(res, 'User not found', 404);
      }

      return sendSuccess(res, updatedUser);
    } catch (error: any) {
      console.error('Error toggling user status:', error);

      if (error.message === 'User not found') {
        return sendError(res, 'User not found', 404);
      }

      return sendError(res, 'Failed to toggle user status', 500);
    }
  });

  /**
   * GET /api/users/search - Get users for document sharing (limited info, requires document_share permission)
   */
  getUsersForDocumentSharing = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;

    // Check if user has document share permissions
    const canShareDocuments = await this.permissionService.hasPermission(
      authReq.user.id,
      'document_share'
    );

    if (!canShareDocuments) {
      return sendError(res, 'Insufficient permissions to share documents', 403);
    }

    try {
      // Get users with basic information for document sharing
      const users = await this.userService.getUsersForDocumentSharing();

      return sendSuccess(res, users);
    } catch (error) {
      console.error('Error fetching users for document sharing:', error);
      return sendError(res, 'Failed to fetch users for document sharing', 500);
    }
  });

  /**
   * DELETE /api/admin/users/:id - Soft delete user (admin only)
   */
  deleteUser = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const { id } = req.params;

    // Check if user has user deletion permissions
    const canDeleteUsers = await this.permissionService.hasPermission(
      authReq.user.id,
      'user_delete'
    );

    if (!canDeleteUsers) {
      return sendError(res, 'Insufficient permissions to delete users', 403);
    }

    try {
      // Fetch current user state
      const existing = await this.userService.getUserByIdWithRelations(id);

      if (!existing) {
        return sendError(res, 'User not found', 404);
      }

      // If user is already inactive (deactivated) -> perform hard delete
      if (!existing.active) {
        const deleted = await this.userService.deleteUser(id);
        if (!deleted) {
          return sendError(res, 'Failed to delete user', 500);
        }
        return sendSuccess(res, { message: 'User permanently deleted' });
      }

      // Otherwise perform a soft-delete (deactivate)
      const success = await this.userService.softDeleteUser(id);

      if (!success) {
        return sendError(res, 'User not found', 404);
      }

      return sendSuccess(res, { message: 'User deactivated successfully' });
    } catch (error: any) {
      console.error('Error deleting user:', error);

      if (error.message === 'User not found') {
        return sendError(res, 'User not found', 404);
      }

      return sendError(res, 'Failed to delete user', 500);
    }
  });
}
