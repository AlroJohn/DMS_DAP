import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from root directory
// Go up from apps/backend to root: apps/backend -> apps -> root
const envPath = path.resolve(process.cwd(), '../../.env');
console.log('Loading .env from:', envPath);
const result = dotenv.config({ path: envPath });
if (result.error) {
  console.error('Error loading .env:', result.error);
} else {
  console.log('Environment variables loaded successfully');
}

export const config = {
  // Server configuration
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database configuration
  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/dms',
  },
  
  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
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

