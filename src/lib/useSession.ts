import { useEffect, useState } from 'react';
import { authClient } from './auth';

export interface SessionUser {
  id: string;
  email?: string;
  name?: string;
}

export function useSession() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let lastUserId: string | null = null;

    async function checkSession() {
      try {
        const res: any = await (authClient as any).getSession?.();
        const data = res?.data ?? res;
        const u = data?.user;
        const newUser = u ? { id: u.id, email: u.email, name: u.name } : null;
        // Only update state if user actually changed (avoids re-render loops)
        if (!cancelled && (newUser?.id ?? null) !== lastUserId) {
          lastUserId = newUser?.id ?? null;
          setUser(newUser);
        }
      } catch {
        if (!cancelled && lastUserId !== null) {
          lastUserId = null;
          setUser(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    checkSession();

    // Re-check when another tab updates auth state
    const onStorage = () => checkSession();
    window.addEventListener('storage', onStorage);

    // Re-check when the tab regains focus (e.g. after sign-in popup closes)
    const onFocus = () => checkSession();
    window.addEventListener('focus', onFocus);

    // Poll every 2s to catch in-tab sign-in (auth client doesn't fire events)
    const interval = setInterval(checkSession, 2000);

    return () => {
      cancelled = true;
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', onFocus);
      clearInterval(interval);
    };
  }, []);

  return { user, loading };
}
