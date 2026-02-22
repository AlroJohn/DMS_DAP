import dotenv from 'dotenv';

import { resolveEnvPath } from './env';

// Load environment variables from root directory
const envPath = resolveEnvPath();
const result = dotenv.config({ path: envPath });
if (result.error) {
  console.error('Error loading .env:', result.error);
} else {
  console.log(`Environment variables loaded successfully from ${envPath}`);
}

const parseServerPort = (value: string | undefined, fallback = 3001): number => {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (Number.isInteger(parsed) && parsed > 0 && parsed <= 65535) {
    return parsed;
  }

  // Handle accidental URL values (e.g. "https://dms-be.dap.edu.ph")
  if (value.includes('://')) {
    try {
      const url = new URL(value);
      if (url.port) {
        const urlPort = Number.parseInt(url.port, 10);
        if (Number.isInteger(urlPort) && urlPort > 0 && urlPort <= 65535) {
          console.warn(`[config] Invalid PORT value "${value}". Falling back to URL port ${urlPort}.`);
          return urlPort;
        }
      }
    } catch {
      // Ignore URL parse errors and use fallback below
    }
  }

  console.warn(`[config] Invalid PORT value "${value}". Falling back to ${fallback}.`);
  return fallback;
};

export const config = {
  // Server configuration
  port: parseServerPort(process.env.PORT),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database configuration
  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/dms',
  },

  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
    // Refresh token configuration (long-lived for session persistence)
    refreshSecret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'your-secret-key',
    // Match access token lifetime by default
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '8h',
  },

  // CORS configuration
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },

  // Rate limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    enableRequestLogging: process.env.ENABLE_REQUEST_LOGGING !== 'false',
  },

  // File upload
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB
    allowedTypes: process.env.ALLOWED_FILE_TYPES?.split(',') || ['pdf', 'doc', 'docx', 'txt'],
  },

  // Pagination defaults
  pagination: {
    defaultLimit: parseInt(process.env.DEFAULT_PAGE_LIMIT || '10'),
    maxLimit: parseInt(process.env.MAX_PAGE_LIMIT || '100'),
  },

  // DoconChain API configuration
  doconChain: {
    baseUrl: process.env.DOCONCHAIN_BASE_URL || 'https://stg-api2.doconchain.com',
    clientKey: process.env.DOCONCHAIN_CLIENT_KEY || '',
    clientSecret: process.env.DOCONCHAIN_CLIENT_SECRET || '',
    clientEmail: process.env.DOCONCHAIN_CLIENT_EMAIL || '',
    userType: process.env.DOCONCHAIN_USER_TYPE || 'ENTERPRISE_API',
    defaultTokenTtl: parseInt(process.env.DOCONCHAIN_TOKEN_TTL || '3300'), // ~55 minutes fallback
  }
};

export default config;

