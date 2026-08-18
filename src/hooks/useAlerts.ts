/**
 * Alerts Hook
 *
 * TanStack Query-based hook for managing user alerts and notifications
 * Integrates with the /api/alerts endpoints
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert } from '@/types/data';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7071';

/**
 * Get auth token from localStorage
 */
function getAuthToken(): string | null {
  return localStorage.getItem('authToken');
}

/**
 * Fetch headers with authentication
 */
function getHeaders(): HeadersInit {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

/**
 * Fetch all alerts for the current user
 */
async function fetchAlerts(unreadOnly?: boolean): Promise<Alert[]> {
  const url = unreadOnly
    ? `${API_BASE_URL}/api/alerts?unreadOnly=true`
    : `${API_BASE_URL}/api/alerts`;

  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch alerts: ${response.statusText}`);
  }

  const data = await response.json();
  return data.alerts || [];
}

/**
 * Fetch unread alert count
 */
async function fetchUnreadCount(): Promise<number> {
  const response = await fetch(`${API_BASE_URL}/api/alerts/unread-count`, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch unread count: ${response.statusText}`);
  }

  const data = await response.json();
  return data.count || 0;
}

/**
 * Mark a single alert as read
 */
async function markAlertAsRead(alertId: string): Promise<Alert> {
  const response = await fetch(`${API_BASE_URL}/api/alerts/${alertId}/read`, {
    method: 'PATCH',
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to mark alert as read: ${response.statusText}`);
  }

  const data = await response.json();
  return data.alert;
}

/**
 * Mark all alerts as read
 */
async function markAllAlertsAsRead(): Promise<{ success: boolean; count: number }> {
  const response = await fetch(`${API_BASE_URL}/api/alerts/read-all`, {
    method: 'PATCH',
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to mark all alerts as read: ${response.statusText}`);
  }

  const data = await response.json();
  return data;
}

/**
 * Query keys for alerts
 */
export const ALERT_QUERY_KEYS = {
  all: ['alerts'] as const,
  list: (unreadOnly?: boolean) => [...ALERT_QUERY_KEYS.all, 'list', { unreadOnly }] as const,
  unreadCount: () => [...ALERT_QUERY_KEYS.all, 'unread-count'] as const,
};

/**
 * Hook to fetch all alerts
 */
export function useAlerts(unreadOnly?: boolean) {
  return useQuery({
    queryKey: ALERT_QUERY_KEYS.list(unreadOnly),
    queryFn: () => fetchAlerts(unreadOnly),
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Poll every 60 seconds
  });
}

/**
 * Hook to fetch unread alert count
 * Polls every 60 seconds to keep badge updated
 */
export function useUnreadAlertCount() {
  return useQuery({
    queryKey: ALERT_QUERY_KEYS.unreadCount(),
    queryFn: fetchUnreadCount,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Poll every 60 seconds
  });
}

/**
 * Hook to mark a single alert as read
 */
export function useMarkAlertAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAlertAsRead,
    onSuccess: () => {
      // Invalidate all alert queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ALERT_QUERY_KEYS.all });
    },
  });
}

/**
 * Hook to mark all alerts as read
 */
export function useMarkAllAlertsAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAllAlertsAsRead,
    onSuccess: () => {
      // Invalidate all alert queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ALERT_QUERY_KEYS.all });
    },
  });
}
