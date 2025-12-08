import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface UserNotification {
  id: string; // unique ID
  userId: string; // email of user being notified
  type: 'mention' | 'assignment'; // notification type
  projectCode: string; // which project
  commentId: string; // which comment
  mentionedBy: {
    email: string;
    name: string;
  };
  message: string; // "John Doe mentioned you in..."
  timestamp: string; // ISO date
  isRead: boolean; // read status
}

export interface UserNotificationState {
  notifications: UserNotification[];
  unreadCount: number;
}

/**
 * Hook for managing user notifications
 * Stores notifications in localStorage per user
 */
export const useNotifications = (userEmail?: string) => {
  const { toast } = useToast();

  const [notificationState, setNotificationState] = useState<UserNotificationState>(() => {
    if (!userEmail) return { notifications: [], unreadCount: 0 };

    const stored = localStorage.getItem(`userNotifications_${userEmail}`);
    const notifications = stored ? JSON.parse(stored) : [];

    // Clean up old notifications (older than 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const filtered = notifications.filter(
      (n: UserNotification) => new Date(n.timestamp) > thirtyDaysAgo
    );

    const unreadCount = filtered.filter((n: UserNotification) => !n.isRead).length;

    return { notifications: filtered, unreadCount };
  });

  // Refresh notifications when userEmail changes
  useEffect(() => {
    if (!userEmail) {
      setNotificationState({ notifications: [], unreadCount: 0 });
      return;
    }

    const stored = localStorage.getItem(`userNotifications_${userEmail}`);
    const notifications = stored ? JSON.parse(stored) : [];

    // Clean up old notifications (older than 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const filtered = notifications.filter(
      (n: UserNotification) => new Date(n.timestamp) > thirtyDaysAgo
    );

    const unreadCount = filtered.filter((n: UserNotification) => !n.isRead).length;

    if (filtered.length !== notifications.length) {
      localStorage.setItem(`userNotifications_${userEmail}`, JSON.stringify(filtered));
    }

    setNotificationState({ notifications: filtered, unreadCount });
  }, [userEmail]);

  const addNotification = useCallback(
    (
      projectCode: string,
      commentId: string,
      mentionedBy: { email: string; name: string },
      message: string
    ) => {
      if (!userEmail) return null;

      const newNotification: UserNotification = {
        id: `notif_${Date.now()}`,
        userId: userEmail,
        type: 'mention',
        projectCode,
        commentId,
        mentionedBy,
        message,
        timestamp: new Date().toISOString(),
        isRead: false,
      };

      const updated = [newNotification, ...notificationState.notifications];
      setNotificationState({
        notifications: updated,
        unreadCount: notificationState.unreadCount + 1,
      });

      localStorage.setItem(`userNotifications_${userEmail}`, JSON.stringify(updated));

      return newNotification;
    },
    [userEmail, notificationState]
  );

  const markAsRead = useCallback(
    (notificationId: string) => {
      if (!userEmail) return;

      const updated = notificationState.notifications.map(n =>
        n.id === notificationId ? { ...n, isRead: true } : n
      );

      const unreadCount = updated.filter(n => !n.isRead).length;

      setNotificationState({ notifications: updated, unreadCount });
      localStorage.setItem(`userNotifications_${userEmail}`, JSON.stringify(updated));
    },
    [userEmail, notificationState]
  );

  const markAllAsRead = useCallback(() => {
    if (!userEmail) return;

    const updated = notificationState.notifications.map(n => ({
      ...n,
      isRead: true,
    }));

    setNotificationState({ notifications: updated, unreadCount: 0 });
    localStorage.setItem(`userNotifications_${userEmail}`, JSON.stringify(updated));
  }, [userEmail, notificationState]);

  const deleteNotification = useCallback(
    (notificationId: string) => {
      if (!userEmail) return;

      const notification = notificationState.notifications.find(n => n.id === notificationId);
      const updated = notificationState.notifications.filter(n => n.id !== notificationId);
      const unreadCount = !notification?.isRead
        ? Math.max(0, notificationState.unreadCount - 1)
        : notificationState.unreadCount;

      setNotificationState({ notifications: updated, unreadCount });
      localStorage.setItem(`userNotifications_${userEmail}`, JSON.stringify(updated));
    },
    [userEmail, notificationState]
  );

  const getUnreadCount = useCallback((): number => {
    return notificationState.unreadCount;
  }, [notificationState.unreadCount]);

  const getNotificationsByProject = useCallback(
    (projectCode: string): UserNotification[] => {
      return notificationState.notifications.filter(n => n.projectCode === projectCode);
    },
    [notificationState.notifications]
  );

  const getRecentNotifications = useCallback(
    (count: number = 5): UserNotification[] => {
      return notificationState.notifications.slice(0, count);
    },
    [notificationState.notifications]
  );

  return {
    ...notificationState,
    addNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    getUnreadCount,
    getNotificationsByProject,
    getRecentNotifications,
  };
};
