# Welcome to the NextJS + Express Document Management System (DMS)

## Introduction

This project is a Next.js frontend application paired with an Express-based backend, designed to manage documents. It follows a clean architecture pattern and leverages modern web development technologies such as TypeScript, React, Next.js, Node.js, Express, Prisma, PostgreSQL.

## Features

- **Dual Authentication**: Support for both manual email/password login and Google OAuth
- **Account Linking**: Existing users can link their Google accounts
- **Role-based Access Control**: Comprehensive permission system
- **Document Management**: Full document lifecycle management
- **Real-time Updates**: Socket.IO integration for live updates
- **Security**: JWT authentication, rate limiting, and security headers

## Getting Started

To clone the repository or start working on this project:
1. Clone the repository from its source or checkout it directly if provided by your team.
2. Install dependencies using pnpm: `pnpm install`
3. Set up environment variables (see below)
4. Start both frontend and backend servers for development purposes:
   ```bash
   # Frontend Development Server
   pnpm dev:front

   # Backend Development Server
   pnpm dev:back
   ```

## Environment Setup

### Backend Environment
Copy `apps/backend/.env.example` to `apps/backend/.env` and configure:
- Database connection
- JWT secrets
- Google OAuth credentials (see [Google OAuth Setup Guide](apps/backend/GOOGLE_OAUTH_SETUP.md))

### Frontend Environment
Copy `apps/frontend/.env.example` to `apps/frontend/.env.local` and configure:
- API URL

## Database Setup

```bash
# Generate Prisma client
pnpm prisma:generate

# Push schema to database
pnpm prisma:push

# seed dummy data to database
cd apps
cd backend
pnpm run db:seed
```

## Google OAuth Setup

For Google OAuth authentication, follow the detailed setup guide:
[Google OAuth Setup Guide](apps/backend/GOOGLE_OAUTH_SETUP.md)

## Authentication Features

### Manual Login
- Email/password authentication
- JWT token-based sessions
- Refresh token support

### Google OAuth
- One-click Google sign-in
- Automatic account creation for new users
- Account linking for existing users
- Secure token handling
