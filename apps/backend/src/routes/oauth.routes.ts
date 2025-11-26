import { Router } from 'express';
import passport from 'passport';
import { googleStrategy } from '../config/oauth.config';
import { AuthController } from '../controllers/auth.controller';
import { asyncHandler } from '../middleware/error-handler';
import { sendSuccess, sendError } from '../utils/response';

const router = Router();

// Register Google strategy
passport.use('google', googleStrategy);

/**
 * GET /api/auth/google - Initiate Google OAuth
 */
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

/**
 * GET /api/auth/google/callback - Google OAuth callback
 * Use a custom callback to handle verify errors gracefully and redirect to UI.
 */
router.get(
  '/google/callback',
  (req, res, next) => {
    passport.authenticate('google', { session: false }, async (err: any, user: any, info: any) => {
      try {
        if (err) {
          // Invitation missing or other verify error → show UI
          return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=invitation_required`);
        }

        if (!user) {
          // Authentication failed (no user)
          return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=oauth_failed`);
        }

        // If this is a first-time invited Google login, require password setup before issuing tokens
        if (user.loginMethod === 'google_invited' && user.passwordSetupToken) {
          const setupUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/create-password?token=${encodeURIComponent(user.passwordSetupToken)}&email=${encodeURIComponent(user.email || '')}`;
          return res.redirect(setupUrl);
        }

        // Generate JWT tokens for the user
        const authController = new AuthController();
        const tokens = await authController.generateTokensForUser(user.id);

        // Redirect to frontend with tokens
        const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/callback?token=${tokens.token}&refresh=${tokens.refreshToken}&method=${user.loginMethod}`;
        return res.redirect(redirectUrl);
      } catch (e) {
        console.error('OAuth callback error:', e);
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=oauth_error`);
      }
    })(req, res, next);
  }
);

/**
 * POST /api/auth/google/link - Link Google account to existing user
 */
router.post('/google/link', asyncHandler(async (req: any, res: any) => {
  const { googleId } = req.body;
  const userId = req.user?.id;

  if (!userId || !googleId) {
    return sendError(res, 'User ID and Google ID are required', 400);
  }

  try {
    const authController = new AuthController();
    const success = await authController.linkGoogleAccount(userId, googleId);
    
    if (success) {
      return sendSuccess(res, { message: 'Google account linked successfully' });
    } else {
      return sendError(res, 'Failed to link Google account', 400);
    }
  } catch (error: any) {
    return sendError(res, error.message, 400);
  }
}));

/**
 * POST /api/auth/google/unlink - Unlink Google account from user
 */
router.post('/google/unlink', asyncHandler(async (req: any, res: any) => {
  const userId = req.user?.id;

  if (!userId) {
    return sendError(res, 'User not authenticated', 401);
  }

  try {
    const authController = new AuthController();
    const success = await authController.unlinkGoogleAccount(userId);
    
    if (success) {
      return sendSuccess(res, { message: 'Google account unlinked successfully' });
    } else {
      return sendError(res, 'Failed to unlink Google account', 400);
    }
  } catch (error: any) {
    return sendError(res, error.message, 400);
  }
}));

export default router;
