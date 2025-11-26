import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { PrismaClient } from '@prisma/client';
import { AuthService } from '../services/auth.service';
import crypto from 'crypto';

const prisma = new PrismaClient();
const authService = new AuthService();

export const googleOAuthConfig = {
  clientID: process.env.GOOGLE_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3001/api/auth/google/callback'
};

export const googleStrategy = new GoogleStrategy(
  {
    clientID: googleOAuthConfig.clientID,
    clientSecret: googleOAuthConfig.clientSecret,
    callbackURL: googleOAuthConfig.callbackURL,
    scope: ['profile', 'email']
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const { id: googleId, emails, displayName, photos } = profile;
      const email = emails?.[0]?.value;

      if (!email) {
        return done(new Error('No email provided by Google'), undefined);
      }

      // Check if user already exists with this Google ID
      let account = await prisma.account.findUnique({
        where: { google_provider_id: googleId },
        include: { user: true }
      });

      if (account) {
        // User exists with Google OAuth
        return done(null, {
          id: account.account_id,
          email: account.email,
          name: account.user?.first_name + ' ' + account.user?.last_name,
          googleId: googleId,
          loginMethod: 'google'
        });
      }

      // Check if user exists with this email (for account linking)
      account = await prisma.account.findUnique({
        where: { email: email },
        include: { user: true }
      });

      if (account && !account.google_provider_id) {
        // Link Google account to existing account
        await prisma.account.update({
          where: { account_id: account.account_id },
          data: { google_provider_id: googleId }
        });

        return done(null, {
          id: account.account_id,
          email: account.email,
          name: account.user?.first_name + ' ' + account.user?.last_name,
          googleId: googleId,
          loginMethod: 'google_linked'
        });
      }

      // Check if there's a pending invitation for this email
      const invitation = await prisma.userInvitation.findFirst({
        where: {
          email: email,
          status: 'pending',
          expires_at: {
            gt: new Date()
          }
        },
        include: {
          department: true,
          role: true
        }
      });

      if (invitation) {
        // Accept invitation and create account
        const account = await prisma.account.create({
          data: {
            email: email,
            google_provider_id: googleId,
            email_verified: true,
            is_active: true,
            last_login: new Date(),
            user: {
              create: {
                department_id: invitation.department_id,
                first_name: invitation.first_name,
                last_name: invitation.last_name,
                active: true,
                avatar: photos?.[0]?.value
              }
            }
          },
          include: {
            user: true
          }
        });

        // Create a short-lived password setup token (reuse passwordResetToken table)
        const setupToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1);
        await prisma.passwordResetToken.create({
          data: {
            account_id: account.account_id,
            token: setupToken,
            expires_at: expiresAt,
            ip_address: undefined,
            user_agent: 'oauth-setup'
          }
        });

        // Assign the role from the invitation to the user
        await prisma.userRole.create({
          data: {
            user_id: account.user!.user_id,
            role_id: invitation.role_id,
            assigned_by: invitation.invited_by,
            assigned_at: new Date(),
            is_active: true
          }
        });

        // Mark invitation as accepted
        await prisma.userInvitation.update({
          where: { invitation_id: invitation.invitation_id },
          data: {
            status: 'accepted',
            accepted_at: new Date()
          }
        });

        return done(null, {
          id: account.account_id,
          email: account.email,
          name: `${invitation.first_name} ${invitation.last_name}`,
          googleId: googleId,
          loginMethod: 'google_invited',
          passwordSetupToken: setupToken
        });
      } else {
        // No invitation found - signal handled failure (not a 500)
        return done(null, false, { reason: 'invitation_required' });
      }

    } catch (error) {
      console.error('Google OAuth error:', error);
      // Treat unexpected errors as failures so route can redirect
      return done(error as any, undefined);
    }
  }
);

export interface GoogleUserData {
  googleId: string;
  email: string;
  name: string;
  profilePicture?: string;
}
