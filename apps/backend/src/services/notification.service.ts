import { emitNotificationToUser } from '../socket';
import { PrismaClient } from '@prisma/client';
import { EmailService } from './email.service';

const prisma = new PrismaClient();

// Mapping of workflow events to notification preference names
const NOTIFICATION_PREFERENCE_MAP: Record<string, { category: string; name: string }> = {
  'document_shared': { category: 'Documents', name: 'Document Shared' },
  'document_released': { category: 'Documents', name: 'Document Status Change' },
  'document_received': { category: 'Documents', name: 'Document Upload' },
  'document_completed': { category: 'Documents', name: 'Document Status Change' },
  'document_updated': { category: 'Documents', name: 'Document Status Change' },
  'document_signed': { category: 'Blockchain', name: 'Document Signed' },
  'document_created': { category: 'Documents', name: 'Document Upload' },
  'signature_pending': { category: 'Blockchain', name: 'Signature Pending' },
  'approval_request': { category: 'Approvals', name: 'Approval Request' },
  'approval_completed': { category: 'Approvals', name: 'Approval Completed' },
  'login_alert': { category: 'Security', name: 'Login Alert' },
  'permission_change': { category: 'Security', name: 'Permission Change' },
  'system_maintenance': { category: 'System', name: 'System Maintenance' },
  'system_updates': { category: 'System', name: 'System Updates' },
  'comments_mentions': { category: 'Collaboration', name: 'Comments & Mentions' },
};

export class NotificationService {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  /**
   * Check if user wants to receive this type of notification
   */
  private async checkUserPreferences(userId: string, workflowEvent?: string): Promise<{ sendInApp: boolean; sendEmail: boolean }> {
    try {
      console.log(`[NotificationService] Checking preferences for user ${userId}, event: ${workflowEvent}`);
      
      // Get user's notification settings
      const settings = await prisma.notificationSettings.findUnique({
        where: { user_id: userId },
      });

      console.log(`[NotificationService] User settings:`, settings ? `global: ${settings.global_notifications}, email: ${settings.email_notifications}` : 'No settings found');

      // If global notifications are disabled, don't send anything
      if (settings && !settings.global_notifications) {
        console.log(`[NotificationService] Global notifications disabled for user ${userId}`);
        return { sendInApp: false, sendEmail: false };
      }

      // Get specific preference if workflow event exists
      if (workflowEvent && NOTIFICATION_PREFERENCE_MAP[workflowEvent]) {
        const { category, name } = NOTIFICATION_PREFERENCE_MAP[workflowEvent];
        
        console.log(`[NotificationService] Looking for specific preference: ${category} > ${name}`);

        const preference = await prisma.notificationPreference.findUnique({
          where: {
            user_id_category_notification_name: {
              user_id: userId,
              category,
              notification_name: name,
            },
          },
        });

        if (preference) {
          console.log(`[NotificationService] Found specific preference: inApp=${preference.in_app_enabled}, email=${preference.email_enabled}`);
          return {
            sendInApp: preference.in_app_enabled,
            sendEmail: preference.email_enabled && (settings?.email_notifications ?? true),
          };
        } else {
          console.log(`[NotificationService] No specific preference found, using defaults`);
        }
      }

      // Default: send in-app, send email if email notifications are enabled
      const result = {
        sendInApp: true,
        sendEmail: settings?.email_notifications ?? true,
      };
      console.log(`[NotificationService] Using default preferences:`, result);
      return result;
    } catch (error) {
      console.error('[NotificationService] Error checking user preferences:', error);
      // Default to sending both on error
      return { sendInApp: true, sendEmail: true };
    }
  }

  /**
   * Send email notification based on type
   */
  private async sendEmailNotification(userId: string, title: string, message: string, metadata?: any) {
    try {
      // Get user email
      const user = await prisma.user.findUnique({
        where: { user_id: userId },
        include: {
          account: {
            select: { email: true }
          }
        }
      });

      if (!user?.account?.email) {
        console.log('No email found for user:', userId);
        return;
      }

      const recipientName = `${user.first_name} ${user.last_name}`;
      const recipientEmail = user.account.email;
      const documentUrl = metadata?.documentId 
        ? `${process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000'}/documents/${metadata.documentId}`
        : undefined;

      // Send appropriate email based on notification type
      const emailData = {
        recipientEmail,
        recipientName,
        documentTitle: metadata?.documentTitle || 'Document',
        documentUrl: documentUrl || `${process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000'}/notifications`,
        message: message,
        subject: title,
      };

      // For now, use a generic notification email
      // You can enhance this to use specific email templates per notification type
      await this.emailService.sendGenericNotificationEmail(emailData);
      console.log(`Email notification sent to ${recipientEmail}`);
    } catch (error) {
      console.error('Error sending email notification:', error);
      // Don't throw - we still want to create the in-app notification
    }
  }

  async createNotification(userId: string, title: string, message: string, type: string, workflowEvent?: string, metadata?: any) {
    try {
      console.log(`[NotificationService] Creating notification for user ${userId}, event: ${workflowEvent}`);
      
      // Check user preferences
      const { sendInApp, sendEmail } = await this.checkUserPreferences(userId, workflowEvent);

      console.log(`[NotificationService] User ${userId} preferences - InApp: ${sendInApp}, Email: ${sendEmail}`);

      // If user doesn't want any notifications, skip
      if (!sendInApp && !sendEmail) {
        console.log(`[NotificationService] User ${userId} has disabled all notifications for ${workflowEvent}`);
        return null;
      }

      let notification = null;

      // Create in-app notification if enabled
      if (sendInApp) {
        console.log(`[NotificationService] Creating in-app notification for user ${userId}`);
        notification = await prisma.notification.create({
          data: {
            user_id: userId,
            title,
            message,
            type,
            workflow_event: workflowEvent,
            metadata: metadata || {},
          },
        });

        console.log(`[NotificationService] In-app notification created: ${notification.notification_id}`);

        // Emit real-time notification to the user's socket
        console.log(`[NotificationService] Emitting socket notification to user-${userId}`);
        emitNotificationToUser(userId, 'new_notification', {
          notificationId: notification.notification_id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          workflowEvent: notification.workflow_event,
        });
        console.log(`[NotificationService] Socket notification emitted successfully`);
      }

      // Send email notification if enabled
      if (sendEmail) {
        console.log(`[NotificationService] Sending email notification to user ${userId}`);
        await this.sendEmailNotification(userId, title, message, metadata);
        console.log(`[NotificationService] Email notification sent successfully`);
      }

      return notification;
    } catch (error) {
      console.error('[NotificationService] Error creating notification:', error);
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