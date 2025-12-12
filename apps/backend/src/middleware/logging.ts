import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Request logging middleware
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const requestId = uuidv4().slice(0, 8); // Short UUID for readability
  const requestTimestamp = new Date().toISOString();

  // Attach requestId to request object for use in other middlewares/handlers
  (req as any).id = requestId;

  // Log incoming request
  console.log(
    `[${requestTimestamp}] [${requestId}] ----> ${req.method} ${req.originalUrl} - IP: ${req.ip}`
  );

  // Override res.end to log response details
  const originalEnd = res.end;
  res.end = function (chunk?: any, encoding?: any): any {
    const duration = Date.now() - start;
    const responseTimestamp = new Date().toISOString();
    console.log(
      `[${responseTimestamp}] [${requestId}] <---- ${req.method} ${req.originalUrl} - Status: ${res.statusCode} - ${duration}ms`
    );
    return originalEnd.call(this, chunk, encoding);
  };

  next();
};


/**
 * Error logging middleware
 */
export const errorLogger = (error: Error, req: Request, res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  const requestId = (req as any).id || 'unknown';

  console.error(`[${timestamp}] [${requestId}] ERROR: ${error.message}`);
  console.error(`[${timestamp}] [${requestId}] Stack: ${error.stack}`);
  console.error(`[${timestamp}] [${requestId}] Request: ${req.method} ${req.originalUrl}`);

  next(error);
};
