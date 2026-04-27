import { config } from 'dotenv';

// Load .env.local first (overrides anything already set), then .env as fallback.
config({ path: '.env.local' });
config(); // default .env
