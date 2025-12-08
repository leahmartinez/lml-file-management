import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { parseMentionedUsers } from '@/utils/parseMentions';

export interface ProjectComment {
  id: string;
  projectCode: string;
  userId: string;
  userName: string;
  userEmail: string;
  comment: string; // Plain text for backwards compatibility
  commentHtml?: string; // Rich HTML content
  images?: Array<{ id: string; url: string; alt?: string }>; // Embedded images
  timestamp: string;
  createdAt: string;
  parentId?: string; // For nested replies
  replies?: ProjectComment[]; // Child comments
  mentionedUserEmails?: string[]; // Array of mentioned user emails
}

/**
 * Hook for managing project comments/notes
 * Stores comments in localStorage per project
 */
export const useProjectComments = (projectCode: string) => {
  const { toast } = useToast();

  const [comments, setComments] = useState<ProjectComment[]>(() => {
    if (!projectCode) return [];
    const stored = localStorage.getItem(`projectComments_${projectCode}`);
    return stored ? JSON.parse(stored) : [];
  });

  // Refresh comments from localStorage when projectCode changes
  useEffect(() => {
    if (!projectCode) {
      setComments([]);
      return;
    }
    const stored = localStorage.getItem(`projectComments_${projectCode}`);
    setComments(stored ? JSON.parse(stored) : []);
  }, [projectCode]);

  const addComment = useCallback((
    comment: string,
    user: { id?: string; name?: string; email?: string },
    parentId?: string,
    commentHtml?: string
  ) => {
    if (!comment.trim()) {
      toast({
        title: "Error",
        description: "Comment cannot be empty",
        variant: "destructive",
      });
      return null;
    }

    // Extract mentioned user emails from the comment HTML
    const mentionedUsers = commentHtml ? parseMentionedUsers(commentHtml) : [];
    const mentionedUserEmails = mentionedUsers.map(u => u.email);

    const newComment: ProjectComment = {
      id: `comment_${Date.now()}`,
      projectCode,
      userId: user.id || 'unknown',
      userName: user.name || 'Unknown User',
      userEmail: user.email || '',
      comment: comment.trim(),
      commentHtml: commentHtml || undefined, // Store HTML if provided
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      parentId,
      mentionedUserEmails: mentionedUserEmails.length > 0 ? mentionedUserEmails : undefined,
    };

    // Add to beginning if it's a top-level comment, otherwise add to end for oldest-first in replies
    const updated = parentId ? [...comments, newComment] : [newComment, ...comments];
    setComments(updated);
    localStorage.setItem(`projectComments_${projectCode}`, JSON.stringify(updated));

    toast({
      title: "Success",
      description: parentId ? "Reply added" : "Comment added",
    });

    return newComment;
  }, [comments, projectCode, toast]);

  const deleteComment = useCallback((commentId: string) => {
    const updated = comments.filter(c => c.id !== commentId);
    setComments(updated);
    localStorage.setItem(`projectComments_${projectCode}`, JSON.stringify(updated));

    toast({
      title: "Success",
      description: "Comment deleted",
    });
  }, [comments, projectCode, toast]);

  const updateComment = useCallback((commentId: string, newText: string) => {
    if (!newText.trim()) {
      toast({
        title: "Error",
        description: "Comment cannot be empty",
        variant: "destructive",
      });
      return;
    }

    const updated = comments.map(c =>
      c.id === commentId ? { ...c, comment: newText.trim() } : c
    );
    setComments(updated);
    localStorage.setItem(`projectComments_${projectCode}`, JSON.stringify(updated));

    toast({
      title: "Success",
      description: "Comment updated",
    });
  }, [comments, projectCode, toast]);

  return {
    comments,
    addComment,
    deleteComment,
    updateComment,
  };
};
