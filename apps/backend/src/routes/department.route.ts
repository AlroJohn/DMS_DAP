import { Router } from 'express';
import { DepartmentController } from '../controllers/department.controller';
import { authMiddleware, requirePermission } from '../middleware/auth-middleware';

const router = Router();
const departmentController = new DepartmentController();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Apply permission checks for different actions
router.get('/', 
  requirePermission('department_read'),
  departmentController.getAllDepartments.bind(departmentController)
);

router.get('/:id', 
  requirePermission('department_read'),
  departmentController.getDepartmentById.bind(departmentController)
);

router.post('/', 
  requirePermission('department_create'),
  departmentController.createDepartment.bind(departmentController)
);

router.put('/:id', 
  requirePermission('department_edit'),
  departmentController.updateDepartment.bind(departmentController)
);

router.delete('/:id', 
  requirePermission('department_delete'),
  departmentController.deleteDepartment.bind(departmentController)
);

router.patch('/:id/toggle-status', 
  requirePermission('department_edit'),
  departmentController.toggleDepartmentStatus.bind(departmentController)
);

export default router;