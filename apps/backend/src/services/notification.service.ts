import { emitNotificationToUser } from '../socket';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class NotificationService {
  async createNotification(userId: string, title: string, message: string, type: string, workflowEvent?: string, metadata?: any) {
    try {
      const notification = await prisma.notification.create({
        data: {
          user_id: userId,
          title,
          message,
          type,
          workflow_event: workflowEvent,
          metadata: metadata || {},
        },
      });

      // Emit real-time notification to the user's socket
      emitNotificationToUser(userId, 'new_notification', {
        notificationId: notification.notification_id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        workflowEvent: notification.workflow_event,
      });

      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  async createDocumentSharedNotification(userId: string, documentId: string, documentTitle: string) {
    return this.createNotification(
      userId,
      'Document Shared',
      `A document has been shared with you: ${documentTitle || documentId}`,
      'workflow',
      'document_shared',
      { documentId, documentTitle }
    );
  }

  async createDocumentReleasedNotification(userId: string, documentId: string, documentTitle: string, toDepartment: string) {
    return this.createNotification(
      userId,
      'Document Released',
      `A document has been released to ${toDepartment}: ${documentTitle || documentId}`,
      'workflow',
      'document_released',
      { documentId, documentTitle, toDepartment }
    );
  }

  async createDocumentCompletedNotification(userId: string, documentId: string, documentTitle: string) {
    return this.createNotification(
      userId,
      'Document Completed',
      `A document has been marked as completed: ${documentTitle || documentId}`,
      'workflow',
      'document_completed',
      { documentId, documentTitle }
    );
  }

  async createDocumentUpdatedNotification(userId: string, documentId: string, documentTitle: string) {
    return this.createNotification(
      userId,
      'Document Updated',
      `A document has been updated: ${documentTitle || documentId}`,
      'workflow',
      'document_updated',
      { documentId, documentTitle }
    );
  }

  async createDocumentReceivedNotification(userId: string, documentId: string, documentTitle: string) {
    return this.createNotification(
      userId,
      'New Document Received',
      `You have received a new document for review: ${documentTitle || documentId}`,
      'document',
      'document_received',
      { documentId, documentTitle }
    );
  }

  async createDocumentSignedNotification(userId: string, documentId: string, documentTitle: string, signerName: string) {
    return this.createNotification(
      userId,
      'Document Signed',
      `Contract ${documentTitle || documentId} has been signed by ${signerName}`,
      'document',
      'document_signed',
      { documentId, documentTitle, signerName }
    );
  }

  async createDocumentCreatedNotification(userId: string, documentId: string, documentTitle: string) {
    return this.createNotification(
      userId,
      'Document Created',
      `A new document has been created: ${documentTitle || documentId}`,
      'document',
      'document_created',
      { documentId, documentTitle }
    );
  }

  async markAsRead(notificationId: string, userId: string) {
    try {
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

      // Emit update to user
      emitNotificationToUser(userId, 'notification_updated', {
        notificationId: notification.notification_id,
        isRead: true,
      });

      return notification;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  async markAllAsRead(userId: string) {
    try {
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

      // Emit update to user
      emitNotificationToUser(userId, 'all_notifications_read', {});
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  async deleteNotification(notificationId: string, userId: string) {
    try {
      await prisma.notification.update({
        where: {
          notification_id: notificationId,
          user_id: userId,
        },
        data: {
          is_deleted: true,
        },
      });

      // Emit delete to user
      emitNotificationToUser(userId, 'notification_deleted', {
        notificationId,
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  async getUnreadCount(userId: string) {
    try {
      const count = await prisma.notification.count({
        where: {
          user_id: userId,
          is_read: false,
          is_deleted: false,
        },
      });
      return count;
    } catch (error) {
      console.error('Error getting unread count:', error);
      throw error;
    }
  }

  async getUserNotifications(userId: string, limit: number = 50, offset: number = 0, isRead?: boolean) {
    try {
      const whereClause: any = {
        user_id: userId,
        is_deleted: false,
      };

      if (isRead !== undefined) {
        whereClause.is_read = isRead;
      }

      const notifications = await prisma.notification.findMany({
        where: whereClause,
        orderBy: {
          created_at: 'desc',
        },
        skip: offset,
        take: limit,
      });

      return notifications;
    } catch (error) {
      console.error('Error getting user notifications:', error);
      throw error;
    }
  }
}