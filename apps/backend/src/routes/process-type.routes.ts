import express from 'express';
import { 
  createProcessTypeHandler, 
  updateProcessTypeHandler,
  getAllProcessTypesHandler,
  getProcessTypeByIdHandler,
  deleteProcessTypeHandler
} from '../controllers/process-type.controller';
import { authMiddleware } from '../middleware/auth-middleware';

const router = express.Router();

// All process type routes require authentication
router.use(authMiddleware);

// POST /api/process-type - Create new process type
router.post('/', createProcessTypeHandler);

// GET /api/process-type - Get all process types
router.get('/', getAllProcessTypesHandler);

// GET /api/process-type/:id - Get process type by ID
router.get('/:id', getProcessTypeByIdHandler);

// PUT /api/process-type/:id - Update process type
router.put('/:id', updateProcessTypeHandler);

// DELETE /api/process-type/:id - Delete process type
router.delete('/:id', deleteProcessTypeHandler);

export default router;
