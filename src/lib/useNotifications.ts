import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from './api';
import { useSession } from './useSession';

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, any>;
  read: boolean;
  createdAt: string;
}

export function useNotifications() {
  const { user } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchCount = useCallback(async () => {
    if (!user) return;
    try {
      const r = await apiFetch('/api/notifications/unread-count');
      if (r.ok) {
        const { count } = await r.json();
        setUnreadCount(count);
      }
    } catch (_) {}
  }, [user]);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    try {
      const r = await apiFetch('/api/notifications');
      if (r.ok) {
        const data: Notification[] = await r.json();
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.read).length);
      }
    } catch (_) {}
  }, [user]);

  const markRead = useCallback(async (id: string) => {
    await apiFetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const markAllRead = useCallback(async () => {
    await apiFetch('/api/notifications/read-all', { method: 'PATCH' });
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  // Poll unread count every 30s
  useEffect(() => {
    if (!user) return;
    fetchCount();
    intervalRef.current = setInterval(fetchCount, 30_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [user, fetchCount]);

  return { notifications, unreadCount, fetchAll, markRead, markAllRead };
}
