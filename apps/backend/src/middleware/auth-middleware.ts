import { Request, Response, NextFunction } from 'express';
import { Permission, Role } from '../types';
import { AuthService } from '../services/auth.service';
import { PermissionService } from '../services/permission.service';

// Custom interface for authenticated requests
export interface AuthRequest extends Request {
  user: {
    id: string;
    email: string;
    permissions: Permission[];
    roles: string[]; // Role codes for quick access
  };
}

/**
 * Authentication middleware - validates JWT tokens
 */
export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies.accessToken; // Get token from HttpOnly cookie

  if (!token) {
    return res.status(401).json({
      success: false,
      error: { message: 'Access token required' }
    });
  }

  try {
    const authService = new AuthService();
    const decoded = await authService.verifyToken(token);

    // Cast to our custom AuthRequest type
    const authReq = req as AuthRequest;
    authReq.user = {
      id: decoded.userId,
      email: decoded.email,
      permissions: decoded.permissions,
      roles: decoded.roles
    };

    next();
  } catch (error: any) {
    return res.status(403).json({
      success: false,
      error: { message: 'Invalid or expired token' }
    });
  }
};

/**
 * Permission-based authorization middleware
 */
export const requirePermission = (permission: Permission) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthRequest;

    // console.log('🔐 requirePermission check:', {
    //   required: permission,
    //   hasUser: !!authReq.user,
    //   userPermissions: authReq.user?.permissions || []
    // });

    if (!authReq.user) {
      // console.log('❌ No user found in request');
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!authReq.user.permissions.includes(permission)) {
      // console.log('❌ Permission denied:', {
      //   required: permission,
      //   userPermissions: authReq.user.permissions
      // });
      return res.status(403).json({
        success: false,
        error: {
          message: 'Insufficient permissions',
          required: permission,
          userPermissions: authReq.user.permissions
        }
      });
    }

    // console.log('✅ Permission granted:', permission);
    next();
  };
};

/**
 * Optional authentication - doesn't fail if no token provided
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies.accessToken; // Get token from HttpOnly cookie

  if (token) {
    try {
      const authService = new AuthService();
      const decoded = await authService.verifyToken(token);

      // Cast to our custom AuthRequest type
      const authReq = req as AuthRequest;
      authReq.user = {
        id: decoded.userId,
        email: decoded.email,
        permissions: decoded.permissions,
        roles: decoded.roles
      };
    } catch (error) {
      // Token is invalid, but we don't fail the request
      console.log('Optional auth failed:', error);
    }
  }

  next();
};

/**
 * Role-based authorization middleware
 */
export const requireRole = (roleCode: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthRequest;

    if (!authReq.user) {
      return res.status(401).json({
        success: false,
        error: { message: 'Authentication required' }
      });
    }

    if (!authReq.user.roles.includes(roleCode)) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Insufficient role permissions',
          required: roleCode,
          userRoles: authReq.user.roles
        }
      });
    }

    next();
  };
};

/**
 * Require any of the specified roles
 */
export const requireAnyRole = (roleCodes: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthRequest;

    if (!authReq.user) {
      return res.status(401).json({
        success: false,
        error: { message: 'Authentication required' }
      });
    }

    const hasRequiredRole = roleCodes.some(roleCode =>
      authReq.user.roles.includes(roleCode)
    );

    if (!hasRequiredRole) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Insufficient role permissions',
          required: roleCodes,
          userRoles: authReq.user.roles
        }
      });
    }

    next();
  };
};

/**
 * Require all of the specified permissions
 */
export const requireAllPermissions = (permissions: Permission[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthRequest;

    if (!authReq.user) {
      return res.status(401).json({
        success: false,
        error: { message: 'Authentication required' }
      });
    }

    const hasAllPermissions = permissions.every(permission =>
      authReq.user.permissions.includes(permission)
    );

    if (!hasAllPermissions) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Insufficient permissions',
          required: permissions,
          userPermissions: authReq.user.permissions
        }
      });
    }

    next();
  };
};

/**
 * Require any of the specified permissions
 */
export const requireAnyPermission = (permissions: Permission[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthRequest;

    if (!authReq.user) {
      return res.status(401).json({
        success: false,
        error: { message: 'Authentication required' }
      });
    }

    const hasAnyPermission = permissions.some(permission =>
      authReq.user.permissions.includes(permission)
    );

    if (!hasAnyPermission) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Insufficient permissions',
          required: permissions,
          userPermissions: authReq.user.permissions
        }
      });
    }

    next();
  };
};

/**
 * Check if user is super admin
 */
export const requireSuperAdmin = requireRole('SUPER_ADMIN');

/**
 * Check if user is admin (any admin role)
 */
export const requireAdmin = requireAnyRole(['SUPER_ADMIN', 'ADMIN', 'ADMIN1', 'ADMIN2', 'ADMIN3']);

/**
 * Check if user can manage users
 */
export const requireUserManagement = requireAnyPermission([
  'user_create', 'user_edit', 'user_delete', 'user_activate', 'user_deactivate'
]);

/**
 * Check if user can manage roles
 */
export const requireRoleManagement = requireAnyPermission([
  'role_create', 'role_edit', 'role_delete', 'role_assign'
]);

/**
 * Check if user can manage documents
 */
export const requireDocumentManagement = requireAnyPermission([
  'document_create', 'document_edit', 'document_delete', 'document_archive'
]);

/**
 * Check if user can view documents
 */
export const requireDocumentView = requirePermission('document_read');
