/**
 * Notification Bell Component
 * Header component showing notification badge and dropdown menu
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bell, X } from 'lucide-react';
import { UserNotification } from '@/hooks/useNotifications';
import { useNavigate } from 'react-router-dom';

interface NotificationBellProps {
  unreadCount: number;
  notifications: UserNotification[];
  onMarkAsRead: (notificationId: string) => void;
  onDelete: (notificationId: string) => void;
  onMarkAllAsRead: () => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  unreadCount,
  notifications,
  onMarkAsRead,
  onDelete,
  onMarkAllAsRead,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const recentNotifications = notifications.slice(0, 5);

  return (
    <div className="relative">
      {/* Bell Button */}
      <Button
        variant="outline"
        size="sm"
        className="gap-2 relative"
        onClick={() => setIsOpen(!isOpen)}
        title="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-popover border border-border rounded-lg shadow-lg z-50">
          {/* Header */}
          <div className="border-b border-border p-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Notifications</h3>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
              onClick={() => setIsOpen(false)}
              title="Close"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto">
            {recentNotifications.length > 0 ? (
              <div className="space-y-1 p-2">
                {recentNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 rounded-md border transition-colors cursor-pointer ${
                      notification.isRead
                        ? 'bg-background border-border/50 hover:bg-muted/30'
                        : 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                    }`}
                    onClick={() => {
                      if (!notification.isRead) {
                        onMarkAsRead(notification.id);
                      }
                      // Could navigate to comment here
                      // navigate(`/sites?project=${notification.projectCode}`);
                    }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {notification.mentionedBy.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {notification.message}
                        </p>
                      </div>
                      {!notification.isRead && (
                        <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0 mt-1" />
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        {new Date(notification.timestamp).toLocaleDateString()}
                      </p>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-5 w-5 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(notification.id);
                        }}
                        title="Delete"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No notifications yet
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-border p-3 flex gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs flex-1"
                  onClick={() => onMarkAllAsRead()}
                >
                  Mark all as read
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="text-xs flex-1"
                onClick={() => {
                  setIsOpen(false);
                  navigate('/my-work');
                }}
              >
                View all
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Overlay to close dropdown */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

NotificationBell.displayName = 'NotificationBell';
