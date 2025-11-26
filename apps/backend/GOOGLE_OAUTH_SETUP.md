# Google OAuth Setup Guide

This guide will help you set up Google OAuth authentication for your DMS application.

## Prerequisites

1. A Google Cloud Platform account
2. A Google Cloud project
3. Node.js and npm/pnpm installed

## Step 1: Google Cloud Console Setup

### 1.1 Create a Google Cloud Project
1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API (if not already enabled)

### 1.2 Configure OAuth Consent Screen
1. Navigate to "APIs & Services" > "OAuth consent screen"
2. Choose "External" user type (unless you have a Google Workspace)
3. Fill in the required fields:
   - App name: Your DMS application name
   - User support email: Your email
   - Developer contact information: Your email
4. Add scopes:
   - `../auth/userinfo.email`
   - `../auth/userinfo.profile`
5. Add test users (for development)

### 1.3 Create OAuth 2.0 Credentials
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Choose "Web application"
4. Add authorized redirect URIs:
   - Development: `http://localhost:3001/api/auth/google/callback`
   - Production: `https://yourdomain.com/api/auth/google/callback`
5. Copy the Client ID and Client Secret

## Step 2: Environment Configuration

### 2.1 Backend Environment
Create a `.env` file in `apps/backend/` with the following variables:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_CALLBACK_URL="http://localhost:3001/api/auth/google/callback"

# Other required variables
DATABASE_URL="your-database-url"
JWT_SECRET="your-jwt-secret"
SESSION_SECRET="your-session-secret"
FRONTEND_URL="http://localhost:3000"
```

### 2.2 Frontend Environment
Create a `.env.local` file in `apps/frontend/` with:

```env
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

## Step 3: Install Dependencies

Run the following commands to install the required packages:

```bash
# Install backend dependencies
cd apps/backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

## Step 4: Database Setup

Make sure your database is set up with the Prisma schema:

```bash
cd apps/backend
npx prisma generate
npx prisma db push
```

## Step 5: Testing the Implementation

### 5.1 Start the Backend Server
```bash
cd apps/backend
npm run dev
```

### 5.2 Start the Frontend Server
```bash
cd apps/frontend
npm run dev
```

### 5.3 Test Google OAuth
1. Navigate to `http://localhost:3000/login`
2. Click "Login with Google"
3. Complete the Google OAuth flow
4. You should be redirected back to your application

## User Account Creation Strategy

The implementation supports two approaches for new users:

### Approach 1: Automatic Account Creation (Recommended)
- New users signing in with Google will automatically have accounts created
- They'll be assigned to a default department
- Default permissions are granted

### Approach 2: Invitation-Based Registration
- Admin creates user accounts first
- Users can then link their Google accounts
- More control over user onboarding

## API Endpoints

The following OAuth endpoints are available:

- `GET /api/auth/google` - Initiate Google OAuth
- `GET /api/auth/google/callback` - OAuth callback handler
- `POST /api/auth/google/link` - Link Google account to existing user
- `POST /api/auth/google/unlink` - Unlink Google account from user

## Security Considerations

1. **Environment Variables**: Never commit `.env` files to version control
2. **HTTPS in Production**: Always use HTTPS in production
3. **Session Security**: Use secure session cookies in production
4. **Rate Limiting**: Implement rate limiting on OAuth endpoints
5. **Token Storage**: Store JWT tokens securely on the client side

## Troubleshooting

### Common Issues

1. **"Invalid redirect URI"**: Ensure the callback URL matches exactly in Google Console
2. **"Access blocked"**: Check OAuth consent screen configuration
3. **"Invalid client"**: Verify Client ID and Secret are correct
4. **CORS errors**: Ensure CORS is properly configured for your frontend URL

### Debug Mode

Enable debug logging by setting:
```env
NODE_ENV=development
```

## Production Deployment

For production deployment:

1. Update OAuth consent screen to "Published" status
2. Use HTTPS URLs for all redirect URIs
3. Set secure session cookies
4. Use environment-specific configuration
5. Implement proper error handling and logging

## Support

For issues or questions:
1. Check the Google OAuth documentation
2. Review the application logs
3. Verify environment configuration
4. Test with Google's OAuth 2.0 Playground


pnpm run db:seed