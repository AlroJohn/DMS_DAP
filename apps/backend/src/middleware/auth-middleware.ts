import { Request, Response, NextFunction } from 'express';
import { Permission, AuthTokenPayload } from '../types';
import { AuthService } from '../services/auth.service';
import { PermissionService } from '../services/permission.service';
import { prisma } from '../lib/prisma';

// Custom interface for authenticated requests
export interface AuthRequest extends Request {
  user: {
    id: string;
    email: string;
    department_id?: string;
    permissions: Permission[];
    roles: string[]; // Role codes for quick access
  };
}

const resolveDepartmentId = async (decoded: AuthTokenPayload) => {
  if (decoded.departmentId) {
    return decoded.departmentId;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { user_id: decoded.userId },
      select: { department_id: true },
    });
    return user?.department_id;
  } catch (error) {
    console.error('Failed to resolve user department:', error);
    return undefined;
  }
};

/**
 * Authentication middleware - validates JWT tokens
 */
export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  // Get token from either cookies or Authorization header
  let token = req.cookies.accessToken; // Get token from HttpOnly cookie

  console.log('🔐 Auth Middleware - Token check:', {
    hasCookieToken: !!token,
    cookieTokenLength: token?.length,
    hasAuthHeader: !!req.headers.authorization,
    authHeaderPreview: req.headers.authorization?.substring(0, 30) + '...',
    url: req.url,
    method: req.method,
  });

  // If no token in cookies, check Authorization header
  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7); // Remove 'Bearer ' prefix
      console.log('✅ Token extracted from Authorization header, length:', token?.length);
    }
  } else {
    console.log('✅ Token found in cookies, length:', token?.length);
  }

  if (!token) {
    console.log('❌ No token found - returning 401');
    return res.status(401).json({
      success: false,
      message: 'Unauthorized'
    });
  }

  try {
    const authService = new AuthService();
    console.log('🔓 Attempting to verify token...');
    const decoded = await authService.verifyToken(token);
    console.log('✅ Token verified successfully:', {
      userId: decoded.userId,
      email: decoded.email,
      roles: decoded.roles,
      permissionsCount: decoded.permissions?.length || 0,
    });

    const departmentId = await resolveDepartmentId(decoded);

    // Cast to our custom AuthRequest type
    const authReq = req as AuthRequest;
    authReq.user = {
      id: decoded.userId,
      email: decoded.email,
      department_id: departmentId,
      permissions: decoded.permissions,
      roles: decoded.roles
    };

    //// console.log('✅ Auth middleware passed - user attached to request');
    next();
  } catch (error: any) {
    console.log('❌ Token verification failed:', error.message);
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

/**
 * Permission-based authorization middleware
 */
export const requirePermission = (permission: Permission) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthRequest;

    console.log('🔐 requirePermission check:', {
      required: permission,
      hasUser: !!authReq.user,
      userPermissions: authReq.user?.permissions || [],
      url: req.url,
      method: req.method,
    });

    if (!authReq.user) {
      console.log('❌ No user found in request');
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!authReq.user.permissions.includes(permission)) {
      console.log('❌ Permission denied:', {
        required: permission,
        userPermissions: authReq.user.permissions
      });
      return res.status(403).json({
        success: false,
        error: {
          message: 'Insufficient permissions',
          required: permission,
          userPermissions: authReq.user.permissions
        }
      });
    }

    console.log('✅ Permission granted:', permission);
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
      const departmentId = await resolveDepartmentId(decoded);

      // Cast to our custom AuthRequest type
      const authReq = req as AuthRequest;
      authReq.user = {
        id: decoded.userId,
        email: decoded.email,
        department_id: departmentId,
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

    // console.log('🔒 requireRole check:', {
    //   requiredRole: roleCode,
    //   hasUser: !!authReq.user,
    //   userRoles: authReq.user?.roles || [],
    // });

    if (!authReq.user) {
      console.log('❌ No user found in request');
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    if (!authReq.user.roles.includes(roleCode)) {
      console.log('❌ Role check failed:', {
        required: roleCode,
        userRoles: authReq.user.roles,
      });
      return res.status(403).json({
        success: false,
        message: 'Forbidden'
      });
    }

    // console.log('✅ Role check passed');
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
