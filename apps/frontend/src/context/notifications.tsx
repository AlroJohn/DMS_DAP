"use client";

import * as React from "react";
import { useSocket } from "@/components/providers/providers";
import { toast } from "sonner";
import { extractDocumentInfo } from "@/lib/utils";

export type AppNotification = {
  id: string;
  type: "document" | "invitation" | "system" | "workflow";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  workflowEvent?: string; // Specific workflow event type (e.g., "document_shared", "document_released", "document_completed")
  documentName?: string;
  documentCode?: string;
};

interface NotificationsContextType {
  notifications: AppNotification[];
  unreadCount: number;
  addNotification: (n: AppNotification) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  fetchNotifications: () => Promise<void>;
}

const NotificationsContext = React.createContext<
  NotificationsContextType | undefined
>(undefined);

export const useNotifications = () => {
  const ctx = React.useContext(NotificationsContext);
  if (!ctx)
    throw new Error(
      "useNotifications must be used within NotificationsProvider"
    );
  return ctx;
};

export const NotificationsProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { socket } = useSocket();
  const [notifications, setNotifications] = React.useState<AppNotification[]>(
    []
  );

  React.useEffect(() => {
    if (!socket) return;

    const onNewNotification = (data: any) => {
      // A new notification has been created in the backend, fetch all notifications to update the UI
      fetchNotifications();
    };

    const onNotificationUpdated = (data: any) => {
      // A notification has been updated (e.g., marked as read), fetch all notifications to update the UI
      fetchNotifications();
    };

    const onAllNotificationsRead = () => {
      fetchNotifications(); // Refresh notifications to reflect that all are now read
    };

    const onNotificationDeleted = (data: any) => {
      // A notification has been deleted, fetch all notifications to update the UI
      fetchNotifications();
    };

    // Listen to socket events for real-time updates
    socket.on('new_notification', onNewNotification);
    socket.on('notification_updated', onNotificationUpdated);
    socket.on('all_notifications_read', onAllNotificationsRead);
    socket.on('notification_deleted', onNotificationDeleted);

    // Also listen to workflow events that should trigger notifications
    socket.on('document_shared', onNewNotification);
    socket.on('document_released', onNewNotification);
    socket.on('document_completed', onNewNotification);
    socket.on('document_updated', onNewNotification);
    socket.on('document_received', onNewNotification);
    socket.on('document_signed', onNewNotification);

    // Fetch notifications on initial connection
    fetchNotifications();

    return () => {
      socket.off('new_notification', onNewNotification);
      socket.off('notification_updated', onNotificationUpdated);
      socket.off('all_notifications_read', onAllNotificationsRead);
      socket.off('notification_deleted', onNotificationDeleted);
      socket.off('document_shared', onNewNotification);
      socket.off('document_released', onNewNotification);
      socket.off('document_completed', onNewNotification);
      socket.off('document_updated', onNewNotification);
      socket.off('document_received', onNewNotification);
      socket.off('document_signed', onNewNotification);
    };
  }, [socket]);

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications?limit=50', {
        credentials: 'include', // Include cookies for authentication
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch notifications');
      }
      
      const data = await response.json();
      
      // Convert API response to our AppNotification format
      const formattedNotifications: AppNotification[] = data.data.map((n: any) => {
        const { name: documentName, code: documentCode } = extractDocumentInfo(n.message);
        return {
          id: n.notification_id,
          type: n.type as AppNotification["type"],
          title: n.title,
          message: n.message,
          timestamp: n.created_at || n.timestamp,
          read: n.is_read || n.read || false,
          workflowEvent: n.workflow_event || n.workflowEvent || undefined,
          documentName,
          documentCode,
        };
      });

      setNotifications(formattedNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to load notifications');
    }
  };

  const addNotification = (notification: AppNotification) => {
    setNotifications(prev => [notification, ...prev]);
  };

  const markAsRead = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}/read`, {
        method: 'PATCH',
        credentials: 'include', // Include cookies for authentication
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to mark notification as read');
      }
      
      // The socket event will handle updating the UI
      toast.success('Notification marked as read');
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to mark notification as read');
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/read-all', {
        method: 'PATCH',
        credentials: 'include', // Include cookies for authentication
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to mark all notifications as read');
      }
      
      // The socket event will handle updating the UI
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast.error('Failed to mark all notifications as read');
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
        credentials: 'include', // Include cookies for authentication
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete notification');
      }
      
      // The socket event will handle updating the UI
      toast.success('Notification deleted');
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        fetchNotifications,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
};