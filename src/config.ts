import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Define and validate environment variables schema
const envSchema = z.object({
  YAPS_API_ENDPOINT: z.string().url().default('https://api.kaito.ai/api/v1/yaps'),
  REDIS_URI: z.string().url().optional(),
  PORT: z.string().regex(/^\d+$/).transform(Number).default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  YAPS_CACHE_TTL: z.string().regex(/^\d+$/).transform(Number).default('600'),
  LEADERBOARD_CACHE_TTL: z.string().regex(/^\d+$/).transform(Number).default('86400'),
});

// Validate and export environment variables
export const config = envSchema.parse({
  YAPS_API_ENDPOINT: process.env.YAPS_API_ENDPOINT || 'https://api.kaito.ai/api/v1/yaps',
  REDIS_URI: process.env.REDIS_URI,
  PORT: process.env.PORT,
  NODE_ENV: process.env.NODE_ENV,
  YAPS_CACHE_TTL: process.env.YAPS_CACHE_TTL,
  LEADERBOARD_CACHE_TTL: process.env.LEADERBOARD_CACHE_TTL,
});

// Add a convenience flag for Redis configuration
export const isRedisConfigured = !!config.REDIS_URI;

// Define constants
export const RATE_LIMIT = {
  MAX_REQUESTS: 100,
  WINDOW_MINUTES: 5,
};

// Export the list of crypto accounts to track for the leaderboard
export const TRACKED_ACCOUNTS = [
  'VitalikButerin',
  'saylor',
  'elonmusk',
  'cz_binance',
  'balajis',
  'SBF_FTX',
  'cdixon',
  'aantonop',
  'brian_armstrong',
  'tyler',
  'cameron',
  'gabusch',
  'CryptoHayes',
  'Excellion',
  'SatoshiLite',
  'APompliano',
  'CharlieShrem',
  'rogerkver',
  'adam3us',
  'cryptograffiti'
  // This would typically be a much longer list (~300 accounts as mentioned)
  // but keeping it short for demonstration purposes
]; 