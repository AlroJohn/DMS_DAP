import { Request, Response } from 'express';
import { Prisma, PrismaClient, ResourceType } from '@prisma/client';
import { PermissionService } from '../services/permission.service';
import { AuthRequest } from '../middleware/auth-middleware';
import { sendSuccess, sendError } from '../utils/response';
import { asyncHandler } from '../middleware/error-handler';

const RESOURCE_TYPE_VALUES = new Set<string>(Object.values(ResourceType));

export class PermissionController {
  private prisma: PrismaClient;
  private permissionService: PermissionService;

  constructor() {
    this.prisma = new PrismaClient();
    this.permissionService = new PermissionService();
  }

  private resolveResourceType(permission: string, requested?: string | ResourceType): ResourceType {
    const normalizedRequested = requested?.toString().toLowerCase();
    if (normalizedRequested && RESOURCE_TYPE_VALUES.has(normalizedRequested)) {
      return normalizedRequested as ResourceType;
    }

    if (!permission) {
      return ResourceType.system;
    }

    const normalizedPermission = permission.toLowerCase();
    const segments = normalizedPermission.split('_');
    const candidates: string[] = [];

    if (segments.length > 0) {
      candidates.push(segments[0]);
    }

    if (segments.length > 1) {
      candidates.push(`${segments[0]}_${segments[1]}`);
    }

    for (const candidate of candidates) {
      if (RESOURCE_TYPE_VALUES.has(candidate)) {
        return candidate as ResourceType;
      }
    }

    return ResourceType.system;
  }

  private parseBoolean(value: unknown): boolean | undefined {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      const normalized = value.toLowerCase();
      if (normalized === 'true') {
        return true;
      }

      if (normalized === 'false') {
        return false;
      }
    }

    return undefined;
  }

  // Get all permissions
  getAllPermissions = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;

    // Check if user has permission to read permissions
    const canReadPermissions = await this.permissionService.hasPermission(
      authReq.user.id,
      'permission_read'
    );

    if (!canReadPermissions) {
      return sendError(res, 'Insufficient permissions to view permissions', 403);
    }

    try {
      const permissions = await this.prisma.permissionDefinition.findMany({
        where: {
          is_active: true
        },
        orderBy: {
          permission: 'asc'
        }
      });

      return sendSuccess(res, permissions);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      return sendError(res, 'Failed to fetch permissions', 500);
    }
  });

  // Get permission by ID
  getPermissionById = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const { id } = req.params;

    // Check if user has permission to read permissions
    const canReadPermissions = await this.permissionService.hasPermission(
      authReq.user.id,
      'permission_read'
    );

    if (!canReadPermissions) {
      return sendError(res, 'Insufficient permissions to view permissions', 403);
    }

    try {
      const permission = await this.prisma.permissionDefinition.findUnique({
        where: {
          permission_id: id
        }
      });

      if (!permission) {
        return sendError(res, 'Permission not found', 404);
      }

      return sendSuccess(res, permission);
    } catch (error) {
      console.error('Error fetching permission:', error);
      return sendError(res, 'Failed to fetch permission', 500);
    }
  });

  // Create new permission
  createPermission = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;

    // Check if user has permission to create permissions
    const canCreatePermissions = await this.permissionService.hasPermission(
      authReq.user.id,
      'permission_create'
    );

    if (!canCreatePermissions) {
      return sendError(res, 'Insufficient permissions to create permissions', 403);
    }

    const {
      permission,
      description,
      resourceType,
      resource_type,
      isActive,
      is_active
    } = req.body;

    // Validate required fields
    if (!permission) {
      return sendError(res, 'Permission name is required', 400);
    }

    const resourceTypeInput = (resourceType ?? resource_type) as string | undefined;
    const normalizedResourceType = resourceTypeInput?.toLowerCase();
    if (normalizedResourceType && !RESOURCE_TYPE_VALUES.has(normalizedResourceType)) {
      return sendError(res, 'Invalid resource type', 400);
    }

    const isActiveInput = this.parseBoolean(isActive ?? is_active);

    try {
      // Check if permission already exists
      const existingPermission = await this.prisma.permissionDefinition.findFirst({
        where: {
          permission: permission
        }
      });

      if (existingPermission) {
        return sendError(res, 'Permission already exists', 409);
      }

      const newPermission = await this.prisma.permissionDefinition.create({
        data: {
          permission,
          resource_type: this.resolveResourceType(permission, normalizedResourceType),
          description: description || null,
          is_active: isActiveInput !== undefined ? isActiveInput : true
        }
      });

      return sendSuccess(res, newPermission, 201);
    } catch (error) {
      console.error('Error creating permission:', error);
      return sendError(res, 'Failed to create permission', 500);
    }
  });

  // Update permission
  updatePermission = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const { id } = req.params;

    // Check if user has permission to edit permissions
    const canEditPermissions = await this.permissionService.hasPermission(
      authReq.user.id,
      'permission_edit'
    );

    if (!canEditPermissions) {
      return sendError(res, 'Insufficient permissions to edit permissions', 403);
    }

    const {
      permission,
      description,
      resourceType,
      resource_type,
      isActive,
      is_active
    } = req.body;

    const resourceTypeInput = (resourceType ?? resource_type) as string | undefined;
    const normalizedResourceType = resourceTypeInput?.toLowerCase();
    if (normalizedResourceType && !RESOURCE_TYPE_VALUES.has(normalizedResourceType)) {
      return sendError(res, 'Invalid resource type', 400);
    }

    const isActiveInput = this.parseBoolean(isActive ?? is_active);

    try {
      const existingPermission = await this.prisma.permissionDefinition.findUnique({
        where: {
          permission_id: id
        }
      });

      if (!existingPermission) {
        return sendError(res, 'Permission not found', 404);
      }

      // Check if new permission name conflicts with existing permissions
      if (permission && permission !== existingPermission.permission) {
        const conflictingPermission = await this.prisma.permissionDefinition.findFirst({
          where: {
            permission: permission,
            permission_id: {
              not: id
            }
          }
        });

        if (conflictingPermission) {
          return sendError(res, 'Permission name already exists', 409);
        }
      }

      const nextPermissionValue = (permission ?? existingPermission.permission) as string;
      const updateData: Prisma.PermissionDefinitionUpdateInput = {
        permission: permission ?? existingPermission.permission,
        resource_type: this.resolveResourceType(
          nextPermissionValue,
          normalizedResourceType ?? existingPermission.resource_type
        ),
        description:
          description !== undefined ? description || null : existingPermission.description,
        is_active: isActiveInput !== undefined ? isActiveInput : existingPermission.is_active
      };

      const updatedPermission = await this.prisma.permissionDefinition.update({
        where: {
          permission_id: id
        },
        data: updateData
      });

      return sendSuccess(res, updatedPermission);
    } catch (error) {
      console.error('Error updating permission:', error);
      return sendError(res, 'Failed to update permission', 500);
    }
  });

  // Delete permission
  deletePermission = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const { id } = req.params;

    // Check if user has permission to delete permissions
    const canDeletePermissions = await this.permissionService.hasPermission(
      authReq.user.id,
      'permission_delete'
    );

    if (!canDeletePermissions) {
      return sendError(res, 'Insufficient permissions to delete permissions', 403);
    }

    try {
      const existingPermission = await this.prisma.permissionDefinition.findUnique({
        where: {
          permission_id: id
        }
      });

      if (!existingPermission) {
        return sendError(res, 'Permission not found', 404);
      }

      // Check if permission is being used by any roles
      const rolePermissions = await this.prisma.rolePermission.findMany({
        where: {
          permission_id: id
        }
      });

      if (rolePermissions.length > 0) {
        return sendError(res, 'Cannot delete permission that is assigned to roles', 409);
      }

      await this.prisma.permissionDefinition.delete({
        where: {
          permission_id: id
        }
      });

      return sendSuccess(res, { message: 'Permission deleted successfully' });
    } catch (error) {
      console.error('Error deleting permission:', error);
      return sendError(res, 'Failed to delete permission', 500);
    }
  });

  // Get roles that have a specific permission
  getRolesWithPermission = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const { id } = req.params;

    // Check if user has permission to read permissions
    const canReadPermissions = await this.permissionService.hasPermission(
      authReq.user.id,
      'permission_read'
    );

    if (!canReadPermissions) {
      return sendError(res, 'Insufficient permissions to view permissions', 403);
    }

    try {
      const roles = await this.prisma.rolePermission.findMany({
        where: {
          permission_id: id,
          is_active: true
        },
        include: {
          role: {
            select: {
              role_id: true,
              name: true,
              code: true,
              is_active: true
            }
          }
        }
      });

      const formattedRoles = roles.map(rp => ({
        role_id: rp.role.role_id,
        name: rp.role.name,
        code: rp.role.code,
        is_active: rp.role.is_active,
        granted_at: rp.granted_at,
        scope: rp.scope
      }));

      return sendSuccess(res, formattedRoles);
    } catch (error) {
      console.error('Error fetching roles with permission:', error);
      return sendError(res, 'Failed to fetch roles with permission', 500);
    }
  });
}
