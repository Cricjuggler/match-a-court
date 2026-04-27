import { SignJWT, jwtVerify } from 'jose';
import type { NextFunction, Request, Response } from 'express';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is not set in .env.local');
}

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

export async function signToken(payload: {
  sub: string;
  role: 'business' | 'admin';
  email: string;
}) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
}

export async function verifyTokenPayload(token: string) {
  const { payload } = await jwtVerify(token, secret);
  return payload as { sub: string; role: string; email: string };
}

/** Middleware: extract business JWT, populate req.businessId */
export function requireBusiness(req: Request, res: Response, next: NextFunction) {
  extractJwt(req, 'business')
    .then((p) => {
      if (!p) return res.status(401).json({ error: 'unauthorized' });
      req.businessId = p.sub;
      req.businessEmail = p.email;
      next();
    })
    .catch(() => res.status(401).json({ error: 'unauthorized' }));
}

/** Middleware: extract admin JWT, populate req.adminId */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  extractJwt(req, 'admin')
    .then((p) => {
      if (!p) return res.status(401).json({ error: 'unauthorized' });
      req.adminId = p.sub;
      req.adminEmail = p.email;
      next();
    })
    .catch(() => res.status(401).json({ error: 'unauthorized' }));
}

async function extractJwt(req: Request, requiredRole: string) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  if (!token) return null;
  const payload = await verifyTokenPayload(token);
  if (payload.role !== requiredRole) return null;
  return payload;
}

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      businessId?: string;
      businessEmail?: string;
      adminId?: string;
      adminEmail?: string;
    }
  }
}
