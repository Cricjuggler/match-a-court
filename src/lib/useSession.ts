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
    (async () => {
      try {
        const res: any = await (authClient as any).getSession?.();
        const data = res?.data ?? res;
        const u = data?.user;
        if (!cancelled) setUser(u ? { id: u.id, email: u.email, name: u.name } : null);
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { user, loading };
}
