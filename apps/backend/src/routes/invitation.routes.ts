import { Router } from 'express';
import { InvitationController } from '../controllers/invitation.controller';
import { authMiddleware } from '../middleware/auth-middleware';

const router = Router();
const invitationController = new InvitationController();

// Admin routes (require authentication)
router.post('/admin/invitations', authMiddleware, invitationController.createInvitation);
router.get('/admin/invitations', authMiddleware, invitationController.getAllInvitations);
router.delete('/admin/invitations/:id', authMiddleware, invitationController.cancelInvitation);
router.post('/admin/invitations/:id/resend', authMiddleware, invitationController.resendInvitation);

// Public routes (for invitation acceptance)
router.get('/invitations/:token', invitationController.getInvitationByToken);
router.post('/invitations/:token/accept', invitationController.acceptInvitation);

export default router;




