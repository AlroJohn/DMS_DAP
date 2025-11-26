import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getSocketInstance } from '../socket';
import { AuthRequest } from '../middleware/auth-middleware';

const prisma = new PrismaClient();

export const getNotifications = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    // The auth middleware should ensure user exists, but we'll check to be safe
    if (!authReq.user || !authReq.user.id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    const userId = authReq.user.id;

    const { limit = 50, offset = 0, isRead } = req.query;

    const whereClause: any = {
      user_id: userId,
      is_deleted: false,
    };

    if (isRead !== undefined) {
      whereClause.is_read = isRead === 'true';
    }

    const notifications = await prisma.notification.findMany({
      where: whereClause,
      orderBy: {
        created_at: 'desc',
      },
      skip: parseInt(offset as string),
      take: parseInt(limit as string),
    });

    const total = await prisma.notification.count({
      where: whereClause,
    });

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
    const { notificationId } = req.params;

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
    const { notificationId } = req.params;

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