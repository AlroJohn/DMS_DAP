import config from './config';
import securityConfig from './config/security.config';

import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { randomUUID } from 'crypto';
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
import { recycleBinCleanupProcessor } from './services/recycle-bin-cleanup.processor';

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
import processTypeRoutes from './routes/process-type.routes';
import userRoutes from './routes/user.routes';
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
import printerRoutes from './routes/printer.routes';
import pendingSignaturesRoutes from './routes/pending-signatures.routes'; // Import pending signatures routes
import scannerRoutes from './routes/scanner.routes'; // Import scanner routes
import sseRoutes from './routes/sse.routes';

// Import middleware
import { requestLogger, errorLogger } from './middleware/logging';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { securityHeaders, rateLimiter } from './middleware/security';

// Import configuration

// Import Prisma disconnect function and instance for health check
import { disconnectPrisma, prisma } from './lib/prisma';

// Import database connection monitor
import { DbConnectionMonitor } from './utils/db-monitor';

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO with proper CORS
// Allow all origins for Socket.IO to support printer clients and local dev
const io = new Server(server, {
  cors: {
    origin: true, // Allow all origins (printer clients, frontend, etc.)
    credentials: securityConfig.cors.credentials,
    methods: ['GET', 'POST'],
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
const printerToken = process.env.PRINTER_SOCKET_TOKEN;
const printerJobs = new Map<string, string>();
const printerServiceRoom = 'printer-service';

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
  const printerToken = process.env.PRINTER_SOCKET_TOKEN;
  const printerFlag = socket.handshake.auth?.printer === true;
  if (printerToken && token === printerToken) {
    (socket as any).user = {
      user_id: 'printer-service',
      first_name: 'Printer',
      last_name: 'Service',
      department_id: null,
    };
    (socket as any).isPrinter = true;
    return next();
  }

  if (!printerToken && printerFlag) {
    (socket as any).user = {
      user_id: 'printer-service',
      first_name: 'Printer',
      last_name: 'Service',
      department_id: null,
    };
    (socket as any).isPrinter = true;
    return next();
  }

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
    httpOnly: securityConfig.session.httpOnly,
    sameSite: securityConfig.session.sameSite,
    maxAge: securityConfig.session.maxAge // 8 hours
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
app.get('/health', async (req, res) => {
  try {
    // Test database connectivity
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.nodeEnv,
      version: process.env.npm_package_version || '1.0.0',
      database: 'connected'
    });
  } catch (error) {
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.nodeEnv,
      version: process.env.npm_package_version || '1.0.0',
      database: 'disconnected',
      error: (error as Error).message
    });
  }
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
app.use('/api/process-type', processTypeRoutes);
// Document sharing user search - separate route for document sharing
import userSearchRoutes from './routes/user-search.routes';

app.use('/api/admin/users', userRoutes);
app.use('/api/users', userSearchRoutes);
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
app.use('/api/pending-signatures', pendingSignaturesRoutes); // Add pending signatures routes
app.use('/api/signatures', documentSignatureRoutes); // Add document signature routes
app.use('/api/document-signatures', documentSignaturePlaceholderRoutes); // Add document signature placeholder routes
app.use('/api/document-texts', documentTextPlaceholderRoutes); // Add document text placeholder routes
app.use('/api/reports', documentReportsRoutes); // Add document reports routes
app.use('/api', counterRoutes); // Add counter routes
app.use('/api', activityLogsRoutes); // Add activity logs routes
app.use('/api', accessHistoryRoutes); // Add access history routes
app.use('/api/home-cms', homeCMSRoutes); // Add home CMS routes
app.use('/api/sidebar-settings', sidebarSettingsRoutes); // Add sidebar settings routes
app.use('/api/printer', printerRoutes);
app.use('/api/scanner', scannerRoutes); // Add scanner routes
app.use('/api', sseRoutes);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`[${new Date().toISOString()}] User connected: ${socket.id}`);
  const user = (socket as any).user;
  const isPrinter = Boolean((socket as any).isPrinter);

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

  if (isPrinter) {
    socket.join(printerServiceRoom);
  }

  socket.on('printer:register', () => {
    if (!printerToken) {
      (socket as any).isPrinter = true;
    }
    if (!(socket as any).isPrinter) return;
    socket.join(printerServiceRoom);
    console.log(`[${new Date().toISOString()}] Printer service registered: ${socket.id}`);
  });

  socket.on('printer:print', (data, callback) => {
    if (isPrinter) return;
    
    console.log(`[BACKEND] 🔍 Received printer:print with printType: "${data?.printType}"`);
    
    // Support both legacy payloadBase64 format and new barcode data format
    if (!data?.payloadBase64 && !data?.documentCode && !data?.printType) {
      callback?.({ success: false, error: 'Either payloadBase64 or documentCode is required' });
      return;
    }

    const room = io.sockets.adapter.rooms.get(printerServiceRoom);
    if (!room || room.size === 0) {
      callback?.({ success: false, error: 'Printer service not connected' });
      return;
    }

    const jobId = data.jobId && typeof data.jobId === 'string'
      ? data.jobId
      : randomUUID();

    printerJobs.set(jobId, socket.id);
    console.log(`[${new Date().toISOString()}] Queued print job ${jobId}`);
    const resolvedPrinterIp = process.env.PRINTER_IP || data.printer_ip;
    const resolvedPrinterPort = process.env.PRINTER_PORT || data.printer_port;
    const printerType = process.env.PRINTER_TYPE || data.printer_type || 'EPSON';
    const useUSB = process.env.USE_USB === 'true' || data.useUSB || false;
    const printerName = process.env.PRINTER_NAME || data.printer_name;

    const printJobData = {
      app: 'dms',
      jobId,
      data: {
        event: 'printing',
        payloadBase64: data.payloadBase64,
        printType: data.printType,
        documentCode: data.documentCode,
        barcodeData: data.barcodeData || data.documentCode,
        organizationName: data.organizationName,
        labelFormat: data.labelFormat,
        printer_ip: resolvedPrinterIp,
        printer_port: resolvedPrinterPort,
        printer_type: printerType,
        useUSB: useUSB,
        printer_name: printerName,
      },
    };

    console.log(`[BACKEND] 📤 Emitting to printer service with printType: "${printJobData.data.printType}"`);
    
    io.to(printerServiceRoom).emit('printJob', printJobData);

    callback?.({ success: true, jobId });
  });

  socket.on('printSuccess', (payload) => {
    if (!isPrinter) return;
    const jobId = payload?.jobId;
    if (jobId && printerJobs.has(jobId)) {
      const requesterSocketId = printerJobs.get(jobId)!;
      io.to(requesterSocketId).emit('printSuccess', payload);
      printerJobs.delete(jobId);
      return;
    }
    io.emit('printSuccess', payload);
  });

  socket.on('printError', (payload) => {
    if (!isPrinter) return;
    const jobId = payload?.jobId;
    if (jobId && printerJobs.has(jobId)) {
      const requesterSocketId = printerJobs.get(jobId)!;
      io.to(requesterSocketId).emit('printError', payload);
      printerJobs.delete(jobId);
      return;
    }
    io.emit('printError', payload);
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

    for (const [jobId, socketId] of printerJobs.entries()) {
      if (socketId === socket.id) {
        printerJobs.delete(jobId);
      }
    }
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

// Start database connection monitor
const dbMonitor = DbConnectionMonitor.getInstance(prisma);
dbMonitor.setMaxConnections(8); // Set max connections to stay under server limits
dbMonitor.startMonitoring(30000); // Monitor every 30 seconds

// Start scheduled reports processor
const scheduledReportsProcessor = new ScheduledReportsProcessor();
scheduledReportsProcessor.start();

// Start recycle bin cleanup processor (auto-delete after 5 days)
recycleBinCleanupProcessor.start();

// Start server
server.listen(config.port, () => {
  console.log(`🚀 Server is running on port ${config.port}`);
  console.log(`📊 Environment: ${config.nodeEnv}`);
  console.log(`🔗 Health check: http://localhost:${config.port}/health`);
  console.log(`📡 Socket.IO enabled`);
  console.log(`🔐 Security: ${securityConfig.audit.enableAuditLog ? 'Enabled' : 'Disabled'}`);
  console.log(`🗑️ Recycle bin auto-cleanup: Documents deleted after ${recycleBinCleanupProcessor.getRetentionDays()} days`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  dbMonitor.stopMonitoring();
  scheduledReportsProcessor.stop();
  recycleBinCleanupProcessor.stop();
  await disconnectPrisma();
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  dbMonitor.stopMonitoring();
  scheduledReportsProcessor.stop();
  recycleBinCleanupProcessor.stop();
  await disconnectPrisma();
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});
