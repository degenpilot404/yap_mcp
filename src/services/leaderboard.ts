import { TRACKED_ACCOUNTS } from '../config.js';
import { LeaderboardEntry, YAPSScore } from '../types.js';
import { getYapsScore } from './yaps-api.js';
import { SimpleRateLimiter } from './rate-limiter.js';

// Initialize a simple rate limiter
const rateLimiter = new SimpleRateLimiter();

// Keep an in-memory cache for the current process only
let leaderboardCache: LeaderboardEntry[] = [];
let lastUpdateTime = 0;
const CACHE_TTL = 3600 * 1000; // 1 hour in milliseconds

// Function to update the leaderboard
export const updateLeaderboard = async (): Promise<LeaderboardEntry[]> => {
  console.log('Starting leaderboard update...');
  
  const scores: YAPSScore[] = [];
  
  // Fetch scores for all tracked accounts
  for (const username of TRACKED_ACCOUNTS) {
    try {
      // Always true with SimpleRateLimiter but we keep the API the same
      const underLimit = await rateLimiter.checkLimit();
      if (!underLimit) {
        console.warn('Rate limit reached during leaderboard update. Will continue in the next cycle.');
        break;
      }
      
      // Increment counter (no-op in SimpleRateLimiter) and fetch score
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
  
  // Update in-memory cache
  leaderboardCache = top10;
  lastUpdateTime = Date.now();
  
  console.log(`Leaderboard updated with ${top10.length} entries`);
  return top10;
};

// Get the current leaderboard
export const getLeaderboard = async (): Promise<LeaderboardEntry[]> => {
  // If cache exists and is fresh, return it
  if (leaderboardCache.length > 0 && (Date.now() - lastUpdateTime) < CACHE_TTL) {
    return leaderboardCache;
  }
  
  // Otherwise, update the leaderboard
  return updateLeaderboard();
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