/**
 * User Portal - Notifications Activity Box
 * Displays alerts and notifications in the User Portal
 * Uses the new alerts API system
 */

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, CheckCircle, ExternalLink } from 'lucide-react';
import { useAlerts, useMarkAlertAsRead, useMarkAllAlertsAsRead } from '@/hooks/useAlerts';
import { Alert } from '@/types/data';
import { formatDistanceToNow } from 'date-fns';

type FilterTab = 'all' | 'unread' | 'read';

export const UserPortalNotifications: React.FC = () => {
  const navigate = useNavigate();
  const [filterTab, setFilterTab] = useState<FilterTab>('all');

  // Fetch alerts based on current filter
  const unreadOnly = filterTab === 'unread';
  const { data: allAlerts = [], isLoading } = useAlerts(unreadOnly ? true : undefined);

  const markAsReadMutation = useMarkAlertAsRead();
  const markAllAsReadMutation = useMarkAllAlertsAsRead();

  // Filter alerts by read status
  const filteredAlerts = useMemo(() => {
    switch (filterTab) {
      case 'unread':
        return allAlerts.filter(a => !a.isRead);
      case 'read':
        return allAlerts.filter(a => a.isRead);
      default:
        return allAlerts;
    }
  }, [allAlerts, filterTab]);

  // Calculate unread count
  const unreadCount = useMemo(() => {
    return allAlerts.filter(a => !a.isRead).length;
  }, [allAlerts]);

  const handleAlertClick = (alert: Alert) => {
    // Mark as read when clicking
    if (!alert.isRead) {
      markAsReadMutation.mutate(alert.id);
    }

    // Navigate based on alert context
    if (alert.projectId) {
      navigate(`/sites?project=${alert.projectId}`);
    } else if (alert.siteId) {
      navigate(`/sites?site=${alert.siteId}`);
    }
  };

  const handleMarkAsRead = (alertId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    markAsReadMutation.mutate(alertId);
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          <CardTitle>Alerts & Notifications</CardTitle>
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
            onClick={handleMarkAllAsRead}
            className="text-xs"
            disabled={markAllAsReadMutation.isPending}
          >
            Mark all as read
          </Button>
        )}
      </CardHeader>

      <CardContent className="flex-1 min-h-0 flex flex-col">
        <div className="space-y-4 flex-1 min-h-0 flex flex-col">
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

          {/* Loading State */}
          {isLoading && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Loading notifications...
            </div>
          )}

          {/* Notifications List */}
          {!isLoading && (
            <div className="space-y-2 flex-1 overflow-y-auto">
              {filteredAlerts.length > 0 ? (
                filteredAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    onClick={() => handleAlertClick(alert)}
                    className={`p-3 rounded-lg border transition-all cursor-pointer hover:shadow-md ${
                      alert.isRead
                        ? 'bg-background border-border/50 hover:bg-muted/30'
                        : 'bg-blue-50/50 border-blue-200/50 hover:bg-blue-100/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-semibold truncate">
                            {alert.title}
                          </p>
                          {!alert.isRead && (
                            <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {alert.message}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {alert.type && (
                            <span className="px-2 py-1 bg-muted rounded text-xs font-medium capitalize">
                              {alert.type.replace('_', ' ')}
                            </span>
                          )}
                          <span>
                            {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                          </span>
                          {(alert.projectId || alert.siteId) && (
                            <ExternalLink className="h-3 w-3" />
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-1 flex-shrink-0">
                        {!alert.isRead && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={(e) => handleMarkAsRead(alert.id, e)}
                            title="Mark as read"
                            disabled={markAsReadMutation.isPending}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
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
          )}

          {/* Empty state message */}
          {!isLoading && allAlerts.length === 0 && (
            <div className="p-8 text-center">
              <Bell className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground">
                You'll see notifications here when you're assigned work or mentioned in comments
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

UserPortalNotifications.displayName = 'UserPortalNotifications';
