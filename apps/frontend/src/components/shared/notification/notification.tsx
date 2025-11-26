"use client"

import * as React from "react"
import { Bell, Check, Clock, FileText, UserPlus, X, CheckCheck } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { useNotifications, AppNotification } from '@/context/notifications'

type Notification = AppNotification;

interface NotificationSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NotificationSheet({ open, onOpenChange }: NotificationSheetProps) {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications()

  // the functions and state come from Notifications context

  const getNotificationIcon = (type: Notification["type"]) => {
    switch (type) {
      case "document":
        return <FileText className="h-4 w-4" />
      case "invitation":
        return <UserPlus className="h-4 w-4" />
      case "system":
        return <Bell className="h-4 w-4" />
      case "workflow":
        return <Check className="h-4 w-4" />
      default:
        return <Bell className="h-4 w-4" />
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-start justify-between p-6 border-b">
            <div className="flex-1">
              <SheetTitle className="text-xl font-semibold">Notifications</SheetTitle>
              <SheetDescription className="mt-1">
                You have {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
              </SheetDescription>
            </div>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="text-xs mt-5"
              >
                Mark all read
              </Button>
            )}
          </div>

          {/* Notifications List */}
          <ScrollArea className="flex-1 px-4">
            <div className="space-y-3 py-4">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="rounded-full bg-muted p-4 mb-4">
                    <Bell className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium">No notifications</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    You're all caught up!
                  </p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      "group relative rounded-xl p-4 transition-all duration-200",
                      "border border-border/50",
                      !notification.read
                        ? "bg-accent/50 hover:bg-accent/70"
                        : "bg-background hover:bg-accent/30"
                    )}
                  >
                    <div className="flex gap-3">
                      {/* Icon */}
                      <div
                        className={cn(
                          "flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center",
                          notification.type === "document" &&
                            "bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
                          notification.type === "invitation" &&
                            "bg-green-100 text-green-600 dark:bg-green-500/10 dark:text-green-400",
                          notification.type === "system" &&
                            "bg-orange-100 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400",
                          notification.type === "workflow" &&
                            "bg-green-100 text-green-600 dark:bg-green-500/10 dark:text-green-400"
                        )}
                      >
                        {getNotificationIcon(notification.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold leading-tight truncate">
                            {notification.title}
                          </p>
                          <div className="text-xs text-muted-foreground mt-1">
                            {notification.documentName && (
                              <span className="font-medium truncate block">{notification.documentName}</span>
                            )}
                            {notification.documentCode && (
                              <span className="inline-block mt-1 px-2 py-0.5 bg-muted rounded text-xs font-mono">
                                {notification.documentCode}
                              </span>
                            )}
                            {!notification.documentName && !notification.documentCode && (
                              <span className="line-clamp-2">{notification.message}</span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            {new Date(notification.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {/* Action buttons - Mark as read and Close */}
                      <div className="flex gap-1">
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => markAsRead(notification.id)}
                            aria-label="Mark as read"
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => deleteNotification(notification.id)}
                          aria-label="Dismiss"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}