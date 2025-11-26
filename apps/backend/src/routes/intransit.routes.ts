import { Router } from 'express';
import { IntransitController } from '../controllers/intransit.controller';
import { authMiddleware } from '../middleware/auth-middleware';

const router = Router();
const intransitController = new IntransitController();

// Apply authentication to all routes
router.use(authMiddleware);

// Get incoming in-transit documents for a user's department
router.get('/incoming', intransitController.getIncomingDocuments.bind(intransitController));

// Get outgoing in-transit documents from a user's department
router.get('/outgoing', intransitController.getOutgoingDocuments.bind(intransitController));

export default router;