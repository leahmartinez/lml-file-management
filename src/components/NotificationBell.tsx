/**
 * Notification Bell Component
 * Header component showing notification badge and dropdown menu
 * Uses the new alerts API system
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bell, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAlerts, useMarkAlertAsRead, useMarkAllAlertsAsRead } from '@/hooks/useAlerts';
import { formatDistanceToNow } from 'date-fns';
import { Alert } from '@/types/data';

interface NotificationBellProps {
  unreadCount: number;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ unreadCount }) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  // Fetch recent alerts (all alerts, showing most recent 5)
  const { data: alerts = [], isLoading } = useAlerts();
  const markAsReadMutation = useMarkAlertAsRead();
  const markAllAsReadMutation = useMarkAllAlertsAsRead();

  // Get the 5 most recent alerts
  const recentAlerts = alerts.slice(0, 5);

  const handleAlertClick = (alert: Alert) => {
    // Mark as read when clicking
    if (!alert.isRead) {
      markAsReadMutation.mutate(alert.id);
    }

    // Navigate based on alert context
    if (alert.projectId) {
      setIsOpen(false);
      navigate(`/sites?project=${alert.projectId}`);
    } else if (alert.siteId) {
      setIsOpen(false);
      navigate(`/sites?site=${alert.siteId}`);
    }
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const handleViewAll = () => {
    setIsOpen(false);
    navigate('/my-work');
  };

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
            {isLoading ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Loading notifications...
              </div>
            ) : recentAlerts.length > 0 ? (
              <div className="space-y-1 p-2">
                {recentAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-3 rounded-md border transition-colors cursor-pointer ${
                      alert.isRead
                        ? 'bg-background border-border/50 hover:bg-muted/30'
                        : 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                    }`}
                    onClick={() => handleAlertClick(alert)}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {alert.title}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {alert.message}
                        </p>
                      </div>
                      {!alert.isRead && (
                        <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0 mt-1" />
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                      </p>
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
          {recentAlerts.length > 0 && (
            <div className="border-t border-border p-3 flex gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs flex-1"
                  onClick={handleMarkAllAsRead}
                  disabled={markAllAsReadMutation.isPending}
                >
                  Mark all as read
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="text-xs flex-1"
                onClick={handleViewAll}
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
