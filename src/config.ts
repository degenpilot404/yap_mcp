import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Define and validate environment variables schema
const envSchema = z.object({
  YAPS_API_ENDPOINT: z.string().url().default('https://api.kaito.ai/api/v1/yaps'),
  PORT: z.string().regex(/^\d+$/).transform(Number).default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

// Validate and export environment variables
export const config = envSchema.parse({
  YAPS_API_ENDPOINT: process.env.YAPS_API_ENDPOINT || 'https://api.kaito.ai/api/v1/yaps',
  PORT: process.env.PORT,
  NODE_ENV: process.env.NODE_ENV,
});

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