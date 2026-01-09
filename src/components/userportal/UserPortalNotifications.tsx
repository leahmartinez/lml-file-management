/**
 * User Portal - Notifications Activity Box
 * Displays mentions and notifications in the User Portal
 */

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserNotification } from '@/hooks/useNotifications';
import { Bell, Trash2, CheckCircle } from 'lucide-react';

interface UserPortalNotificationsProps {
  notifications: UserNotification[];
  unreadCount: number;
  onMarkAsRead: (notificationId: string) => void;
  onMarkAllAsRead: () => void;
  onDelete: (notificationId: string) => void;
}

type FilterTab = 'all' | 'unread' | 'read';

export const UserPortalNotifications: React.FC<UserPortalNotificationsProps> = ({
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
}) => {
  const navigate = useNavigate();
  const [filterTab, setFilterTab] = useState<FilterTab>('all');

  const filteredNotifications = useMemo(() => {
    switch (filterTab) {
      case 'unread':
        return notifications.filter(n => !n.isRead);
      case 'read':
        return notifications.filter(n => n.isRead);
      default:
        return notifications;
    }
  }, [notifications, filterTab]);

  const handleNotificationClick = (notification: UserNotification) => {
    // Navigate to Sites page with project code and comment ID
    // The Sites page will handle scrolling to the comment
    navigate(`/sites?project=${notification.projectCode}#comment_${notification.commentId}`);

    // Mark as read when clicking
    onMarkAsRead(notification.id);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          <CardTitle>Mentions & Notifications</CardTitle>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="ml-2">
              {unreadCount}
            </Badge>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={onMarkAllAsRead}
            className="text-xs"
          >
            Mark all as read
          </Button>
        )}
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {/* Filter Tabs */}
          <div className="flex gap-2 border-b border-border pb-3">
            <Button
              variant={filterTab === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterTab('all')}
              className="text-xs"
            >
              All
            </Button>
            <Button
              variant={filterTab === 'unread' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterTab('unread')}
              className="text-xs"
            >
              Unread {unreadCount > 0 && `(${unreadCount})`}
            </Button>
            <Button
              variant={filterTab === 'read' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterTab('read')}
              className="text-xs"
            >
              Read
            </Button>
          </div>

          {/* Notifications List */}
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {filteredNotifications.length > 0 ? (
              filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-3 rounded-lg border transition-all cursor-pointer hover:shadow-md ${
                    notification.isRead
                      ? 'bg-background border-border/50 hover:bg-muted/30'
                      : 'bg-blue-50/50 border-blue-200/50 hover:bg-blue-100/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold truncate">
                          {notification.mentionedBy.name}
                        </p>
                        {!notification.isRead && (
                          <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="px-2 py-1 bg-muted rounded text-xs font-medium">
                          {notification.projectCode}
                        </span>
                        <span>
                          {new Date(notification.timestamp).toLocaleDateString()}{' '}
                          {new Date(notification.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1 flex-shrink-0">
                      {!notification.isRead && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            onMarkAsRead(notification.id);
                          }}
                          title="Mark as read"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(notification.id);
                        }}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-sm text-muted-foreground">
                {filterTab === 'unread' && unreadCount === 0
                  ? 'No unread notifications'
                  : filterTab === 'read'
                    ? 'No read notifications'
                    : 'No notifications yet'}
              </div>
            )}
          </div>

          {/* Empty state message */}
          {notifications.length === 0 && (
            <div className="p-8 text-center">
              <Bell className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground">
                You'll see notifications here when someone mentions you in a comment
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

UserPortalNotifications.displayName = 'UserPortalNotifications';
