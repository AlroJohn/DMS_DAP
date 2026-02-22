import { Request, Response } from 'express';
import { getSocketInstance } from '../socket';
import { AuthRequest } from '../middleware/auth-middleware';
import { prisma } from '../lib/prisma';

const getStringValue = (param: string | string[] | undefined): string | undefined => {
  if (Array.isArray(param)) {
    return param[0];
  }
  return param;
};

export const getNotifications = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    // The auth middleware should ensure user exists, but we'll check to be safe
    if (!authReq.user || !authReq.user.id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    const userId = authReq.user.id;

    console.log('\n========== GET NOTIFICATIONS ==========');
    console.log('User ID requesting notifications:', userId);
    console.log('Query params:', req.query);

    const { limit = 50, offset = 0, isRead } = req.query;

    const whereClause: any = {
      user_id: userId,
      is_deleted: false,
    };

    if (isRead !== undefined) {
      whereClause.is_read = isRead === 'true';
    }

    console.log('Where clause:', whereClause);

    const notifications = await prisma.notification.findMany({
      where: whereClause,
      orderBy: {
        created_at: 'desc',
      },
      skip: parseInt(offset as string),
      take: parseInt(limit as string),
    });

    console.log('Found notifications:', notifications.length);
    console.log('Notifications:', notifications.map(n => ({
      id: n.notification_id,
      title: n.title,
      message: n.message,
      created_at: n.created_at,
      is_read: n.is_read,
      user_id: n.user_id
    })));

    const total = await prisma.notification.count({
      where: whereClause,
    });

    console.log('Total count:', total);
    console.log('====================================\n');

    res.json({
      data: notifications,
      pagination: {
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        hasMore: total > parseInt(offset as string) + parseInt(limit as string),
      },
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

export const markNotificationAsRead = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    // The auth middleware should ensure user exists, but we'll check to be safe
    if (!authReq.user || !authReq.user.id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    const userId = authReq.user.id;
    const notificationId = getStringValue(req.params.notificationId);
    if (!notificationId) {
      return res.status(400).json({ error: 'Notification ID is required' });
    }

    const notification = await prisma.notification.update({
      where: {
        notification_id: notificationId,
        user_id: userId,
      },
      data: {
        is_read: true,
        read_at: new Date(),
      },
    });

    // Emit socket event to update UI in real-time
    const io = getSocketInstance();
    if (io) {
      io.to(`user-${userId}`).emit('notification_updated', {
        notificationId: notification.notification_id,
        isRead: true,
      });
    }

    res.json({ data: notification });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
};

export const markAllNotificationsAsRead = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    // The auth middleware should ensure user exists, but we'll check to be safe
    if (!authReq.user || !authReq.user.id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    const userId = authReq.user.id;

    await prisma.notification.updateMany({
      where: {
        user_id: userId,
        is_read: false,
        is_deleted: false,
      },
      data: {
        is_read: true,
        read_at: new Date(),
      },
    });

    // Emit socket event to update UI in real-time
    const io = getSocketInstance();
    if (io) {
      io.to(`user-${userId}`).emit('all_notifications_read');
    }

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
};

export const createNotification = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    // The auth middleware should ensure user exists, but we'll check to be safe
    if (!authReq.user || !authReq.user.id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    // Only allow admin or internal system to create notifications directly
    // In most cases, notifications should be created via services
    const { userId, title, message, type, workflowEvent, metadata } = req.body;

    if (!userId || !title || !message) {
      return res.status(400).json({ error: 'userId, title, and message are required' });
    }

    const notification = await prisma.notification.create({
      data: {
        user_id: userId,
        title,
        message,
        type: type || 'system',
        workflow_event: workflowEvent,
        metadata: metadata || {},
      },
    });

    // Emit socket event to update UI in real-time
    const io = getSocketInstance();
    if (io) {
      io.to(`user-${userId}`).emit('new_notification', {
        notificationId: notification.notification_id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        workflowEvent: notification.workflow_event,
      });
    }

    res.status(201).json({ data: notification });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ error: 'Failed to create notification' });
  }
};

export const deleteNotification = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    // The auth middleware should ensure user exists, but we'll check to be safe
    if (!authReq.user || !authReq.user.id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    const userId = authReq.user.id;
    const notificationId = getStringValue(req.params.notificationId);
    if (!notificationId) {
      return res.status(400).json({ error: 'Notification ID is required' });
    }

    // Instead of hard delete, mark as deleted to maintain data integrity
    const notification = await prisma.notification.update({
      where: {
        notification_id: notificationId,
        user_id: userId,
      },
      data: {
        is_deleted: true,
      },
    });

    // Emit socket event to update UI in real-time
    const io = getSocketInstance();
    if (io) {
      io.to(`user-${userId}`).emit('notification_deleted', {
        notificationId: notification.notification_id,
      });
    }

    res.json({ data: notification });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
};

export const deleteAllNotifications = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    // The auth middleware should ensure user exists, but we'll check to be safe
    if (!authReq.user || !authReq.user.id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    const userId = authReq.user.id;

    // Instead of hard delete, mark all as deleted to maintain data integrity
    await prisma.notification.updateMany({
      where: {
        user_id: userId,
        is_deleted: false,
      },
      data: {
        is_deleted: true,
      },
    });

    // Emit socket event to update UI in real-time
    const io = getSocketInstance();
    if (io) {
      io.to(`user-${userId}`).emit('all_notifications_deleted');
    }

    res.json({ message: 'All notifications deleted' });
  } catch (error) {
    console.error('Error deleting all notifications:', error);
    res.status(500).json({ error: 'Failed to delete all notifications' });
  }
};
