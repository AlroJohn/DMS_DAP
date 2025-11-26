import { Request, Response } from 'express';
import { InvitationService, CreateInvitationData } from '../services/invitation.service';
import { PermissionService } from '../services/permission.service';
import { asyncHandler } from '../middleware/error-handler';
import { sendSuccess, sendError, validateRequiredFields } from '../utils/response';
import { AuthRequest } from '../middleware/auth-middleware';

export class InvitationController {
  private invitationService: InvitationService;
  private permissionService: PermissionService;

  constructor() {
    this.invitationService = new InvitationService();
    this.permissionService = new PermissionService();
  }

  /**
   * POST /api/admin/invitations - Create new invitation (admin only)
   */
  createInvitation = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    
    // Check if user has user creation permissions
    const canCreateUsers = await this.permissionService.hasAnyPermission(
      authReq.user.id, 
      ['user_create', 'user_edit', 'user_delete']
    );
    
    if (!canCreateUsers) {
      return sendError(res, 'Only administrators can create invitations', 403);
    }

    const missingFields = validateRequiredFields(req.body, ['email', 'first_name', 'last_name', 'department_id', 'role_id']);
    
    if (missingFields.length > 0) {
      return sendError(res, `Missing required fields: ${missingFields.join(', ')}`, 400);
    }

    const { email, first_name, last_name, department_id, role_id } = req.body;

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return sendError(res, 'Invalid email format', 400);
    }

    try {
      const invitationData: CreateInvitationData = {
        email,
        firstName: first_name,
        lastName: last_name,
        departmentId: department_id,
        roleId: role_id,
        invitedBy: authReq.user.id
      };

      const result = await this.invitationService.createInvitation(invitationData);
      
      return sendSuccess(res, result, 201);
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  });

  /**
   * GET /api/admin/invitations - Get all invitations (admin only)
   */
  getAllInvitations = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    
    // Check if user has user read permissions
    const canReadUsers = await this.permissionService.hasPermission(
      authReq.user.id, 
      'user_read'
    );
    
    if (!canReadUsers) {
      return sendError(res, 'Only administrators can view invitations', 403);
    }

    try {
      const invitations = await this.invitationService.getAllInvitations();
      return sendSuccess(res, invitations);
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  });

  /**
   * GET /api/invitations/:token - Get invitation details by token
   */
  getInvitationByToken = asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.params;

    if (!token) {
      return sendError(res, 'Invitation token is required', 400);
    }

    try {
      const invitation = await this.invitationService.getInvitationByToken(token);
      
      // Remove sensitive information
      const safeInvitation = {
        email: invitation.email,
        firstName: invitation.first_name,
        lastName: invitation.last_name,
        department: invitation.department,
        role: invitation.role, // This is the full role object with name, code, etc.
        invitedBy: invitation.invited_by_account.user ? 
          `${invitation.invited_by_account.user.first_name} ${invitation.invited_by_account.user.last_name}` : 
          'Administrator',
        expiresAt: invitation.expires_at
      };

      return sendSuccess(res, safeInvitation);
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  });

  /**
   * POST /api/invitations/:token/accept - Accept invitation and create account
   */
  acceptInvitation = asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.params;
    const { password } = req.body;

    if (!token) {
      return sendError(res, 'Invitation token is required', 400);
    }

    if (!password) {
      return sendError(res, 'Password is required', 400);
    }

    // Password strength validation
    if (password.length < 6) {
      return sendError(res, 'Password must be at least 6 characters long', 400);
    }

    try {
      const result = await this.invitationService.acceptInvitation(token, password);
      
      return sendSuccess(res, result);
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  });

  /**
   * DELETE /api/admin/invitations/:id - Cancel invitation (admin only)
   */
  cancelInvitation = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as any;
    
    // Check if user is admin
    const hasAdminPermission = authReq.user?.permissions?.includes('DOCUMENT_DELETE') || authReq.user?.role === 'admin';
    if (!hasAdminPermission) {
      return sendError(res, 'Only administrators can cancel invitations', 403);
    }

    const { id } = req.params;

    if (!id) {
      return sendError(res, 'Invitation ID is required', 400);
    }

    try {
      const success = await this.invitationService.cancelInvitation(id, authReq.user.id);
      
      if (success) {
        return sendSuccess(res, { message: 'Invitation cancelled successfully' });
      } else {
        return sendError(res, 'Failed to cancel invitation', 400);
      }
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  });

  /**
   * POST /api/admin/invitations/:id/resend - Resend invitation (admin only)
   */
  resendInvitation = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as any;
    
    // Check if user is admin
    const hasAdminPermission = authReq.user?.permissions?.includes('DOCUMENT_DELETE') || authReq.user?.role === 'admin';
    if (!hasAdminPermission) {
      return sendError(res, 'Only administrators can resend invitations', 403);
    }

    const { id } = req.params;

    if (!id) {
      return sendError(res, 'Invitation ID is required', 400);
    }

    try {
      const result = await this.invitationService.resendInvitation(id);
      
      return sendSuccess(res, result);
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  });
}




