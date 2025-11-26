import { Request, Response } from 'express';
import { RoleService, CreateRoleData, UpdateRoleData } from '../services/role.service';
import { PermissionService } from '../services/permission.service';
import { asyncHandler } from '../middleware/error-handler';
import { sendSuccess, sendError, validateRequiredFields } from '../utils/response';
import { AuthRequest } from '../middleware/auth-middleware';

export class RoleController {
  private roleService: RoleService;
  private permissionService: PermissionService;

  constructor() {
    this.roleService = new RoleService();
    this.permissionService = new PermissionService();
  }

  /**
   * POST /api/admin/roles - Create new role (admin only)
   */
  createRole = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    
    // Check if user has role creation permissions
    const canCreateRoles = await this.permissionService.hasPermission(
      authReq.user.id, 
      'role_create'
    );
    
    if (!canCreateRoles) {
      return sendError(res, 'Insufficient permissions to create roles', 403);
    }

    const missingFields = validateRequiredFields(req.body, ['name', 'code']);
    
    if (missingFields.length > 0) {
      return sendError(res, `Missing required fields: ${missingFields.join(', ')}`, 400);
    }

    const { name, code, description, isSystemRole, permissions } = req.body;

    // Validate role code format (uppercase, alphanumeric with underscores)
    const codeRegex = /^[A-Z][A-Z0-9_]*$/;
    if (!codeRegex.test(code)) {
      return sendError(res, 'Role code must be uppercase, start with a letter, and contain only letters, numbers, and underscores', 400);
    }

    // Validate role name
    if (name.length < 2 || name.length > 100) {
      return sendError(res, 'Role name must be between 2 and 100 characters', 400);
    }

    try {
      const user = await this.roleService.getUser(authReq.user.id);
      if (!user) {
        return sendError(res, 'User not found', 404);
      }

      const roleData: CreateRoleData = {
        name,
        code,
        description,
        isSystemRole: isSystemRole || false,
        permissions: permissions || [],
        createdBy: user.account_id, // Use account_id instead of user_id
      };

      const result = await this.roleService.createRole(roleData);
      
      return sendSuccess(res, result, 201);
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  });

  /**
   * GET /api/admin/roles - Get all roles (admin only)
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
      const roles = await this.roleService.getAllRolesWithPermissions();
      return sendSuccess(res, roles);
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  });

  /**
   * GET /api/admin/roles/:id - Get role by ID (admin only)
   */
  getRoleById = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const { id } = req.params;
    
    // Check if user has role read permissions
    const canReadRoles = await this.permissionService.hasPermission(
      authReq.user.id, 
      'role_read'
    );
    
    if (!canReadRoles) {
      return sendError(res, 'Insufficient permissions to view roles', 403);
    }

    if (!id) {
      return sendError(res, 'Role ID is required', 400);
    }

    try {
      const role = await this.roleService.getRoleWithPermissions(id);
      
      if (!role) {
        return sendError(res, 'Role not found', 404);
      }

      return sendSuccess(res, role);
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  });

  /**
   * PUT /api/admin/roles/:id - Update role (admin only)
   */
  updateRole = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const { id } = req.params;
    
    // Check if user has role edit permissions
    const canEditRoles = await this.permissionService.hasPermission(
      authReq.user.id, 
      'role_edit'
    );
    
    if (!canEditRoles) {
      return sendError(res, 'Insufficient permissions to edit roles', 403);
    }

    if (!id) {
      return sendError(res, 'Role ID is required', 400);
    }

    const { name, code, description, permissions } = req.body;

    // Validate role code format if provided
    if (code) {
      const codeRegex = /^[A-Z][A-Z0-9_]*$/;
      if (!codeRegex.test(code)) {
        return sendError(res, 'Role code must be uppercase, start with a letter, and contain only letters, numbers, and underscores', 400);
      }
    }

    // Validate role name if provided
    if (name && (name.length < 2 || name.length > 100)) {
      return sendError(res, 'Role name must be between 2 and 100 characters', 400);
    }

    try {
      const user = await this.roleService.getUser(authReq.user.id);
      if (!user) {
        return sendError(res, 'User not found', 404);
      }

      const updateData: UpdateRoleData = {
        name,
        code,
        description,
        permissions,
        updatedBy: user.account_id, // Use account_id instead of user_id
      };

      const result = await this.roleService.updateRole(id, updateData);
      
      if (!result) {
        return sendError(res, 'Role not found', 404);
      }

      return sendSuccess(res, result);
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  });

  /**
   * DELETE /api/admin/roles/:id - Delete role (admin only)
   */
  deleteRole = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const { id } = req.params;
    
    // Check if user has role delete permissions
    const canDeleteRoles = await this.permissionService.hasPermission(
      authReq.user.id, 
      'role_delete'
    );
    
    if (!canDeleteRoles) {
      return sendError(res, 'Insufficient permissions to delete roles', 403);
    }

    if (!id) {
      return sendError(res, 'Role ID is required', 400);
    }

    try {
      const success = await this.roleService.deleteRole(id, authReq.user.id);
      
      if (success) {
        return sendSuccess(res, { message: 'Role deleted successfully' });
      } else {
        return sendError(res, 'Failed to delete role', 500);
      }
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  });

  /**
   * GET /api/admin/permissions - Get all available permissions (admin only)
   */
  getAllPermissions = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    
    // Check if user has permission read permissions
    const canReadPermissions = await this.permissionService.hasPermission(
      authReq.user.id, 
      'permission_read'
    );
    
    if (!canReadPermissions) {
      return sendError(res, 'Insufficient permissions to view permissions', 403);
    }

    try {
      const permissions = await this.roleService.getAllPermissions();
      return sendSuccess(res, permissions);
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  });

  /**
   * POST /api/admin/roles/:id/permissions - Assign permissions to role (admin only)
   */
  assignPermissionsToRole = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const { id } = req.params;
    const { permissions } = req.body;
    
    // Check if user has permission assign permissions
    const canAssignPermissions = await this.permissionService.hasPermission(
      authReq.user.id, 
      'permission_assign'
    );
    
    if (!canAssignPermissions) {
      return sendError(res, 'Insufficient permissions to assign permissions', 403);
    }

    if (!id) {
      return sendError(res, 'Role ID is required', 400);
    }

    if (!permissions || !Array.isArray(permissions)) {
      return sendError(res, 'Permissions array is required', 400);
    }

    try {
      const success = await this.roleService.assignPermissionsToRole(id, permissions, authReq.user.id);
      
      if (success) {
        const updatedRole = await this.roleService.getRoleWithPermissions(id);
        return sendSuccess(res, updatedRole);
      } else {
        return sendError(res, 'Failed to assign permissions', 500);
      }
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  });

  /**
   * GET /api/admin/roles/:id/users - Get users assigned to role (admin only)
   */
  getUsersWithRole = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const { id } = req.params;
    
    // Check if user has role read permissions
    const canReadRoles = await this.permissionService.hasPermission(
      authReq.user.id, 
      'role_read'
    );
    
    if (!canReadRoles) {
      return sendError(res, 'Insufficient permissions to view role assignments', 403);
    }

    if (!id) {
      return sendError(res, 'Role ID is required', 400);
    }

    try {
      const users = await this.roleService.getUsersWithRole(id);
      return sendSuccess(res, users);
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  });

  /**
   * GET /api/admin/roles/check-code/:code - Check if role code is available (admin only)
   */
  checkRoleCodeAvailability = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const { code } = req.params;
    const { excludeRoleId } = req.query;
    
    // Check if user has role read permissions
    const canReadRoles = await this.permissionService.hasPermission(
      authReq.user.id, 
      'role_read'
    );
    
    if (!canReadRoles) {
      return sendError(res, 'Insufficient permissions to check role availability', 403);
    }

    if (!code) {
      return sendError(res, 'Role code is required', 400);
    }

    try {
      const isAvailable = await this.roleService.isRoleCodeAvailable(
        code, 
        excludeRoleId as string
      );
      
      return sendSuccess(res, { 
        code, 
        available: isAvailable,
        message: isAvailable ? 'Code is available' : 'Code is already taken'
      });
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  });

  /**
   * GET /api/admin/roles/check-name/:name - Check if role name is available (admin only)
   */
  checkRoleNameAvailability = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const { name } = req.params;
    const { excludeRoleId } = req.query;
    
    // Check if user has role read permissions
    const canReadRoles = await this.permissionService.hasPermission(
      authReq.user.id, 
      'role_read'
    );
    
    if (!canReadRoles) {
      return sendError(res, 'Insufficient permissions to check role availability', 403);
    }

    if (!name) {
      return sendError(res, 'Role name is required', 400);
    }

    try {
      const isAvailable = await this.roleService.isRoleNameAvailable(
        name, 
        excludeRoleId as string
      );
      
      return sendSuccess(res, { 
        name, 
        available: isAvailable,
        message: isAvailable ? 'Name is available' : 'Name is already taken'
      });
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  });
}
