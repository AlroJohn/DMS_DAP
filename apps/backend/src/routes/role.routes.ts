import express from 'express';
import { RoleController } from '../controllers/role.controller';
import { authMiddleware } from '../middleware/auth-middleware';

const router = express.Router();
const roleController = new RoleController();

// All role management routes require authentication
router.use(authMiddleware);

// Role CRUD operations
// POST /api/admin/roles - Create new role (requires role_create permission)
router.post('/', roleController.createRole);

// GET /api/admin/roles - Get all roles (requires role_read permission)
router.get('/', roleController.getAllRoles);

// GET /api/admin/roles/:id - Get role by ID (requires role_read permission)
router.get('/:id', roleController.getRoleById);

// PUT /api/admin/roles/:id - Update role (requires role_edit permission)
router.put('/:id', roleController.updateRole);

// DELETE /api/admin/roles/:id - Delete role (requires role_delete permission)
router.delete('/:id', roleController.deleteRole);

// Permission management
// GET /api/admin/permissions - Get all available permissions (requires permission_read permission)
router.get('/permissions', roleController.getAllPermissions);

// POST /api/admin/roles/:id/permissions - Assign permissions to role (requires permission_assign permission)
router.post('/:id/permissions', roleController.assignPermissionsToRole);

// User management
// GET /api/admin/roles/:id/users - Get users assigned to role (requires role_read permission)
router.get('/:id/users', roleController.getUsersWithRole);

// Validation endpoints
// GET /api/admin/roles/check-code/:code - Check if role code is available (requires role_read permission)
router.get('/check-code/:code', roleController.checkRoleCodeAvailability);

// GET /api/admin/roles/check-name/:name - Check if role name is available (requires role_read permission)
router.get('/check-name/:name', roleController.checkRoleNameAvailability);

export default router;
