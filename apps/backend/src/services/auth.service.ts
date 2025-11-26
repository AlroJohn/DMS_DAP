import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User, AuthTokenPayload, Permission } from '../types';
import config from '../config';
import { PrismaClient } from '@prisma/client';
import { GoogleUserData } from '../config/oauth.config';
import { EmailService } from './email.service';
import { PermissionService } from './permission.service';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name?: string;
  departmentId?: string;
}

export interface AuthResult {
  user: Omit<User, 'password'>;
  token?: string; // Make optional as it will be set in cookies
  refreshToken?: string; // Make optional as it will be set in cookies
}

/**
 * Auth Service - handles authentication logic
 */
export class AuthService {
  private prisma = new PrismaClient();
  private emailService = new EmailService();
  private permissionService = new PermissionService();

  // In-memory user storage for demo - replace with database
  private users: User[] = [
    {
      id: '1',
      accountId: 'mock-account-1',
      email: 'admin@example.com',
      name: 'Admin User',
      password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
      permissions: ['DOCUMENT_VIEW', 'DOCUMENT_CREATE', 'DOCUMENT_EDIT', 'DOCUMENT_DELETE'],
      roles: [],
      department_id: 'demo-dept',
      first_name: 'Admin',
      last_name: 'User',
      active: true,
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-01-01')
    },
    {
      id: '2',
      accountId: 'mock-account-2',
      email: 'user@example.com',
      name: 'Regular User',
      password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
      permissions: ['DOCUMENT_VIEW'],
      roles: [],
      department_id: 'demo-dept',
      first_name: 'Regular',
      last_name: 'User',
      active: true,
      created_at: new Date('2024-01-02'),
      updated_at: new Date('2024-01-02')
    }
  ];

  /**
   * Register a new user
   */
  async register(data: RegisterData): Promise<AuthResult> {
    // Check if user already exists
    const existingAccount = await this.prisma.account.findUnique({
      where: { email: data.email }
    });

    if (existingAccount) {
      throw new Error('User with this email already exists');
    }

    // Get default department
    const defaultDepartment = await this.prisma.department.findFirst({
      where: { active: true }
    });

    if (!defaultDepartment) {
      throw new Error('No active department found. Please contact administrator.');
    }

    // Get default user role
    const defaultRole = await this.permissionService.getRoleByCode('USER1');
    if (!defaultRole) {
      throw new Error('Default user role not found. Please contact administrator.');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 12);

    // Create new account and user
    const account = await this.prisma.account.create({
      data: {
        email: data.email,
        password: hashedPassword,
        department_id: defaultDepartment.department_id, // Set department_id for account consistency
        email_verified: false,
        is_active: true,
        last_login: new Date(),
        user: {
          create: {
            department_id: defaultDepartment.department_id,
            first_name: data.name?.split(' ')[0] || data.email.split('@')[0],
            last_name: data.name?.split(' ').slice(1).join(' ') || '',
            active: true
          }
        }
      },
      include: {
        user: true
      }
    });

    // Assign default role to the user
    await this.permissionService.assignRoleToUser(
      account.user!.user_id,
      defaultRole.role_id,
      account.account_id // System assigns the role
    );

    // Get user permissions and roles
    const permissions = await this.permissionService.getUserPermissions(account.user!.user_id);
    const roles = await this.permissionService.getUserRoles(account.user!.user_id);
    const roleCodes = await this.permissionService.getUserRoleCodes(account.user!.user_id);

    // Create user object for token generation
    const user: User = {
      id: account.user!.user_id,
      accountId: account.account_id,
      email: account.email,
      name: `${account.user!.first_name} ${account.user!.last_name}`,
      password: hashedPassword,
      permissions: permissions,
      roles: roles,
      department_id: account.user!.department_id,
      first_name: account.user!.first_name,
      last_name: account.user!.last_name,
      middle_name: account.user!.middle_name,
      user_name: account.user!.user_name,
      title: account.user!.title,
      type: account.user!.type,
      avatar: account.user!.avatar,
      active: account.user!.active,
      created_at: account.user!.created_at,
      updated_at: account.user!.updated_at
    };

    // Generate tokens
    const { token, refreshToken } = this.generateTokens(user, roleCodes);

    return {
      user: this.sanitizeUser(user),
      token, // Return tokens for controller to set cookies
      refreshToken, // Return tokens for controller to set cookies
    };
  }

  /**
   * Login user
   */
  async login(credentials: LoginCredentials): Promise<{ user: Omit<User, 'password'>; token: string; refreshToken: string }> {
    // Find account by email in database
    const account = await this.prisma.account.findUnique({
      where: { email: credentials.email },
      include: { user: true }
    });

    if (!account) {
      throw new Error('Invalid email or password');
    }

    // Check if account has a password (not OAuth-only)
    if (!account.password) {
      throw new Error('This account uses social login. Please use Google to sign in.');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(credentials.password, account.password);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    if (!account.user) {
      throw new Error('User profile not found');
    }

    // Get user permissions and roles from the role-based system
    const permissions = await this.permissionService.getUserPermissions(account.user.user_id);
    const roles = await this.permissionService.getUserRoles(account.user.user_id);
    const roleCodes = await this.permissionService.getUserRoleCodes(account.user.user_id);

    // Convert to User type for token generation
    const user: User = {
      id: account.user.user_id,
      accountId: account.account_id,
      email: account.email,
      name: `${account.user.first_name} ${account.user.last_name}`,
      password: account.password,
      permissions: permissions,
      roles: roles,
      department_id: account.user.department_id,
      first_name: account.user.first_name,
      last_name: account.user.last_name,
      middle_name: account.user.middle_name,
      user_name: account.user.user_name,
      title: account.user.title,
      type: account.user.type,
      avatar: account.user.avatar,
      active: account.user.active,
      created_at: account.user.created_at,
      updated_at: account.user.updated_at
    };

    // Generate tokens with role information
    const { token, refreshToken } = this.generateTokens(user, roleCodes);

    return {
      user: this.sanitizeUser(user),
      token,
      refreshToken,
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<{ user: Omit<User, 'password'>; token: string; refreshToken: string }> {
    try {
      const decoded = jwt.verify(refreshToken, config.jwt.secret) as AuthTokenPayload;

      // Find user in database
      // The decoded.userId contains user_id (from User table), not account_id
      const user = await this.prisma.user.findUnique({
        where: { user_id: decoded.userId },
        include: { account: true }
      });

      if (!user || !user.account) {
        throw new Error('User not found');
      }

      const account = user.account;

      // Get user permissions and roles from the role-based system
      const permissions = await this.permissionService.getUserPermissions(user.user_id);
      const roles = await this.permissionService.getUserRoles(user.user_id);
      const roleCodes = await this.permissionService.getUserRoleCodes(user.user_id);

      // Convert to User type for token generation
      const userObj: User = {
        id: user.user_id,
        accountId: account.account_id,
        email: account.email,
        name: `${user.first_name} ${user.last_name}`,
        password: account.password || '',
        permissions: permissions,
        roles: roles,
        department_id: user.department_id,
        first_name: user.first_name,
        last_name: user.last_name,
        middle_name: user.middle_name,
        user_name: user.user_name,
        title: user.title,
        type: user.type,
        avatar: user.avatar,
        active: user.active,
        created_at: user.created_at,
        updated_at: user.updated_at
      };

      const { token: newToken, refreshToken: newRefreshToken } = this.generateTokens(userObj, roleCodes);

      return { user: this.sanitizeUser(userObj), token: newToken, refreshToken: newRefreshToken };
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  /**
   * Verify access token
   */
  async verifyToken(token: string): Promise<AuthTokenPayload> {
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as AuthTokenPayload;

      // Check if user still exists in database
      // The decoded.userId contains user_id (from User table), not account_id
      const user = await this.prisma.user.findUnique({
        where: { user_id: decoded.userId },
        include: { account: true }
      });

      if (!user || !user.account) {
        throw new Error('User not found');
      }

      return decoded;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<Omit<User, 'password'> | null> {
    // The userId is actually user_id from the User table (from JWT token)
    const user = await this.prisma.user.findUnique({
      where: { user_id: userId },
      include: { account: true }
    });

    if (!user || !user.account) {
      // console.log(`User not found for user_id: ${userId}`);
      return null;
    }

    const account = user.account;

    // Get user permissions and roles from the role-based system
    const permissions = await this.permissionService.getUserPermissions(user.user_id);
    const roles = await this.permissionService.getUserRoles(user.user_id);

    // console.log(`Found user: ${account.email}, permissions:`, permissions);

    const userObj: User = {
      id: user.user_id,
      accountId: account.account_id,
      email: account.email,
      name: `${user.first_name} ${user.last_name}`,
      password: account.password || '',
      permissions: permissions,
      roles: roles,
      department_id: user.department_id,
      first_name: user.first_name,
      last_name: user.last_name,
      middle_name: user.middle_name,
      user_name: user.user_name,
      title: user.title,
      type: user.type,
      avatar: user.avatar,
      active: user.active,
      created_at: user.created_at,
      updated_at: user.updated_at
    };

    return this.sanitizeUser(userObj);
  }

  /**
   * Update user permissions - DEPRECATED: Use PermissionService to manage roles instead
   */
  async updateUserPermissions(userId: string, permissions: Permission[]): Promise<Omit<User, 'password'> | null> {
    console.warn('updateUserPermissions is deprecated. Use PermissionService to manage roles instead.');
    return null;
  }

  /**
   * Generate JWT tokens
   */
  private generateTokens(user: User, roleCodes?: string[]): { token: string; refreshToken: string } {
    const payload: AuthTokenPayload = {
      userId: user.id,
      email: user.email,
      permissions: user.permissions,
      roles: roleCodes || []
    };

    const token = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn
    } as jwt.SignOptions);

    const refreshToken = jwt.sign(
      { userId: user.id },
      config.jwt.secret,
      { expiresIn: '7d' } as jwt.SignOptions
    );

    return { token, refreshToken };
  }

  /**
   * Remove password from user object
   */
  private sanitizeUser(user: User): Omit<User, 'password'> {
    const { password, ...sanitizedUser } = user;
    return sanitizedUser;
  }

  /**
   * Create a new user from Google OAuth
   */
  async createGoogleUser(googleData: GoogleUserData): Promise<{ id: string; email: string; name: string }> {
    try {
      // Get or create a default department (you might want to handle this differently)
      const defaultDepartment = await this.prisma.department.findFirst({
        where: { active: true }
      });

      if (!defaultDepartment) {
        throw new Error('No active department found. Please contact administrator.');
      }

      // Get default user role
      const defaultRole = await this.permissionService.getRoleByCode('USER1');
      if (!defaultRole) {
        throw new Error('Default user role not found. Please contact administrator.');
      }

      // Create account
      const account = await this.prisma.account.create({
        data: {
          email: googleData.email,
          google_provider_id: googleData.googleId,
          department_id: defaultDepartment.department_id, // Set department_id for account consistency
          email_verified: true, // Google emails are pre-verified
          is_active: true,
          last_login: new Date(),
          user: {
            create: {
              department_id: defaultDepartment.department_id,
              first_name: googleData.name.split(' ')[0] || googleData.email.split('@')[0],
              last_name: googleData.name.split(' ').slice(1).join(' ') || '',
              active: true,
              avatar: googleData.profilePicture
            }
          }
        },
        include: {
          user: true
        }
      });

      // Assign default role to the user
      await this.permissionService.assignRoleToUser(
        account.user!.user_id,
        defaultRole.role_id,
        account.account_id // System assigns the role
      );

      return {
        id: account.account_id,
        email: account.email,
        name: googleData.name
      };
    } catch (error) {
      console.error('Error creating Google user:', error);
      throw new Error('Failed to create user account');
    }
  }

  /**
   * Link Google account to existing user
   */
  async linkGoogleAccount(accountId: string, googleId: string): Promise<boolean> {
    try {
      await this.prisma.account.update({
        where: { account_id: accountId },
        data: { google_provider_id: googleId }
      });
      return true;
    } catch (error) {
      console.error('Error linking Google account:', error);
      return false;
    }
  }

  /**
   * Unlink Google account from user
   */
  async unlinkGoogleAccount(accountId: string): Promise<boolean> {
    try {
      await this.prisma.account.update({
        where: { account_id: accountId },
        data: { google_provider_id: null }
      });
      return true;
    } catch (error) {
      console.error('Error unlinking Google account:', error);
      return false;
    }
  }

  /**
   * Generate tokens for OAuth user
   */
  async generateTokensForUser(userId: string): Promise<{ token: string; refreshToken: string }> {
    try {
      // Get user from database
      const account = await this.prisma.account.findUnique({
        where: { account_id: userId },
        include: { user: true }
      });

      if (!account) {
        throw new Error('User not found');
      }

      // Get user permissions and roles from the role-based system
      const permissions = await this.permissionService.getUserPermissions(account.user!.user_id);
      const roles = await this.permissionService.getUserRoles(account.user!.user_id);
      const roleCodes = await this.permissionService.getUserRoleCodes(account.user!.user_id);

      // Create a user object for token generation
      const user: User = {
        id: account.user!.user_id, // Use user_id instead of account_id for consistency
        accountId: account.account_id,
        email: account.email,
        name: account.user ? `${account.user.first_name} ${account.user.last_name}` : account.email.split('@')[0],
        password: '', // Not needed for OAuth users
        permissions: permissions,
        roles: roles,
        department_id: account.user!.department_id,
        first_name: account.user!.first_name,
        last_name: account.user!.last_name,
        middle_name: account.user!.middle_name,
        user_name: account.user!.user_name,
        title: account.user!.title,
        type: account.user!.type,
        avatar: account.user!.avatar,
        active: account.user!.active,
        created_at: account.user!.created_at,
        updated_at: account.user!.updated_at
      };

      return this.generateTokens(user, roleCodes);
    } catch (error) {
      console.error('Error generating tokens for user:', error);
      throw new Error('Failed to generate tokens');
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Request password reset - generates reset token and sends email
   */
  async requestPasswordReset(email: string, ipAddress?: string, userAgent?: string): Promise<{ success: boolean; message: string }> {
    try {
      // Check if user exists in database
      const account = await this.prisma.account.findUnique({
        where: { email: email },
        include: { user: true }
      });

      if (!account) {
        // Don't reveal if email exists or not for security
        return { success: true, message: 'If the email exists, a password reset link has been sent.' };
      }

      // Check if user has a password (not OAuth-only account)
      if (!account.password) {
        return { success: false, message: 'This account uses social login. Please use Google to sign in.' };
      }

      // Invalidate any existing reset tokens for this account
      await this.prisma.passwordResetToken.updateMany({
        where: {
          account_id: account.account_id,
          used_at: null
        },
        data: { used_at: new Date() }
      });

      // Generate secure reset token
      const resetToken = crypto.randomBytes(32).toString('hex');

      // Set expiration (1 hour from now)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);

      // Create reset token record
      await this.prisma.passwordResetToken.create({
        data: {
          account_id: account.account_id,
          token: resetToken,
          expires_at: expiresAt,
          ip_address: ipAddress,
          user_agent: userAgent
        }
      });

      // Generate reset URL
      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

      // Send email with reset link
      const emailSent = await this.emailService.sendPasswordResetEmail({
        email: account.email,
        resetUrl: resetUrl,
        userName: account.user ? `${account.user.first_name} ${account.user.last_name}` : undefined,
        expiresIn: '1 hour'
      });

      if (!emailSent) {
        console.error(`Failed to send password reset email to ${email}`);
        // Still return success to not reveal if email exists
      }

      console.log(`Password reset requested for ${email}. Reset URL: ${resetUrl}`);

      return { success: true, message: 'If the email exists, a password reset link has been sent.' };
    } catch (error) {
      console.error('Error requesting password reset:', error);
      throw new Error('Failed to process password reset request');
    }
  }

  /**
   * Verify reset token validity
   */
  async verifyResetToken(token: string): Promise<{ valid: boolean; email?: string; message: string }> {
    try {
      const resetToken = await this.prisma.passwordResetToken.findUnique({
        where: { token: token },
        include: { account: true }
      });

      if (!resetToken) {
        return { valid: false, message: 'Invalid reset token' };
      }

      if (resetToken.used_at) {
        return { valid: false, message: 'Reset token has already been used' };
      }

      if (resetToken.expires_at < new Date()) {
        return { valid: false, message: 'Reset token has expired' };
      }

      return {
        valid: true,
        email: resetToken.account.email,
        message: 'Reset token is valid'
      };
    } catch (error) {
      console.error('Error verifying reset token:', error);
      return { valid: false, message: 'Failed to verify reset token' };
    }
  }

  /**
   * Reset password using token
   */
  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    try {
      // Verify token
      const tokenVerification = await this.verifyResetToken(token);
      if (!tokenVerification.valid) {
        return { success: false, message: tokenVerification.message };
      }

      // Get the reset token record
      const resetToken = await this.prisma.passwordResetToken.findUnique({
        where: { token: token },
        include: { account: true }
      });

      if (!resetToken) {
        return { success: false, message: 'Invalid reset token' };
      }

      // Validate new password
      if (newPassword.length < 6) {
        return { success: false, message: 'Password must be at least 6 characters long' };
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      // Update account password and mark token as used
      await this.prisma.$transaction([
        this.prisma.account.update({
          where: { account_id: resetToken.account_id },
          data: {
            password: hashedPassword,
            updated_at: new Date()
          }
        }),
        this.prisma.passwordResetToken.update({
          where: { token_id: resetToken.token_id },
          data: { used_at: new Date() }
        })
      ]);

      // Invalidate all other reset tokens for this account
      await this.prisma.passwordResetToken.updateMany({
        where: {
          account_id: resetToken.account_id,
          token_id: { not: resetToken.token_id },
          used_at: null
        },
        data: { used_at: new Date() }
      });

      return { success: true, message: 'Password has been reset successfully' };
    } catch (error) {
      console.error('Error resetting password:', error);
      throw new Error('Failed to reset password');
    }
  }

  /**
   * Clean up expired reset tokens (should be called periodically)
   */
  async cleanupExpiredResetTokens(): Promise<number> {
    try {
      const result = await this.prisma.passwordResetToken.deleteMany({
        where: {
          expires_at: { lt: new Date() }
        }
      });

      return result.count;
    } catch (error) {
      console.error('Error cleaning up expired reset tokens:', error);
      return 0;
    }
  }
}
