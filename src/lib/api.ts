import { authClient } from './auth';

/**
 * Wrapper around fetch that attaches the Neon Auth session token (if any)
 * as a Bearer token so the Express backend can verify via JWKS.
 */
async function getAuthHeader(): Promise<Record<string, string>> {
  try {
    // Neon Auth SDK (Better Auth under the hood) exposes session via getSession().
    // Shape varies slightly; we defensively pull a token out of known fields.
    const res: any = await (authClient as any).getSession?.();
    const data = res?.data ?? res;
    const token: string | undefined =
      data?.session?.token ?? data?.token ?? data?.accessToken;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const authHeader = await getAuthHeader();
  return fetch(path, {
    ...init,
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
      ...authHeader,
      ...(init.headers || {}),
    },
  });
}
