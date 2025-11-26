import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import passport from 'passport';
import session from 'express-session';
import cookieParser from 'cookie-parser'; // Import cookie-parser

// Add this to handle BigInt serialization
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

// Import services
import { AuthService } from './services/auth.service';
import { UserService } from './services/user.service';

// Import routes
import authRoutes from './routes/auth.routes';
import documentRoutes from './routes/documents.routes';
import documentCheckoutRoutes from './routes/document-checkout.route';
import documentReleaseRoutes from './routes/document-release.route';
import oauthRoutes from './routes/oauth.routes';
import invitationRoutes from './routes/invitation.routes';
import roleRoutes from './routes/role.routes';
import permissionRoutes from './routes/permission.routes';
import departmentRoutes from './routes/department.route';
import documentTypeRoutes from './routes/document-type.route';
import documentActionRoutes from './routes/document-action.route';
import userRoutes from './routes/user.routes';
import doconChainRoutes from './routes/doconchain.routes';
import searchRoutes from './routes/search.routes';
import intransitRoutes from './routes/intransit.routes';
import recycleBinRoutes from './routes/recyclebin.routes';
import sharedDocumentRoutes from './routes/shared-document.routes';
import documentMetadataRoutes from './routes/document-metadata.routes'; // Import the new route
import notificationsRoutes from './routes/notifications'; // Import notifications route
import archiveRoutes from './routes/archive.routes'; // Import archive routes
import dashboardRoutes from './routes/dashboard.routes'; // Import dashboard routes

// Import middleware
import { requestLogger, errorLogger } from './middleware/logging';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { securityHeaders, rateLimiter } from './middleware/security';

// Import configuration
import config from './config';
import securityConfig from './config/security.config';

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO with proper CORS
const io = new Server(server, {
  cors: {
    origin: securityConfig.cors.allowedOrigins,
    credentials: securityConfig.cors.credentials,
  },
});

// Socket.IO middleware for authentication
const authService = new AuthService();
const userService = new UserService();

io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error: Token not provided.'));
  }

  try {
    const decoded = await authService.verifyToken(token);
    const user = await userService.getUserById(decoded.userId);

    if (!user) {
      return next(new Error('Authentication error: User not found.'));
    }

    (socket as any).user = user;
    next();
  } catch (error) {
    return next(new Error('Authentication error: Invalid token.'));
  }
});

// Security middleware
app.use(helmet(securityConfig.securityHeaders));
app.use(securityHeaders);
app.use(compression());

// CORS configuration
app.use(cors({
  origin: securityConfig.cors.allowedOrigins,
  credentials: securityConfig.cors.credentials,
}));

// Rate limiting
app.use(rateLimiter(securityConfig.rateLimit.maxRequests, securityConfig.rateLimit.windowMs));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(cookieParser()); // Add cookie-parser middleware here

// Session configuration for OAuth
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-this-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: config.nodeEnv === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Logging middleware
if (config.logging.enableRequestLogging) {
  app.use(requestLogger);
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv,
    version: process.env.npm_package_version || '1.0.0',
  });
});

// API routes - clean layered architecture
app.use('/api/auth', authRoutes);
app.use('/api/auth', oauthRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/files', documentCheckoutRoutes);
app.use('/api/documents', documentReleaseRoutes);
app.use('/api', invitationRoutes);
app.use('/api/admin/roles', roleRoutes);
app.use('/api/admin/permissions', permissionRoutes);
app.use('/api/admin/departments', departmentRoutes);
app.use('/api/admin/document-types', documentTypeRoutes);
app.use('/api/admin/document-actions', documentActionRoutes);
// Document sharing user search - separate route for document sharing
import userSearchRoutes from './routes/user-search.routes';

app.use('/api/admin/users', userRoutes);
app.use('/api/users', userSearchRoutes);
app.use('/api/doconchain', doconChainRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/intransit', intransitRoutes);
app.use('/api/recycle-bin', recycleBinRoutes);
app.use('/api/shared', sharedDocumentRoutes);
app.use('/api/document-metadata', documentMetadataRoutes); // Add the new route
app.use('/api/notifications', notificationsRoutes); // Add notifications route
app.use('/api/archive', archiveRoutes); // Add archive routes
app.use('/api/dashboard', dashboardRoutes); // Add dashboard routes

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`[${new Date().toISOString()}] User connected: ${socket.id}`);
  const user = (socket as any).user;

  if (user && user.department_id) {
    socket.join(`department_${user.department_id}`);
    console.log(`User ${user.user_id} joined department room: department_${user.department_id}`);
  }

  // Automatically join user to their personal room based on their user ID
  if (user && user.user_id) {
    socket.join(`user-${user.user_id}`);
    console.log(`User ${user.user_id} joined their personal room`);
  }

  // Join user to their personal room (for compatibility with existing clients)
  socket.on('join-user-room', (userId: string) => {
    socket.join(`user-${userId}`);
    console.log(`User ${userId} joined their personal room`);
  });

  // Handle document updates
  socket.on('document-updated', (data) => {
    // Broadcast to all users in the document room
    socket.to(`document-${data.documentId}`).emit('document-changed', data);
  });

  socket.on('disconnect', () => {
    console.log(`[${new Date().toISOString()}] User disconnected: ${socket.id}`);
  });
});

import { setSocketInstance } from './socket';

// Set the socket instance for use in services
setSocketInstance(io);

// Export the io instance to be used in other services
export { io };

// Function to send messages to a specific department room
export const sendToDepartment = (departmentId: string, event: string, data: any) => {
  io.to(`department_${departmentId}`).emit(event, data);
};

// Error handling middleware (must be last)
app.use(errorLogger);
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
server.listen(config.port, () => {
  console.log(`🚀 Server is running on port ${config.port}`);
  console.log(`📊 Environment: ${config.nodeEnv}`);
  console.log(`🔗 Health check: http://localhost:${config.port}/health`);
  console.log(`📡 Socket.IO enabled`);
  console.log(`🔐 Security: ${securityConfig.audit.enableAuditLog ? 'Enabled' : 'Disabled'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});
