import Redis from 'ioredis';
import cron from 'node-cron';
import { config, TRACKED_ACCOUNTS } from '../config.js';
import { LeaderboardEntry, YAPSScore } from '../types.js';
import { getYapsScore } from './yaps-api.js';
import { RedisRateLimiter } from './rate-limiter.js';

// Initialize Redis client
const redis = new Redis.default(config.REDIS_URI);
const rateLimiter = new RedisRateLimiter();

// Cache key for the leaderboard
const LEADERBOARD_CACHE_KEY = 'yaps:leaderboard:daily';

// Function to update the leaderboard
export const updateLeaderboard = async (): Promise<void> => {
  console.log('Starting daily leaderboard update...');
  
  const scores: YAPSScore[] = [];
  
  // Fetch scores for all tracked accounts
  for (const username of TRACKED_ACCOUNTS) {
    try {
      // Check rate limit before making the API call
      const underLimit = await rateLimiter.checkLimit();
      if (!underLimit) {
        console.warn('Rate limit reached during leaderboard update. Will continue in the next cycle.');
        break;
      }
      
      // Increment counter and fetch score
      await rateLimiter.incrementCounter();
      const score = await getYapsScore(username);
      scores.push(score);
      
      // Add small delay to prevent API flooding
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Error fetching score for ${username}:`, error);
    }
  }
  
  // Sort by 24h YAPS score (descending)
  scores.sort((a, b) => b.yaps_l24h - a.yaps_l24h);
  
  // Take top 10
  const top10 = scores.slice(0, 10).map((score, index) => {
    const entry: LeaderboardEntry = {
      rank: index + 1,
      user_id: score.user_id,
      username: score.username,
      yaps_l24h: score.yaps_l24h,
      yaps_all: score.yaps_all
    };
    return entry;
  });
  
  // Cache the leaderboard
  await redis.set(
    LEADERBOARD_CACHE_KEY,
    JSON.stringify(top10),
    'EX',
    config.LEADERBOARD_CACHE_TTL
  );
  
  console.log(`Leaderboard updated with ${top10.length} entries`);
};

// Get the current leaderboard
export const getLeaderboard = async (): Promise<LeaderboardEntry[]> => {
  const cachedLeaderboard = await redis.get(LEADERBOARD_CACHE_KEY);
  
  if (cachedLeaderboard) {
    return JSON.parse(cachedLeaderboard) as LeaderboardEntry[];
  }
  
  // If no cached leaderboard, update it
  await updateLeaderboard();
  
  // Get the newly cached leaderboard
  const freshLeaderboard = await redis.get(LEADERBOARD_CACHE_KEY);
  return freshLeaderboard ? JSON.parse(freshLeaderboard) as LeaderboardEntry[] : [];
};

// // Initialize the leaderboard scheduler
// export const initLeaderboardScheduler = (): void => {
//   // Schedule daily update at midnight UTC
//   // cron.schedule('0 0 * * *', async () => {
//   //   try {
//   //     await updateLeaderboard();
//   //   } catch (error) {
//   //     console.error('Error updating leaderboard:', error);
//   //   }
//   // });

//   // Initial update when server starts
//   // updateLeaderboard().catch(error => {
//   //   console.error('Error during initial leaderboard update:', error);
//   // });
// }; 