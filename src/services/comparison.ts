import Redis from 'ioredis';
import { config } from '../config.js';
import { ScoreComparison, YAPSScore } from '../types.js';
import { getYapsScore } from './yaps-api.js';

// Initialize Redis client
const redis = new Redis.default(config.REDIS_URI);

// Cache key generator for YAPS comparisons
const getComparisonCacheKey = (usernameA: string, usernameB: string): string => {
  // Sort usernames to ensure consistent caching regardless of order
  const sortedUsernames = [usernameA, usernameB].sort();
  return `yaps:comparison:${sortedUsernames[0]}:${sortedUsernames[1]}`;
};

// Generate a natural language summary of the comparison
const generateComparisonSummary = (
  userA: { username: string; yaps_l24h: number; yaps_l30d: number },
  userB: { username: string; yaps_l24h: number; yaps_l30d: number },
  deltas: { yaps_l24h: number; yaps_l30d: number }
): string => {
  // Determine who has higher scores
  const higher24h = deltas.yaps_l24h > 0 ? userA.username : userB.username;
  const higher30d = deltas.yaps_l30d > 0 ? userA.username : userB.username;
  
  // Get absolute values for reporting
  const abs24h = Math.abs(deltas.yaps_l24h);
  const abs30d = Math.abs(deltas.yaps_l30d);
  
  // Handle case where one user is clearly dominant
  if (higher24h === higher30d) {
    return `@${higher24h} shows stronger engagement with ${abs24h.toFixed(1)} more YAPS in last 24h and ${abs30d.toFixed(1)} more in last 30 days.`;
  }
  
  // Handle mixed comparison
  return `@${higher24h} leads in recent activity (${abs24h.toFixed(1)} more YAPS in 24h) while @${higher30d} has better long-term metrics (${abs30d.toFixed(1)} more YAPS over 30 days).`;
};

// Compare two users' YAPS scores
export const compareYapsScores = async (usernameA: string, usernameB: string): Promise<ScoreComparison> => {
  const cacheKey = getComparisonCacheKey(usernameA, usernameB);
  
  // Try to get from cache first
  const cachedComparison = await redis.get(cacheKey);
  if (cachedComparison) {
    return JSON.parse(cachedComparison) as ScoreComparison;
  }
  
  // Fetch both scores in parallel
  const [scoreA, scoreB] = await Promise.all([
    getYapsScore(usernameA),
    getYapsScore(usernameB)
  ]);
  
  // Calculate deltas (A - B)
  const deltas = {
    yaps_all: scoreA.yaps_all - scoreB.yaps_all,
    yaps_l24h: scoreA.yaps_l24h - scoreB.yaps_l24h,
    yaps_l30d: scoreA.yaps_l30d - scoreB.yaps_l30d
  };
  
  // Generate a natural language summary
  const summary = generateComparisonSummary(
    { username: scoreA.username, yaps_l24h: scoreA.yaps_l24h, yaps_l30d: scoreA.yaps_l30d },
    { username: scoreB.username, yaps_l24h: scoreB.yaps_l24h, yaps_l30d: scoreB.yaps_l30d },
    { yaps_l24h: deltas.yaps_l24h, yaps_l30d: deltas.yaps_l30d }
  );
  
  // Construct the comparison result
  const comparison: ScoreComparison = {
    user_a: {
      user_id: scoreA.user_id,
      username: scoreA.username,
      yaps_all: scoreA.yaps_all,
      yaps_l24h: scoreA.yaps_l24h,
      yaps_l30d: scoreA.yaps_l30d
    },
    user_b: {
      user_id: scoreB.user_id,
      username: scoreB.username,
      yaps_all: scoreB.yaps_all,
      yaps_l24h: scoreB.yaps_l24h,
      yaps_l30d: scoreB.yaps_l30d
    },
    deltas,
    summary
  };
  
  // Cache the comparison
  await redis.set(
    cacheKey,
    JSON.stringify(comparison),
    'EX',
    config.YAPS_CACHE_TTL
  );
  
  return comparison;
}; 