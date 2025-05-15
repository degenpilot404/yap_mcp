import axios from 'axios';
import { config } from '../config.js';
import { YAPSScore } from '../types.js';
import Redis from 'ioredis';
import { promisify } from 'util';

// Initialize Redis client
const redis = new Redis.default(config.REDIS_URI);

// Function to extract username from handle (removing @ if present)
const normalizeUsername = (username: string): string => {
  return username.startsWith('@') ? username.substring(1) : username;
};

// Cache key generator for YAPS scores
const getYapsCacheKey = (username: string): string => {
  return `yaps:score:${normalizeUsername(username)}`;
};

// Fetch YAPS score from Kaito API
const fetchYapsScore = async (username: string): Promise<YAPSScore> => {
  const normalizedUsername = normalizeUsername(username);
  
  try {
    // Prepare headers - only include Authorization if API key is provided
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    if (config.YAPS_API_KEY) {
      headers['Authorization'] = `Bearer ${config.YAPS_API_KEY}`;
    }
    
    // Make the API request
    const response = await axios.get(`${config.YAPS_API_ENDPOINT}?username=${normalizedUsername}`, { headers });

    if (response.status !== 200) {
      throw new Error(`Failed to fetch YAPS score: ${response.statusText}`);
    }

    // Process the response data to match our YAPSScore interface
    const data = response.data;
    
    // Calculate percentile (assuming this is based on some business logic)
    // This is a placeholder - real implementation would depend on Kaito's API response format
    const percentile = calculatePercentile(data.yaps_l30d);
    
    // Determine qualitative label based on percentile
    const qualitativeLabel = getQualitativeLabel(percentile);
    
    const yapsScore: YAPSScore = {
      user_id: data.user_id,
      username: normalizedUsername,
      yaps_all: data.yaps_all,
      yaps_l24h: data.yaps_l24h,
      yaps_l7d: data.yaps_l7d,
      yaps_l30d: data.yaps_l30d,
      percentile,
      qualitative_label: qualitativeLabel
    };
    
    // Cache the result
    await redis.set(
      getYapsCacheKey(normalizedUsername),
      JSON.stringify(yapsScore),
      'EX',
      config.YAPS_CACHE_TTL
    );
    
    return yapsScore;
  } catch (error) {
    console.error(`Error fetching YAPS score for ${normalizedUsername}:`, error);
    throw new Error(`Failed to fetch YAPS score for ${normalizedUsername}`);
  }
};

// Get YAPS score (from cache or API)
export const getYapsScore = async (username: string): Promise<YAPSScore> => {
  const normalizedUsername = normalizeUsername(username);
  const cacheKey = getYapsCacheKey(normalizedUsername);
  
  // Try to get from cache first
  const cachedScore = await redis.get(cacheKey);
  
  if (cachedScore) {
    return JSON.parse(cachedScore) as YAPSScore;
  }
  
  // If not in cache, fetch from API
  return fetchYapsScore(normalizedUsername);
};

// Calculate percentile based on YAPS score
// This is a simplified placeholder implementation
const calculatePercentile = (score: number): number => {
  // This would typically involve more complex logic based on historical data
  // For demonstration, we'll use a simplified approach
  if (score > 1000) return 99;
  if (score > 500) return 95;
  if (score > 250) return 90;
  if (score > 100) return 75;
  if (score > 50) return 50;
  if (score > 25) return 25;
  return 10;
};

// Get qualitative label based on percentile
const getQualitativeLabel = (percentile: number): string => {
  if (percentile >= 99) return 'Legendary';
  if (percentile >= 95) return 'Elite';
  if (percentile >= 90) return 'Outstanding';
  if (percentile >= 75) return 'Excellent';
  if (percentile >= 50) return 'Good';
  if (percentile >= 25) return 'Average';
  return 'Developing';
}; 