import Redis from 'ioredis';
import { config, RATE_LIMIT, isRedisConfigured } from '../config.js';
import { RateLimiter } from '../types.js';

// Initialize Redis client conditionally
let redis: Redis.Redis | null = null;
if (isRedisConfigured && config.REDIS_URI) {
  try {
    redis = new Redis.default(config.REDIS_URI, {
      // Adding a connection timeout to prevent hanging if Redis is misconfigured but URI is set
      connectTimeout: 2000, 
      // Optional: Max retries to prevent indefinite retrying if Redis is temporarily down
      maxRetriesPerRequest: 3 
    });
    redis.on('error', (err) => {
      console.error('RateLimiter Redis Error:', err);
      // If connection fails, set redis to null so operations become no-ops
      redis = null; 
    });
    redis.on('connect', () => {
      console.log('RateLimiter Redis connected successfully.');
    });
  } catch (error) {
    console.error('Failed to initialize RateLimiter Redis client:', error);
    redis = null;
  }
} else {
  console.warn('RateLimiter: REDIS_URI not configured. Rate limiting will be a pass-through.');
}

export class RedisRateLimiter implements RateLimiter {
  private readonly key = 'yaps:ratelimit';
  private readonly maxRequests = RATE_LIMIT.MAX_REQUESTS;
  private readonly windowMinutes = RATE_LIMIT.WINDOW_MINUTES;

  // Check if the current request would exceed the rate limit
  async checkLimit(): Promise<boolean> {
    if (!redis) {
      return true; // Redis not available, allow request
    }
    try {
      const currentCount = await redis.get(this.key);
      
      if (!currentCount) {
        return true; // No count yet, so we're under the limit
      }
      
      return parseInt(currentCount, 10) < this.maxRequests;
    } catch (error) {
      console.error('RateLimiter Redis error in checkLimit:', error);
      return true; // Fail open on error
    }
  }

  // Increment the counter for tracking rate limits
  async incrementCounter(): Promise<void> {
    if (!redis) {
      return; // Redis not available, do nothing
    }
    try {
      const exists = await redis.exists(this.key);
      
      if (!exists) {
        // Initialize counter with TTL
        await redis.set(this.key, '1', 'EX', this.windowMinutes * 60);
      } else {
        // Increment existing counter
        await redis.incr(this.key);
      }
    } catch (error) {
      console.error('RateLimiter Redis error in incrementCounter:', error);
      // Don't throw, allow operation to proceed without rate limiting increment if Redis fails
    }
  }

  // Get current usage statistics
  async getUsage(): Promise<{ current: number; max: number; windowMinutes: number }> {
    if (!redis) {
      return {
        current: 0,
        max: this.maxRequests,
        windowMinutes: this.windowMinutes,
      };
    }
    try {
      const currentCount = await redis.get(this.key);
      
      return {
        current: currentCount ? parseInt(currentCount, 10) : 0,
        max: this.maxRequests,
        windowMinutes: this.windowMinutes
      };
    } catch (error) {
      console.error('RateLimiter Redis error in getUsage:', error);
      return { // Return default/zero values on error
        current: 0,
        max: this.maxRequests,
        windowMinutes: this.windowMinutes,
      };
    }
  }

  // Reset the counter (useful for testing)
  async resetCounter(): Promise<void> {
    if (!redis) {
      return;
    }
    try {
      await redis.del(this.key);
    } catch (error) {
      console.error('RateLimiter Redis error in resetCounter:', error);
    }
  }
} 