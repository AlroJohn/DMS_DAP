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
import { ScheduledReportsProcessor } from './services/scheduled-reports.processor';

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
import documentTrailsRoutes from './routes/document-trails.routes'; // Import document trails routes
import documentTrailingRoutes from './routes/document-trailing.routes'; // Import document trailing routes
import notificationsRoutes from './routes/notifications'; // Import notifications route
import notificationPreferencesRoutes from './routes/notification-preferences'; // Import notification preferences route
import archiveRoutes from './routes/archive.routes'; // Import archive routes
import dashboardRoutes from './routes/dashboard.routes'; // Import dashboard routes
import documentSignatureRoutes from './routes/document-signatures'; // Import document signature routes
import documentSignaturePlaceholderRoutes from './routes/document-signature-placeholders'; // Import document signature placeholder routes
import documentTextPlaceholderRoutes from './routes/document-text-placeholders'; // Import document text placeholder routes
import documentReportsRoutes from './routes/document-reports.routes'; // Import document reports routes
import counterRoutes from './routes/counter.routes'; // Import counter routes
import activityLogsRoutes from './routes/activity-logs.routes'; // Import activity logs routes
import accessHistoryRoutes from './routes/access-history.routes'; // Import access history routes
import homeCMSRoutes from './routes/home-cms.routes'; // Import home CMS routes
import sidebarSettingsRoutes from './routes/sidebar-settings.routes'; // Import sidebar settings routes

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
const signatureRoomMembers = new Map<
  string,
  Map<string, { userId: string; name: string; departmentId?: string | null }>
>();
const signatureRoomCounts = new Map<string, Map<string, number>>();
const socketSignatureRooms = new Map<string, Set<string>>();

const getSignatureRoomKey = (documentId: string, fileId: string) =>
  `document-${documentId}:file-${fileId}`;

const getSocketUserInfo = (socket: any) => {
  const user = socket.user;
  if (!user) return null;
  return {
    userId: user.user_id,
    name: `${user.first_name} ${user.last_name}`.trim(),
    departmentId: user.department_id ?? null,
  };
};

const emitSignaturePresence = (roomKey: string) => {
  const members = signatureRoomMembers.get(roomKey);
  const payload = {
    room: roomKey,
    members: members ? Array.from(members.values()) : [],
  };
  io.to(roomKey).emit('signature:presence', payload);
};

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
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'Cookie'],
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
// Mount auth routes (including profile update)
app.use('/api/auth', authRoutes);
// Mount OAuth routes - these should be under /api/auth as well to match the expected paths
app.use('/api/auth', oauthRoutes);
// Keep the /api/oauth path for backward compatibility
app.use('/api/oauth', oauthRoutes);
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
app.use('/api/documents', documentTrailsRoutes); // Add document trails routes
app.use('/api/documents', documentTrailingRoutes); // Add document trailing routes
app.use('/api/notifications', notificationsRoutes); // Add notifications route
app.use('/api/notification-preferences', notificationPreferencesRoutes); // Add notification preferences route
app.use('/api/archive', archiveRoutes); // Add archive routes
app.use('/api/dashboard', dashboardRoutes); // Add dashboard routes
app.use('/api/signatures', documentSignatureRoutes); // Add document signature routes
app.use('/api/document-signatures', documentSignaturePlaceholderRoutes); // Add document signature placeholder routes
app.use('/api/document-texts', documentTextPlaceholderRoutes); // Add document text placeholder routes
app.use('/api/reports', documentReportsRoutes); // Add document reports routes
app.use('/api', counterRoutes); // Add counter routes
app.use('/api', activityLogsRoutes); // Add activity logs routes
app.use('/api', accessHistoryRoutes); // Add access history routes
app.use('/api/home-cms', homeCMSRoutes); // Add home CMS routes
app.use('/api/sidebar-settings', sidebarSettingsRoutes); // Add sidebar settings routes

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

  socket.on('signature:join-room', (data: { documentId: string; fileId: string }) => {
    const userInfo = getSocketUserInfo(socket as any);
    if (!userInfo || !data?.documentId || !data?.fileId) {
      return;
    }
    const roomKey = getSignatureRoomKey(data.documentId, data.fileId);
    socket.join(roomKey);

    if (!signatureRoomMembers.has(roomKey)) {
      signatureRoomMembers.set(roomKey, new Map());
    }
    if (!signatureRoomCounts.has(roomKey)) {
      signatureRoomCounts.set(roomKey, new Map());
    }

    const counts = signatureRoomCounts.get(roomKey)!;
    const currentCount = counts.get(userInfo.userId) ?? 0;
    counts.set(userInfo.userId, currentCount + 1);

    const members = signatureRoomMembers.get(roomKey)!;
    members.set(userInfo.userId, userInfo);

    if (!socketSignatureRooms.has(socket.id)) {
      socketSignatureRooms.set(socket.id, new Set());
    }
    socketSignatureRooms.get(socket.id)!.add(roomKey);

    emitSignaturePresence(roomKey);
  });

  socket.on('signature:leave-room', (data: { documentId: string; fileId: string }) => {
    const userInfo = getSocketUserInfo(socket as any);
    if (!userInfo || !data?.documentId || !data?.fileId) {
      return;
    }
    const roomKey = getSignatureRoomKey(data.documentId, data.fileId);
    socket.leave(roomKey);

    const counts = signatureRoomCounts.get(roomKey);
    if (counts) {
      const currentCount = counts.get(userInfo.userId) ?? 0;
      const nextCount = Math.max(0, currentCount - 1);
      if (nextCount === 0) {
        counts.delete(userInfo.userId);
        signatureRoomMembers.get(roomKey)?.delete(userInfo.userId);
      } else {
        counts.set(userInfo.userId, nextCount);
      }
      if (counts.size === 0) {
        signatureRoomCounts.delete(roomKey);
        signatureRoomMembers.delete(roomKey);
      }
    }

    socketSignatureRooms.get(socket.id)?.delete(roomKey);
    emitSignaturePresence(roomKey);
  });

  socket.on('signature:draft:update', (data) => {
    if (!data?.documentId || !data?.fileId || !data?.placeholderId) return;
    const roomKey = getSignatureRoomKey(data.documentId, data.fileId);
    socket.to(roomKey).emit('signature:draft:update', {
      room: roomKey,
      ...data,
    });
  });

  socket.on('text:draft:update', (data) => {
    if (!data?.documentId || !data?.fileId || !data?.placeholderId) return;
    const roomKey = getSignatureRoomKey(data.documentId, data.fileId);
    socket.to(roomKey).emit('text:draft:update', {
      room: roomKey,
      ...data,
    });
  });

  socket.on('signature:save', (data) => {
    if (!data?.documentId || !data?.fileId) return;
    const roomKey = getSignatureRoomKey(data.documentId, data.fileId);
    socket.to(roomKey).emit('signature:save', {
      room: roomKey,
      ...data,
    });
  });

  socket.on('disconnect', () => {
    console.log(`[${new Date().toISOString()}] User disconnected: ${socket.id}`);
    const userInfo = getSocketUserInfo(socket as any);
    const rooms = socketSignatureRooms.get(socket.id);
    if (userInfo && rooms) {
      rooms.forEach((roomKey) => {
        const counts = signatureRoomCounts.get(roomKey);
        if (!counts) return;
        const currentCount = counts.get(userInfo.userId) ?? 0;
        const nextCount = Math.max(0, currentCount - 1);
        if (nextCount === 0) {
          counts.delete(userInfo.userId);
          signatureRoomMembers.get(roomKey)?.delete(userInfo.userId);
        } else {
          counts.set(userInfo.userId, nextCount);
        }
        if (counts.size === 0) {
          signatureRoomCounts.delete(roomKey);
          signatureRoomMembers.delete(roomKey);
        }
        emitSignaturePresence(roomKey);
      });
    }
    socketSignatureRooms.delete(socket.id);
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

// Start scheduled reports processor
const scheduledReportsProcessor = new ScheduledReportsProcessor();
scheduledReportsProcessor.start();

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
  scheduledReportsProcessor.stop();
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  scheduledReportsProcessor.stop();
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});
