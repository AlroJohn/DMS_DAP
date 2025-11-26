import { PrismaClient } from '@prisma/client';
import { Role, PermissionScope } from '../types';

export interface CreateRoleData {
  name: string;
  code: string;
  description?: string;
  isSystemRole?: boolean;
  permissions?: string[]; // Permission IDs
  createdBy: string;
}

export interface UpdateRoleData {
  name?: string;
  code?: string;
  description?: string;
  permissions?: string[]; // Permission IDs
  updatedBy: string;
}

export interface RoleWithPermissions extends Role {
  permissions: {
    permission_id: string;
    permission: string;
    scope: PermissionScope;
    granted_at: Date;
    is_active: boolean;
  }[];
}

/**
 * Role Service - handles role management operations
 */
export class RoleService {
  private prisma = new PrismaClient();

  /**
   * Create a new role
   */
  async createRole(data: CreateRoleData): Promise<RoleWithPermissions> {
    try {
      // Check if role code already exists
      const existingRole = await this.prisma.role.findUnique({
        where: { code: data.code }
      });

      if (existingRole) {
        throw new Error(`Role with code '${data.code}' already exists`);
      }

      // Check if role name already exists
      const existingName = await this.prisma.role.findUnique({
        where: { name: data.name }
      });

      if (existingName) {
        throw new Error(`Role with name '${data.name}' already exists`);
      }

      // Create role
      const role = await this.prisma.role.create({
        data: {
          name: data.name,
          code: data.code,
          description: data.description,
          is_system_role: data.isSystemRole || false,
          is_active: true,
          created_by: data.createdBy,
          updated_by: data.createdBy
        }
      });

      // Assign permissions if provided
      if (data.permissions && data.permissions.length > 0) {
        await this.assignPermissionsToRole(role.role_id, data.permissions, data.createdBy);
      }

      // Return role with permissions
      const roleWithPermissions = await this.getRoleWithPermissions(role.role_id);
      if (!roleWithPermissions) {
        throw new Error('Failed to retrieve created role');
      }
      return roleWithPermissions;
    } catch (error) {
      console.error('Error creating role:', error);
      throw error;
    }
  }

  /**
   * Get role by ID with permissions
   */
  async getRoleWithPermissions(roleId: string): Promise<RoleWithPermissions | null> {
    try {
      const role = await this.prisma.role.findUnique({
        where: { role_id: roleId },
        include: {
          role_permissions: {
            where: { is_active: true },
            include: {
              permission: true
            }
          }
        }
      });

      if (!role) return null;

      return {
        role_id: role.role_id,
        name: role.name,
        code: role.code,
        description: role.description,
        is_system_role: role.is_system_role,
        is_active: role.is_active,
        created_at: role.created_at,
        updated_at: role.updated_at,
        created_by: role.created_by,
        updated_by: role.updated_by,
        permissions: role.role_permissions.map(rp => ({
          permission_id: rp.permission.permission_id,
          permission: rp.permission.permission as string,
          scope: rp.scope as PermissionScope,
          granted_at: rp.granted_at,
          is_active: rp.is_active
        }))
      };
    } catch (error) {
      console.error('Error getting role with permissions:', error);
      throw error;
    }
  }

  /**
   * Get all roles with permissions
   */
  async getAllRolesWithPermissions(): Promise<RoleWithPermissions[]> {
    try {
      const roles = await this.prisma.role.findMany({
        where: { is_active: true },
        include: {
          role_permissions: {
            where: { is_active: true },
            include: {
              permission: true
            }
          }
        },
        orderBy: { name: 'asc' }
      });

      return roles.map(role => ({
        role_id: role.role_id,
        name: role.name,
        code: role.code,
        description: role.description,
        is_system_role: role.is_system_role,
        is_active: role.is_active,
        created_at: role.created_at,
        updated_at: role.updated_at,
        created_by: role.created_by,
        updated_by: role.updated_by,
        permissions: role.role_permissions.map(rp => ({
          permission_id: rp.permission.permission_id,
          permission: rp.permission.permission as string,
          scope: rp.scope as PermissionScope,
          granted_at: rp.granted_at,
          is_active: rp.is_active
        }))
      }));
    } catch (error) {
      console.error('Error getting all roles with permissions:', error);
      throw error;
    }
  }

  /**
   * Update role
   */
  async updateRole(roleId: string, data: UpdateRoleData): Promise<RoleWithPermissions | null> {
    try {
      const role = await this.prisma.role.findUnique({
        where: { role_id: roleId }
      });

      if (!role) {
        throw new Error('Role not found');
      }

      if (role.is_system_role) {
        throw new Error('Cannot modify system roles');
      }

      // Check if new code conflicts with existing roles
      if (data.code && data.code !== role.code) {
        const existingRole = await this.prisma.role.findUnique({
          where: { code: data.code }
        });

        if (existingRole) {
          throw new Error(`Role with code '${data.code}' already exists`);
        }
      }

      // Check if new name conflicts with existing roles
      if (data.name && data.name !== role.name) {
        const existingName = await this.prisma.role.findUnique({
          where: { name: data.name }
        });

        if (existingName) {
          throw new Error(`Role with name '${data.name}' already exists`);
        }
      }

      // Update role
      const updatedRole = await this.prisma.role.update({
        where: { role_id: roleId },
        data: {
          name: data.name,
          code: data.code,
          description: data.description,
          updated_by: data.updatedBy,
          updated_at: new Date()
        }
      });

      // Update permissions if provided
      if (data.permissions) {
        await this.updateRolePermissions(roleId, data.permissions, data.updatedBy);
      }

      return await this.getRoleWithPermissions(roleId);
    } catch (error) {
      console.error('Error updating role:', error);
      throw error;
    }
  }

  /**
   * Delete role (soft delete)
   */
  async deleteRole(roleId: string, deletedBy: string): Promise<boolean> {
    try {
      const role = await this.prisma.role.findUnique({
        where: { role_id: roleId }
      });

      if (!role) {
        throw new Error('Role not found');
      }

      if (role.is_system_role) {
        throw new Error('Cannot delete system roles');
      }

      // Check if role is assigned to any users
      const userRoles = await this.prisma.userRole.findMany({
        where: {
          role_id: roleId,
          is_active: true
        }
      });

      if (userRoles.length > 0) {
        throw new Error('Cannot delete role that is assigned to users. Please remove all user assignments first.');
      }

      // Soft delete role
      await this.prisma.role.update({
        where: { role_id: roleId },
        data: {
          is_active: false,
          updated_by: deletedBy,
          updated_at: new Date()
        }
      });

      return true;
    } catch (error) {
      console.error('Error deleting role:', error);
      throw error;
    }
  }

  /**
   * Assign permissions to role
   */
  async assignPermissionsToRole(roleId: string, permissionIds: string[], grantedBy: string): Promise<boolean> {
    try {
      // Remove existing permissions
      await this.prisma.rolePermission.updateMany({
        where: { role_id: roleId },
        data: { is_active: false }
      });

      // Add new permissions
      for (const permissionId of permissionIds) {
        await this.prisma.rolePermission.upsert({
          where: {
            role_id_permission_id_scope: {
              role_id: roleId,
              permission_id: permissionId,
              scope: 'global'
            }
          },
          update: {
            is_active: true,
            granted_by: grantedBy,
            granted_at: new Date()
          },
          create: {
            role_id: roleId,
            permission_id: permissionId,
            scope: 'global',
            granted_by: grantedBy,
            granted_at: new Date(),
            is_active: true
          }
        });
      }

      return true;
    } catch (error) {
      console.error('Error assigning permissions to role:', error);
      throw error;
    }
  }

  /**
   * Update role permissions
   */
  async updateRolePermissions(roleId: string, permissionIds: string[], updatedBy: string): Promise<boolean> {
    return this.assignPermissionsToRole(roleId, permissionIds, updatedBy);
  }

  /**
   * Get all available permissions
   */
  async getAllPermissions() {
    try {
      const permissions = await this.prisma.permissionDefinition.findMany({
        where: { is_active: true },
        orderBy: { permission: 'asc' }
      });

      return permissions;
    } catch (error) {
      console.error('Error getting all permissions:', error);
      throw error;
    }
  }

  /**
   * Get role by code
   */
  async getRoleByCode(code: string): Promise<Role | null> {
    try {
      const role = await this.prisma.role.findUnique({
        where: { code: code }
      });

      if (!role) return null;

      return {
        role_id: role.role_id,
        name: role.name,
        code: role.code,
        description: role.description,
        is_system_role: role.is_system_role,
        is_active: role.is_active,
        created_at: role.created_at,
        updated_at: role.updated_at,
        created_by: role.created_by,
        updated_by: role.updated_by
      };
    } catch (error) {
      console.error('Error getting role by code:', error);
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  async getUser(userId: string) {
    return this.prisma.user.findUnique({
      where: { user_id: userId },
    });
  }

  /**
   * Check if role code is available
   */
  async isRoleCodeAvailable(code: string, excludeRoleId?: string): Promise<boolean> {
    try {
      const whereClause: any = { code: code };
      if (excludeRoleId) {
        whereClause.role_id = { not: excludeRoleId };
      }

      const existingRole = await this.prisma.role.findFirst({
        where: whereClause
      });

      return !existingRole;
    } catch (error) {
      console.error('Error checking role code availability:', error);
      throw error;
    }
  }

  /**
   * Check if role name is available
   */
  async isRoleNameAvailable(name: string, excludeRoleId?: string): Promise<boolean> {
    try {
      const whereClause: any = { name: name };
      if (excludeRoleId) {
        whereClause.role_id = { not: excludeRoleId };
      }

      const existingRole = await this.prisma.role.findFirst({
        where: whereClause
      });

      return !existingRole;
    } catch (error) {
      console.error('Error checking role name availability:', error);
      throw error;
    }
  }

  /**
   * Get users assigned to a role
   */
  async getUsersWithRole(roleId: string) {
    try {
      const userRoles = await this.prisma.userRole.findMany({
        where: {
          role_id: roleId,
          is_active: true,
          OR: [
            { expires_at: null },
            { expires_at: { gt: new Date() } }
          ]
        },
        select: {
          id: true,
          user_id: true,
          assigned_at: true,
          expires_at: true,
          user: {
            select: {
              user_id: true,
              first_name: true,
              last_name: true,
              active: true,
              account: {
                select: {
                  email: true
                }
              }
            }
          }
        }
      });

      return userRoles.map(ur => ({
        user_role_id: ur.id,
        user_id: ur.user_id,
        assigned_at: ur.assigned_at,
        expires_at: ur.expires_at,
        user: {
          user_id: ur.user.user_id,
          first_name: ur.user.first_name,
          last_name: ur.user.last_name,
          email: ur.user.account.email,
          active: ur.user.active
        }
      }));
    } catch (error) {
      console.error('Error getting users with role:', error);
      throw error;
    }
  }
}
