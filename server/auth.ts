import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { NextFunction, Request, Response } from 'express';

if (!process.env.NEON_AUTH_JWKS_URL) {
  throw new Error('NEON_AUTH_JWKS_URL is not set in .env.local');
}

const JWKS = createRemoteJWKSet(new URL(process.env.NEON_AUTH_JWKS_URL));

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
      userEmail?: string;
      userName?: string;
    }
  }
}

/**
 * Reads the bearer token from the Authorization header and, if valid,
 * populates req.userId / req.userEmail / req.userName. Does NOT reject
 * unauthenticated requests — route handlers decide whether auth is required.
 */
export async function resolveUser(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next();
  const token = header.slice('Bearer '.length).trim();
  if (!token) return next();

  try {
    const { payload } = await jwtVerify(token, JWKS);
    const sub = typeof payload.sub === 'string' ? payload.sub : undefined;
    if (sub) {
      req.userId = sub;
      req.userEmail = typeof payload.email === 'string' ? payload.email : undefined;
      req.userName = typeof payload.name === 'string' ? payload.name : undefined;
    }
  } catch (e) {
    // Invalid/expired token — leave req.userId unset; requireAuth will 401.
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[auth] JWT verify failed:', (e as Error).message);
    }
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.userId) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  next();
}
