import { Request, Response, NextFunction } from 'express';

/**
 * CORS middleware configuration
 */
export const corsOptions = {
  origin: (origin: string | undefined, callback: Function) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000', // Frontend dev server
      'http://localhost:3001', // Alternative frontend port
      process.env.FRONTEND_URL || 'http://localhost:3000'
    ];
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

/**
 * Rate limiting middleware (simple implementation)
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export const rateLimiter = (maxRequests: number = 100, windowMs: number = 15 * 60 * 1000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientId = req.ip || 'unknown';
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean up old entries
    for (const [key, value] of requestCounts.entries()) {
      if (value.resetTime < windowStart) {
        requestCounts.delete(key);
      }
    }

    const clientData = requestCounts.get(clientId);
    
    if (!clientData || clientData.resetTime < windowStart) {
      // First request or window expired
      requestCounts.set(clientId, { count: 1, resetTime: now });
      return next();
    }

    if (clientData.count >= maxRequests) {
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil((clientData.resetTime + windowMs - now) / 1000)
      });
    }

    clientData.count++;
    next();
  };
};

/**
 * Security headers middleware
 */
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  const allowedFrameOrigins = [
    process.env.FRONTEND_URL?.replace(/\/$/, ''),
    process.env.ADMIN_URL?.replace(/\/$/, ''),
    'http://localhost:3000',
    'http://localhost:3001'
  ].filter(Boolean) as string[];

  // Allow document download endpoint to be embedded for inline previews
  const allowFrameEmbedding = /^\/api\/documents\/[^/]+\/files\/[^/]+\/(download|stream)$/i.test(req.path);

  if (!allowFrameEmbedding) {
    res.setHeader('X-Frame-Options', 'DENY');
  } else {
    res.removeHeader('X-Frame-Options');
  }
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Strict Transport Security (only in production)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  const frameAncestors = ["'self'", ...new Set(allowedFrameOrigins)].join(' ');
  const cspDirectives = [
    "default-src 'self'",
    `frame-ancestors ${allowFrameEmbedding ? frameAncestors : "'self'"}`
  ].join('; ');

  res.setHeader('Content-Security-Policy', cspDirectives);
  
  next();
};
