import type NodeCache from 'node-cache';

const DEV_EXPIRATION = 2 * 60
const PROD_EXPIRATION = 24 * 60 * 60

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    /**
     * Implements a lightweight caching mechanism for user session tokens.
     * This approach takes into account the application's current scale and requirements,
     * it should be replaced with a more robust solution like Redis if the application scales up.
     */
    const NodeCache = (await import('node-cache')).default;
    
    const config: NodeCache.Options = {
      stdTTL: process.env.NODE_ENV === 'production' ? PROD_EXPIRATION : DEV_EXPIRATION,
    };

    global.sessionCache = new NodeCache(config);
  }
}