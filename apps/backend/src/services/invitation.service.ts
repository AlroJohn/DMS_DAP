import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { EmailService, InvitationEmailData } from './email.service';

export interface CreateInvitationData {
  email: string;
  firstName: string;
  lastName: string;
  departmentId: string;
  roleId: string; // Changed from role to roleId
  invitedBy: string;
}

export interface InvitationResult {
  invitationId: string;
  email: string;
  invitationToken: string;
  expiresAt: Date;
  invitationUrl: string;
}

export interface InvitationAcceptResult {
  success: boolean;
  message: string;
  data?: {
    token: string;
    refreshToken: string;
    user: {
      id: string;
      email: string;
      user_id: string;
    };
  };
}

export class InvitationService {
  private prisma = new PrismaClient();
  private emailService = new EmailService();

  /**
   * Create a new user invitation
   */
  async createInvitation(data: CreateInvitationData): Promise<InvitationResult> {
    try {
      // Get the account ID of the user creating this invitation
      const inviterUser = await this.prisma.user.findUnique({
        where: { user_id: data.invitedBy },
        select: { account_id: true }
      });

      if (!inviterUser) {
        throw new Error('Inviter user not found');
      }

      // Check if user already exists
      const existingAccount = await this.prisma.account.findUnique({
        where: { email: data.email }
      });

      if (existingAccount) {
        throw new Error('User with this email already exists');
      }

      // Check if there's already a pending invitation
      const existingInvitation = await this.prisma.userInvitation.findFirst({
        where: {
          email: data.email,
          status: 'pending',
          expires_at: {
            gt: new Date()
          }
        }
      });

      if (existingInvitation) {
        throw new Error('A pending invitation already exists for this email');
      }

      // Generate invitation token
      const invitationToken = crypto.randomBytes(32).toString('hex');
      
      // Set expiration date (7 days from now)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Create invitation
      const invitation = await this.prisma.userInvitation.create({
        data: {
          email: data.email,
          first_name: data.firstName,
          last_name: data.lastName,
          department_id: data.departmentId,
          role_id: data.roleId,
          invited_by: inviterUser.account_id, // Use the account_id instead of user_id
          invitation_token: invitationToken,
          expires_at: expiresAt,
          status: 'pending'
        },
        include: {
          department: true,
          role: true,
          invited_by_account: {
            include: {
              user: true
            }
          }
        }
      });

      const invitationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/invitation/accept?token=${invitationToken}`;

      // Send invitation email
      try {
        const inviterName = invitation.invited_by_account.user?.first_name && invitation.invited_by_account.user?.last_name
          ? `${invitation.invited_by_account.user.first_name} ${invitation.invited_by_account.user.last_name}`
          : invitation.invited_by_account.email || 'Administrator';

        const emailData: InvitationEmailData = {
          email: invitation.email,
          firstName: invitation.first_name,
          lastName: invitation.last_name,
          invitationUrl,
          inviterName,
          departmentName: invitation.department.name,
          roleName: invitation.role.name,
          expiresIn: '7 days',
          companyName: process.env.COMPANY_NAME || 'Document Management System'
        };

        const emailSent = await this.emailService.sendInvitationEmail(emailData);
        if (!emailSent) {
          console.warn('Failed to send invitation email, but invitation was created successfully');
        }
      } catch (emailError) {
        console.error('Error sending invitation email:', emailError);
        // Don't throw here - invitation was created successfully, email failure is non-critical
      }

      return {
        invitationId: invitation.invitation_id,
        email: invitation.email,
        invitationToken: invitation.invitation_token,
        expiresAt: invitation.expires_at,
        invitationUrl
      };

    } catch (error) {
      console.error('Error creating invitation:', error);
      throw error;
    }
  }

  /**
   * Get invitation by token
   */
  async getInvitationByToken(token: string) {
    try {
      const invitation = await this.prisma.userInvitation.findUnique({
        where: { invitation_token: token },
        include: {
          department: true,
          role: true,
          invited_by_account: {
            include: {
              user: true
            }
          }
        }
      });

      if (!invitation) {
        throw new Error('Invalid invitation token');
      }

      if (invitation.status !== 'pending') {
        throw new Error('Invitation has already been used or expired');
      }

      if (invitation.expires_at < new Date()) {
        // Mark as expired
        await this.prisma.userInvitation.update({
          where: { invitation_id: invitation.invitation_id },
          data: { status: 'expired' }
        });
        throw new Error('Invitation has expired');
      }

      return invitation;
    } catch (error) {
      console.error('Error getting invitation:', error);
      throw error;
    }
  }

  /**
   * Accept invitation and create user account
   */
  async acceptInvitation(token: string, password: string): Promise<InvitationAcceptResult> {
    try {
      const invitation = await this.getInvitationByToken(token);

      // Hash password
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create account and user
      const account = await this.prisma.account.create({
        data: {
          email: invitation.email,
          password: hashedPassword,
          department_id: invitation.department_id, // Set department_id for consistency
          email_verified: true,
          is_active: true,
          last_login: new Date(),
          user: {
            create: {
              department_id: invitation.department_id,
              first_name: invitation.first_name,
              last_name: invitation.last_name,
              active: true
            }
          }
        },
        include: {
          user: true
        }
      });

      // Assign the role from the invitation to the user
      await this.prisma.userRole.create({
        data: {
          user_id: account.user!.user_id,
          role_id: invitation.role_id,
          assigned_by: invitation.invited_by,
          assigned_at: new Date(),
          is_active: true
        }
      });

      // Mark invitation as accepted
      await this.prisma.userInvitation.update({
        where: { invitation_id: invitation.invitation_id },
        data: {
          status: 'accepted',
          accepted_at: new Date()
        }
      });

      // Generate JWT tokens for automatic login
      const jwt = require('jsonwebtoken');
      const accessToken = jwt.sign(
        { 
          id: account.account_id,
          email: account.email,
          user_id: account.user?.user_id 
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );

      const refreshToken = jwt.sign(
        { 
          id: account.account_id,
          email: account.email 
        },
        process.env.REFRESH_SECRET || 'your-refresh-secret-key',
        { expiresIn: '7d' }
      );

      return {
        success: true,
        message: 'Account created successfully',
        data: {
          token: accessToken,
          refreshToken: refreshToken,
          user: {
            id: account.account_id,
            email: account.email,
            user_id: account.user?.user_id || ''
          }
        }
      };

    } catch (error) {
      console.error('Error accepting invitation:', error);
      throw error;
    }
  }

  /**
   * Get all invitations (admin only)
   */
  async getAllInvitations(invitedBy?: string) {
    try {
      const whereClause = invitedBy ? { invited_by: invitedBy } : {};
      
      const invitations = await this.prisma.userInvitation.findMany({
        where: whereClause,
        include: {
          department: true,
          role: true,
          invited_by_account: {
            include: {
              user: true
            }
          }
        },
        orderBy: {
          created_at: 'desc'
        }
      });

      return invitations;
    } catch (error) {
      console.error('Error getting invitations:', error);
      throw error;
    }
  }

  /**
   * Cancel invitation
   */
  async cancelInvitation(invitationId: string, cancelledBy: string): Promise<boolean> {
    try {
      await this.prisma.userInvitation.update({
        where: { invitation_id: invitationId },
        data: { status: 'cancelled' }
      });

      return true;
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      return false;
    }
  }

  /**
   * Resend invitation (generate new token and extend expiry)
   */
  async resendInvitation(invitationId: string): Promise<InvitationResult> {
    try {
      const invitation = await this.prisma.userInvitation.findUnique({
        where: { invitation_id: invitationId }
      });

      if (!invitation) {
        throw new Error('Invitation not found');
      }

      // Generate new token
      const newToken = crypto.randomBytes(32).toString('hex');
      
      // Set new expiration date
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const updatedInvitation = await this.prisma.userInvitation.update({
        where: { invitation_id: invitationId },
        data: {
          invitation_token: newToken,
          expires_at: expiresAt,
          status: 'pending'
        }
      });

      const invitationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/invitation/accept?token=${newToken}`;

      return {
        invitationId: updatedInvitation.invitation_id,
        email: updatedInvitation.email,
        invitationToken: updatedInvitation.invitation_token,
        expiresAt: updatedInvitation.expires_at,
        invitationUrl
      };

    } catch (error) {
      console.error('Error resending invitation:', error);
      throw error;
    }
  }
}




