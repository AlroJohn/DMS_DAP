import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from root directory
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

export const securityConfig = {
  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'a8b9c7d2e5f3a1b4c6d8e9f2a3b5c7d9e1f4a6b8c9d2e5f7a9b1c3d5e7f9a2b4c6d8e0f2a4b6c8d0e2f4a6b8c0d2e4f6a8b0c2d4f6a8b0',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  // CORS configuration
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    allowedOrigins: [
      'http://localhost:3000',
      'http://localhost:3001',
      process.env.FRONTEND_URL || 'http://localhost:3000'
    ]
  },

  // Rate limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000'), // Increased for development
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  },

  // Security headers
  securityHeaders: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    crossOriginEmbedderPolicy: false,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  },

  // Password requirements
  password: {
    minLength: 6,
    requireUppercase: false,
    requireLowercase: false,
    requireNumbers: false,
    requireSpecialChars: false,
  },

  // Session configuration
  session: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict' as const,
  },

  // File upload security
  fileUpload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB
    allowedTypes: process.env.ALLOWED_FILE_TYPES?.split(',') || ['pdf', 'doc', 'docx', 'txt', 'jpg', 'png'],
    scanForViruses: process.env.SCAN_FILES === 'true',
  },

  // API security
  api: {
    enableApiKeyAuth: process.env.ENABLE_API_KEY_AUTH === 'true',
    apiKeyHeader: 'X-API-Key',
    trustedProxies: process.env.TRUSTED_PROXIES?.split(',') || [],
  },

  // Audit logging
  audit: {
    enableAuditLog: process.env.ENABLE_AUDIT_LOG !== 'false',
    logLevel: process.env.AUDIT_LOG_LEVEL || 'info',
    sensitiveFields: ['password', 'token', 'secret', 'key'],
  }
};

export default securityConfig;

