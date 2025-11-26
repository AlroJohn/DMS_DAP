import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth-middleware';

// Middleware to check if user has required permissions
export const permissionMiddleware = (requiredPermissions: string[], resourceType: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get user from auth middleware
      const authReq = req as AuthRequest;
      
      if (!authReq.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Check if user has any of the required permissions
      const hasPermission = requiredPermissions.some(permission => 
        authReq.user?.permissions.includes(permission as any)
      );

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          requiredPermissions
        });
      }

      // If the middleware passes, continue to the next function
      next();
    } catch (error) {
      console.error('Permission middleware error:', error);
      res.status(500).json({
        success: false,
        message: 'Permission check failed'
      });
    }
  };
};