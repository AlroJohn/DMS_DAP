import { PrismaClient } from '@prisma/client';
import { Permission, PermissionScope, Role } from '../types';

/**
 * Permission Service - handles role-based permission logic
 */
export class PermissionService {
  private prisma = new PrismaClient();

  /**
   * Get all permissions for a user based on their roles
   */
  async getUserPermissions(userId: string): Promise<Permission[]> {
    try {
      const userRoles = await this.prisma.userRole.findMany({
        where: {
          user_id: userId,
          is_active: true,
          OR: [
            { expires_at: null },
            { expires_at: { gt: new Date() } }
          ]
        },
        include: {
          role: {
            include: {
              role_permissions: {
                where: { is_active: true },
                include: {
                  permission: true
                }
              }
            }
          }
        }
      });

      const permissions = new Set<Permission>();
      
      for (const userRole of userRoles) {
        for (const rolePermission of userRole.role.role_permissions) {
          permissions.add(rolePermission.permission.permission as Permission);
        }
      }

      return Array.from(permissions);
    } catch (error) {
      console.error('Error getting user permissions:', error);
      return [];
    }
  }

  /**
   * Get all roles for a user
   */
  async getUserRoles(userId: string): Promise<Role[]> {
    try {
      const userRoles = await this.prisma.userRole.findMany({
        where: {
          user_id: userId,
          is_active: true,
          OR: [
            { expires_at: null },
            { expires_at: { gt: new Date() } }
          ]
        },
        include: {
          role: true
        }
      });

      return userRoles.map(userRole => ({
        role_id: userRole.role.role_id,
        name: userRole.role.name,
        code: userRole.role.code,
        description: userRole.role.description,
        is_system_role: userRole.role.is_system_role,
        is_active: userRole.role.is_active,
        created_at: userRole.role.created_at,
        updated_at: userRole.role.updated_at,
        created_by: userRole.role.created_by,
        updated_by: userRole.role.updated_by
      }));
    } catch (error) {
      console.error('Error getting user roles:', error);
      return [];
    }
  }

  /**
   * Check if user has a specific permission
   */
  async hasPermission(userId: string, permission: Permission, scope?: PermissionScope): Promise<boolean> {
    try {
      const userPermissions = await this.getUserPermissions(userId);
      return userPermissions.includes(permission);
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  }

  /**
   * Check if user has any of the specified permissions
   */
  async hasAnyPermission(userId: string, permissions: Permission[]): Promise<boolean> {
    try {
      const userPermissions = await this.getUserPermissions(userId);
      return permissions.some(permission => userPermissions.includes(permission));
    } catch (error) {
      console.error('Error checking permissions:', error);
      return false;
    }
  }

  /**
   * Check if user has all of the specified permissions
   */
  async hasAllPermissions(userId: string, permissions: Permission[]): Promise<boolean> {
    try {
      const userPermissions = await this.getUserPermissions(userId);
      return permissions.every(permission => userPermissions.includes(permission));
    } catch (error) {
      console.error('Error checking permissions:', error);
      return false;
    }
  }

  /**
   * Check if user has a specific role
   */
  async hasRole(userId: string, roleCode: string): Promise<boolean> {
    try {
      const userRoles = await this.getUserRoles(userId);
      return userRoles.some(role => role.code === roleCode && role.is_active);
    } catch (error) {
      console.error('Error checking role:', error);
      return false;
    }
  }

  /**
   * Check if user has any of the specified roles
   */
  async hasAnyRole(userId: string, roleCodes: string[]): Promise<boolean> {
    try {
      const userRoles = await this.getUserRoles(userId);
      return roleCodes.some(roleCode => 
        userRoles.some(role => role.code === roleCode && role.is_active)
      );
    } catch (error) {
      console.error('Error checking roles:', error);
      return false;
    }
  }

  /**
   * Get role codes for a user
   */
  async getUserRoleCodes(userId: string): Promise<string[]> {
    try {
      const userRoles = await this.getUserRoles(userId);
      return userRoles
        .filter(role => role.is_active)
        .map(role => role.code);
    } catch (error) {
      console.error('Error getting user role codes:', error);
      return [];
    }
  }

  /**
   * Assign a role to a user
   */
  async assignRoleToUser(userId: string, roleId: string, assignedBy: string, expiresAt?: Date): Promise<boolean> {
    try {
      await this.prisma.userRole.create({
        data: {
          user_id: userId,
          role_id: roleId,
          assigned_by: assignedBy,
          assigned_at: new Date(),
          is_active: true,
          expires_at: expiresAt
        }
      });
      return true;
    } catch (error) {
      console.error('Error assigning role to user:', error);
      return false;
    }
  }

  /**
   * Remove a role from a user
   */
  async removeRoleFromUser(userId: string, roleId: string): Promise<boolean> {
    try {
      await this.prisma.userRole.updateMany({
        where: {
          user_id: userId,
          role_id: roleId
        },
        data: {
          is_active: false
        }
      });
      return true;
    } catch (error) {
      console.error('Error removing role from user:', error);
      return false;
    }
  }

  /**
   * Get all available roles
   */
  async getAllRoles(): Promise<Role[]> {
    try {
      const roles = await this.prisma.role.findMany({
        where: { is_active: true },
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
        updated_by: role.updated_by
      }));
    } catch (error) {
      console.error('Error getting all roles:', error);
      return [];
    }
  }

  /**
   * Get role by code
   */
  async getRoleByCode(roleCode: string): Promise<Role | null> {
    try {
      const role = await this.prisma.role.findUnique({
        where: { code: roleCode }
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
      return null;
    }
  }

  /**
   * Check if user is super admin
   */
  async isSuperAdmin(userId: string): Promise<boolean> {
    return this.hasRole(userId, 'SUPER_ADMIN');
  }

  /**
   * Check if user is admin (any admin role)
   */
  async isAdmin(userId: string): Promise<boolean> {
    return this.hasAnyRole(userId, ['SUPER_ADMIN', 'ADMIN', 'ADMIN1', 'ADMIN2', 'ADMIN3']);
  }

  /**
   * Check if user can manage users
   */
  async canManageUsers(userId: string): Promise<boolean> {
    return this.hasAnyPermission(userId, ['user_create', 'user_edit', 'user_delete', 'user_activate', 'user_deactivate']);
  }

  /**
   * Check if user can manage roles
   */
  async canManageRoles(userId: string): Promise<boolean> {
    return this.hasAnyPermission(userId, ['role_create', 'role_edit', 'role_delete', 'role_assign']);
  }

  /**
   * Check if user can manage documents
   */
  async canManageDocuments(userId: string): Promise<boolean> {
    return this.hasAnyPermission(userId, ['document_create', 'document_edit', 'document_delete', 'document_archive']);
  }

  /**
   * Check if user can view documents
   */
  async canViewDocuments(userId: string): Promise<boolean> {
    return this.hasPermission(userId, 'document_read');
  }
}
