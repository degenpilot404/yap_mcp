import { RATE_LIMIT } from '../config.js';
import { RateLimiter } from '../types.js';

// Simple pass-through rate limiter that doesn't actually limit anything
// The server will rely on Kaito's API rate limiting
export class SimpleRateLimiter implements RateLimiter {
  private readonly maxRequests = RATE_LIMIT.MAX_REQUESTS;
  private readonly windowMinutes = RATE_LIMIT.WINDOW_MINUTES;

  // Always allows the request - Kaito's API will implement actual rate limiting
  async checkLimit(): Promise<boolean> {
    return true;
  }

  // No-op since we don't track counts
  async incrementCounter(): Promise<void> {
    // No operation needed
  }

  // Returns fake usage stats
  async getUsage(): Promise<{ current: number; max: number; windowMinutes: number }> {
    return {
      current: 0, // We're not actually tracking
      max: this.maxRequests,
      windowMinutes: this.windowMinutes
    };
  }

  // No-op reset
  async resetCounter(): Promise<void> {
    // No operation needed
  }
} 