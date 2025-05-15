import Redis from 'ioredis';
import { config, RATE_LIMIT } from '../config.js';
import { RateLimiter } from '../types.js';

// Initialize Redis client
const redis = new Redis.default(config.REDIS_URI);

export class RedisRateLimiter implements RateLimiter {
  private readonly key = 'yaps:ratelimit';
  private readonly maxRequests = RATE_LIMIT.MAX_REQUESTS;
  private readonly windowMinutes = RATE_LIMIT.WINDOW_MINUTES;

  // Check if the current request would exceed the rate limit
  async checkLimit(): Promise<boolean> {
    const currentCount = await redis.get(this.key);
    
    if (!currentCount) {
      return true; // No count yet, so we're under the limit
    }
    
    return parseInt(currentCount, 10) < this.maxRequests;
  }

  // Increment the counter for tracking rate limits
  async incrementCounter(): Promise<void> {
    const exists = await redis.exists(this.key);
    
    if (!exists) {
      // Initialize counter with TTL
      await redis.set(this.key, '1', 'EX', this.windowMinutes * 60);
    } else {
      // Increment existing counter
      await redis.incr(this.key);
    }
  }

  // Get current usage statistics
  async getUsage(): Promise<{ current: number; max: number; windowMinutes: number }> {
    const currentCount = await redis.get(this.key);
    
    return {
      current: currentCount ? parseInt(currentCount, 10) : 0,
      max: this.maxRequests,
      windowMinutes: this.windowMinutes
    };
  }

  // Reset the counter (useful for testing)
  async resetCounter(): Promise<void> {
    await redis.del(this.key);
  }
} 