import express from 'express';
import { PermissionController } from '../controllers/permission.controller';
import { authMiddleware, requirePermission } from '../middleware/auth-middleware';

const router = express.Router();
const permissionController = new PermissionController();

// Get all permissions (requires permission_read permission)
router.get('/', authMiddleware, requirePermission('permission_read'), permissionController.getAllPermissions);

// Get permission by ID (requires permission_read permission)
router.get('/:id', authMiddleware, requirePermission('permission_read'), permissionController.getPermissionById);

// Create new permission (requires permission_create permission)
router.post('/', authMiddleware, requirePermission('permission_create'), permissionController.createPermission);

// Update permission (requires permission_edit permission)
router.put('/:id', authMiddleware, requirePermission('permission_edit'), permissionController.updatePermission);

// Delete permission (requires permission_delete permission)
router.delete('/:id', authMiddleware, requirePermission('permission_delete'), permissionController.deletePermission);

// Get roles that have a specific permission (requires permission_read permission)
router.get('/:id/roles', authMiddleware, requirePermission('permission_read'), permissionController.getRolesWithPermission);

export default router;
