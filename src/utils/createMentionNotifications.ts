/**
 * Utility for creating notifications for mentioned users
 * Stores notifications in the localStorage of each mentioned user
 */

import { UserNotification } from '@/hooks/useNotifications';

/**
 * Create and store notifications for mentioned users
 * Each mentioned user gets a notification stored in their own localStorage
 * Includes self-mentions (user mentioning themselves)
 *
 * @param mentionedUsers - Array of {name, email} for mentioned users (includes self)
 * @param mentioner - {email, name} of the user who created the comment
 * @param projectCode - Code of the project where mention occurred
 * @param commentId - ID of the comment containing the mention
 * @param message - Message to display in notification
 */
export const createMentionNotifications = (
  mentionedUsers: Array<{ name: string; email: string }>,
  mentioner: { email: string; name: string },
  projectCode: string,
  commentId: string,
  message: string
): void => {
  // Include all mentioned users, including self-mentions
  mentionedUsers.forEach(mentionedUser => {
    try {
      // Create the notification object
      const notification: UserNotification = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: mentionedUser.email,
        type: 'mention',
        projectCode,
        commentId,
        mentionedBy: {
          email: mentioner.email,
          name: mentioner.name,
        },
        message,
        timestamp: new Date().toISOString(),
        isRead: false,
      };

      // Get existing notifications for this user from their localStorage
      const storageKey = `userNotifications_${mentionedUser.email}`;
      const existingData = localStorage.getItem(storageKey);
      const existingNotifications: UserNotification[] = existingData
        ? JSON.parse(existingData)
        : [];

      // Add new notification to the beginning (most recent first)
      const updatedNotifications = [notification, ...existingNotifications];

      // Store back to localStorage
      localStorage.setItem(storageKey, JSON.stringify(updatedNotifications));
    } catch (error) {
      console.error(
        `Failed to create notification for ${mentionedUser.email}:`,
        error
      );
    }
  });
};

/**
 * Create a batch of mention notifications with custom logic
 * Useful when you need to create notifications in reply threads
 *
 * @param mentionedUsers - Array of mentioned users (includes self-mentions)
 * @param mentioner - User creating the mention
 * @param projectCode - Project code
 * @param commentId - Comment ID
 * @param parentCommentId - Parent comment ID (for replies)
 * @returns Number of notifications created
 */
export const createReplyMentionNotifications = (
  mentionedUsers: Array<{ name: string; email: string }>,
  mentioner: { email: string; name: string },
  projectCode: string,
  commentId: string,
  parentCommentId: string | undefined
): number => {
  // Include all mentioned users, including self-mentions
  const mentionType = parentCommentId ? 'reply' : 'comment';

  mentionedUsers.forEach(mentionedUser => {
    try {
      // Create different message for self-mentions
      const isSelfMention = mentionedUser.email === mentioner.email;
      const message = isSelfMention
        ? `You mentioned yourself in a ${mentionType} on ${projectCode}`
        : `${mentioner.name} mentioned you in a ${mentionType} on ${projectCode}`;

      const notification: UserNotification = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: mentionedUser.email,
        type: 'mention',
        projectCode,
        commentId,
        mentionedBy: {
          email: mentioner.email,
          name: mentioner.name,
        },
        message,
        timestamp: new Date().toISOString(),
        isRead: false,
      };

      const storageKey = `userNotifications_${mentionedUser.email}`;
      const existingData = localStorage.getItem(storageKey);
      const existingNotifications: UserNotification[] = existingData
        ? JSON.parse(existingData)
        : [];

      const updatedNotifications = [notification, ...existingNotifications];
      localStorage.setItem(storageKey, JSON.stringify(updatedNotifications));
    } catch (error) {
      console.error(
        `Failed to create notification for ${mentionedUser.email}:`,
        error
      );
    }
  });

  return mentionedUsers.length;
};
