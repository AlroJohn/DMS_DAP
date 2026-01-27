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
   - `prisma/seed.ts`

   Additionally, a reference in `src/controllers/search.controller.ts` was corrected to remove the incorrect `SearchController.prisma` usage and use the imported `prisma` instance instead.

Note: The OCR worker (`src/workers/ocr.worker.ts`) imports the prisma instance from the lib/prisma.ts file. Since worker threads operate in separate contexts, each worker creates its own module context. However, the main application now uses the singleton pattern consistently across all non-worker files, which significantly reduces the number of concurrent connections.

3. **Enhanced Prisma Configuration**: The `src/lib/prisma.ts` file implements the singleton pattern and adds connection management features including:
   - Proper initialization with connection options
   - Graceful shutdown handler with disconnect function

4. **Graceful Shutdown Implementation**: The main application server (`src/index.ts`) now properly handles shutdown signals to disconnect the Prisma client, preventing connection leaks during restarts and deployments.

5. **Database Connection Monitoring**: Added a database connection monitor utility (`src/utils/db-monitor.ts`) that is integrated into the main application (`src/index.ts`) to track active connections and provide warnings when approaching connection limits. The monitor runs every 30 seconds and sets a maximum connection limit of 8 to stay under server limits.

6. **Sequential Query Execution**: Updated the dashboard service (`src/services/dashboard.service.ts`) to execute database queries sequentially instead of in parallel using `Promise.all()`. This prevents connection exhaustion when processing multiple departments simultaneously.

## Benefits
- Prevents the "too many clients" error by ensuring only one PrismaClient instance exists
- Reduces memory usage by eliminating multiple client instances
- Improves performance by reusing the same connection pool
- Provides graceful shutdown handling to properly close database connections
- Adds connection monitoring to detect and warn about approaching connection limits
- Includes health checks to verify database connectivity
- Minimizes the risk of connection exhaustion during high load periods
- Maintains consistent database connection behavior across the application

## Additional Configuration Recommendations

For optimal database connection management, consider the following environment variable settings:

```env
# Database connection pool settings (these would be added to your .env file)
DIRECT_DATABASE_URL="postgresql://username:password@host:port/database"
SHADOW_DATABASE_URL="postgresql://username:password@shadow-host:port/database"

# Connection pool settings (if supported by your hosting platform)
DATABASE_POOL_MIN=1
DATABASE_POOL_MAX=5
DATABASE_POOL_TIMEOUT=30
```

## Testing
After implementing these changes, the application should no longer experience the "too many clients" error when performing database operations.

## Additional Notes

- The OCR worker (`src/workers/ocr.worker.ts`) runs in a separate thread and shares the same Prisma client instance through the lib/prisma.ts singleton
- The connection monitor runs every 30 seconds to check connection health
- The maximum connection limit is set to 8 to stay under typical server limits (default is often 20)
- During deployment or restart, the graceful shutdown ensures all connections are properly closed
- The health check endpoint (`/health`) now includes database connectivity verification

Connection pooling is handled internally by Prisma and PostgreSQL. The default connection pool settings should be sufficient for most use cases. If connection issues persist, consider adjusting PostgreSQL's `max_connections` setting or implementing additional connection management strategies.

## Known Issues
- Prisma Studio may occasionally show errors related to its embedded build, but this does not affect the core application functionality.
- If using Prisma Studio, ensure you're using compatible versions of Prisma CLI and Prisma Client.