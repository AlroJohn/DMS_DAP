# GEMINI - Your AI Assistant's Guide to this Project

This document provides context for the Gemini AI assistant to understand and effectively assist with this project.

## Project Overview

This is a [Turborepo](https://turbo.build/repo) monorepo managed with [pnpm](https://pnpm.io/). It contains a [Next.js](https://nextjs.org/) frontend and an [Express.js](https://expressjs.com/) backend.

- **`apps/frontend`**: A Next.js application that serves as the user interface.
- **`apps/backend`**: An Express.js application that provides the backend API.
- **`packages/shared`**: Intended for shared code, such as utility functions or UI components, to be used across the applications.
- **`packages/types`**: Intended for shared TypeScript type definitions to ensure type safety between the frontend and backend.

## Architecture & Technology Stack

### Frontend
- **Framework**: Next.js with React
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: Zustand
- **Data Fetching**: TanStack Query
- **Icons**: Lucide React (inferred from dependencies)

### Backend
- **Framework**: Express.js
- **Runtime**: Node.js
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with bcrypt password hashing, Passport.js for Google OAuth
- **Real-time**: Socket.io for live features
- **Validation**: (Not explicitly found, but common in Express apps)

### Database Schema Structure
The `apps/backend/prisma/schema.prisma` file defines a comprehensive database schema with entities for:
- Accounts & Users
- Departments
- Documents (with metadata, details, types)
- Roles & Permissions (RBAC)
- User Sessions & Session Logs
- User Invitations
- Password Reset Tokens

## Building and Running

The following `pnpm` scripts are available for common development tasks. These scripts utilize [Turborepo](https://turbo.build/repo) to optimize the execution of tasks across the monorepo.

*   `pnpm dev`: Start all applications in development mode.
*   `pnpm build`: Build all applications.
*   `pnpm start`: Start all applications in production mode.
*   `pnpm lint`: Lint all packages.
*   `pnpm clean`: Clean all build artifacts.

### Frontend (`apps/frontend`)

A [Next.js](https://nextjs.org/) application that serves as the user interface.

-   `pnpm --filter frontend dev`: Starts the Next.js development server with Turbopack on port `3000`.
-   `pnpm --filter frontend build`: Creates a production build of the Next.js application.
-   `pnpm --filter frontend start`: Starts the Next.js production server.
-   `pnpm --filter frontend lint`: Lints the frontend codebase.

### Backend (`apps/backend`)

The backend is an [Express.js](https://expressjs.com/) application.

-   `pnpm --filter backend dev`: Starts the Express.js application in development mode with `tsx` on port `3001` (inferred from `src/index.ts` and `package.json`).
-   `pnpm --filter backend dev:watch`: Starts the Express.js application in development mode with file watching.
-   `pnpm --filter backend build`: Builds the Express.js application using `tsc`.
-   `pnpm --filter backend start`: Starts the Express.js application in production mode.
-   `pnpm --filter backend db:seed`: Seeds the database with dummy data.
-   `pnpm --filter backend db:reset`: Resets the database.
-   `pnpm --filter backend db:push`: Pushes the Prisma schema to the database.
-   `pnpm --filter backend db:migrate`: Runs Prisma migrations.
-   `pnpm --filter backend db:studio`: Opens Prisma Studio.

## Development Conventions

*   **Monorepo Management**: This project uses [Turborepo](https://turbo.build/repo) to manage the monorepo. All commands should be run from the root of the project.
*   **Package Management**: [pnpm](https://pnpm.io/) is used for package management. Use `pnpm` for all dependency-related operations.
*   **Code Style**: ESLint is used for linting (inferred from frontend `eslint.config.mjs` and root `lint` script).
*   **Shared Code**: The `packages/shared` and `packages/types` directories are intended for code that is shared between the frontend and backend.
*   **Environment Variables**: Environment variables are managed centrally in the `.env` file at the project root (inferred from `README.md` and common practice).
*   **Socket.IO Setup**: The backend (`apps/backend`) uses `socket.io` for real-time communication. The frontend (`apps/frontend`) uses `socket.io-client`.
*   **TanStack Query Setup**: The frontend (`apps/frontend`) uses `@tanstack/react-query` for server state management.
*   **Prisma Setup**: Prisma CLI and Client are installed in `apps/backend` for database schema management. The `schema.prisma` file is configured for PostgreSQL and uses `DATABASE_URL`.
