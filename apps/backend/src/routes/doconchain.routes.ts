import { Router } from 'express';
import { DoconchainController } from '../controllers/doconchain.controller';
import { authMiddleware } from '../middleware/auth-middleware';

const router = Router();
const doconchainController = new DoconchainController();

// All routes require authentication
router.use(authMiddleware);

// Token utilities
router.post('/token', doconchainController.generateToken);
router.post('/token/verify', doconchainController.verifyToken);
router.post('/logout', doconchainController.logout);

// Project lifecycle
router.post('/projects', doconchainController.uploadMiddleware, doconchainController.createProject);
router.get('/projects/metrics', doconchainController.getProjectMetrics);
router.get('/projects/:uuid', doconchainController.getProject);
router.post('/projects/:uuid/send', doconchainController.sendProject);
router.get('/projects/:uuid/passport', doconchainController.getProjectPassport);

// Signer management
router.post('/projects/:uuid/signers', doconchainController.addSigner);
router.put('/projects/:uuid/signers/:signerId', doconchainController.updateSigner);
router.delete('/projects/:uuid/signers/:signerId', doconchainController.removeSigner);

// Signer mark management
router.post('/projects/:uuid/signers/:signerId/properties', doconchainController.addSignerMark);
router.put('/signers/:signerId/properties/:propertyId', doconchainController.updateSignerMark);
router.delete('/signers/:signerId/properties/:propertyId', doconchainController.removeSignerMark);

export default router;