/**
 * Tests for useAlerts hook
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAlerts, useUnreadAlertCount, useMarkAlertAsRead, useMarkAllAlertsAsRead } from '../useAlerts';
import { Alert } from '@/types/data';

// Mock fetch globally
global.fetch = vi.fn();

// Helper to create wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useAlerts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock localStorage
    global.localStorage = {
      getItem: vi.fn(() => 'mock-token'),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn(),
    };
  });

  it('should fetch all alerts successfully', async () => {
    const mockAlerts: Alert[] = [
      {
        id: 'alert1',
        type: 'assignment',
        title: 'New Assignment',
        message: 'You have been assigned to a new stage',
        isRead: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'alert2',
        type: 'mention',
        title: 'Mentioned in Comment',
        message: 'John mentioned you in a comment',
        isRead: true,
        createdAt: new Date().toISOString(),
      },
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ alerts: mockAlerts }),
    });

    const { result } = renderHook(() => useAlerts(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockAlerts);
  });

  it('should fetch unread alerts only when specified', async () => {
    const mockUnreadAlerts: Alert[] = [
      {
        id: 'alert1',
        type: 'assignment',
        title: 'New Assignment',
        message: 'You have been assigned to a new stage',
        isRead: false,
        createdAt: new Date().toISOString(),
      },
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ alerts: mockUnreadAlerts }),
    });

    const { result } = renderHook(() => useAlerts(true), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockUnreadAlerts);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('unreadOnly=true'),
      expect.any(Object)
    );
  });

  it('should handle fetch errors', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      statusText: 'Internal Server Error',
    });

    const { result } = renderHook(() => useAlerts(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeTruthy();
  });
});

describe('useUnreadAlertCount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.localStorage = {
      getItem: vi.fn(() => 'mock-token'),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn(),
    };
  });

  it('should fetch unread count successfully', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ count: 5 }),
    });

    const { result } = renderHook(() => useUnreadAlertCount(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBe(5);
  });

  it('should return 0 when no unread alerts', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ count: 0 }),
    });

    const { result } = renderHook(() => useUnreadAlertCount(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBe(0);
  });
});

describe('useMarkAlertAsRead', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.localStorage = {
      getItem: vi.fn(() => 'mock-token'),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn(),
    };
  });

  it('should mark alert as read successfully', async () => {
    const mockAlert: Alert = {
      id: 'alert1',
      type: 'assignment',
      title: 'New Assignment',
      message: 'You have been assigned to a new stage',
      isRead: true,
      createdAt: new Date().toISOString(),
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ alert: mockAlert }),
    });

    const { result } = renderHook(() => useMarkAlertAsRead(), {
      wrapper: createWrapper(),
    });

    result.current.mutate('alert1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/alerts/alert1/read'),
      expect.objectContaining({
        method: 'PATCH',
      })
    );
  });
});

describe('useMarkAllAlertsAsRead', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.localStorage = {
      getItem: vi.fn(() => 'mock-token'),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn(),
    };
  });

  it('should mark all alerts as read successfully', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, count: 3 }),
    });

    const { result } = renderHook(() => useMarkAllAlertsAsRead(), {
      wrapper: createWrapper(),
    });

    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/alerts/read-all'),
      expect.objectContaining({
        method: 'PATCH',
      })
    );
  });
});
