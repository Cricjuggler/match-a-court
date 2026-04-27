import { createAuthClient } from '@neondatabase/neon-js/auth';

export const authClient = createAuthClient((import.meta as any).env.VITE_NEON_AUTH_URL);
