# Database Connection Fixes

## Issue
The application was experiencing the error: "FATAL: sorry, too many clients already" when trying to connect to the PostgreSQL database. This error occurs when the application opens too many database connections simultaneously, exceeding the PostgreSQL server's maximum connection limit.

## Root Cause
Multiple files in the application were creating their own PrismaClient instances instead of using a singleton pattern. This led to multiple connections being opened simultaneously, eventually exceeding the PostgreSQL connection limit.

## Solution
Implemented a singleton pattern for PrismaClient across the entire application:

1. **Centralized Prisma Client**: All files now import the Prisma client from `src/lib/prisma.ts` which implements the singleton pattern.

2. **Updated Files**: The following files were updated to use the centralized Prisma client:
   - `src/services/document-action.service.ts`
   - `src/services/DocumentSignatureWorkflowService.service.ts`
   - `src/services/document-type.service.ts`
   - `src/services/search.service.ts`
   - `src/services/document-trails.service.ts`
   - `src/services/scheduled-reports.processor.ts`
   - `src/services/document-reports.service.ts`
   - `src/services/notification.service.ts`
   - `src/config/oauth.config.ts`
   - `src/controllers/search.controller.ts`
   - `src/routes/document-text-placeholders.ts`
   - `src/routes/document-signatures.ts`

   Additionally, a reference in `src/controllers/search.controller.ts` was corrected to remove the incorrect `SearchController.prisma` usage and use the imported `prisma` instance instead.

Note: The OCR worker (`src/workers/ocr.worker.ts`) was already correctly importing the prisma instance from the lib/prisma.ts file, but worker threads operate in separate contexts and may still create additional connections. The singleton pattern should still help minimize the total number of connections created.

3. **Singleton Pattern Implementation**: The `src/lib/prisma.ts` file implements the singleton pattern to ensure only one PrismaClient instance is created across the entire application.

## Benefits
- Prevents the "too many clients" error by ensuring only one PrismaClient instance exists
- Reduces memory usage by eliminating multiple client instances
- Improves performance by reusing the same connection pool
- Maintains consistent database connection behavior across the application

## Testing
After implementing these changes, the application should no longer experience the "too many clients" error when performing database operations.

## Additional Notes
Connection pooling is handled internally by Prisma and PostgreSQL. The default connection pool settings should be sufficient for most use cases. If connection issues persist, consider adjusting PostgreSQL's `max_connections` setting or implementing additional connection management strategies.