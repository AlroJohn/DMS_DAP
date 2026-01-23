import { Router } from 'express';
import { authMiddleware } from '../middleware/auth-middleware';
import { printEscPos } from '../controllers/printer.controller';

const router = Router();

router.post('/print', authMiddleware, printEscPos);

export default router;
