import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { YAPSScore, ScoreComparison, LeaderboardEntry } from './types.js';
import { getYapsScore } from './services/yaps-api.js';
import { compareYapsScores } from './services/comparison.js';
import { getLeaderboard } from './services/leaderboard.js';
import { RedisRateLimiter } from './services/rate-limiter.js';

// Initialize rate limiter
const rateLimiter = new RedisRateLimiter();

// Create the MCP server
export const createMcpServer = () => {
  const server = new McpServer({
    name: 'YAPS',
    version: '1.0.0',
    description: 'Kaito YAPS API MCP Server providing tokenized attention scores for X/Twitter accounts'
  });

  // Define YAPSScore resource
  server.resource(
    'yaps-score',
    new ResourceTemplate('yaps-score://{username}', { list: undefined }),
    async (uri, { username }) => {
      try {
        // Check rate limits
        const underLimit = await rateLimiter.checkLimit();
        if (!underLimit) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        
        // Increment counter and fetch score
        await rateLimiter.incrementCounter();
        const score = await getYapsScore(String(username));
        
        // Return the resource content
        return {
          contents: [{
            uri: uri.href,
            text: JSON.stringify(score),
            mediaType: 'application/json'
          }]
        };
      } catch (error) {
        console.error(`Error fetching YAPS score for ${username}:`, error);
        throw error;
      }
    }
  );

  // Get YAPS score tool
  server.tool(
    'get_yaps_score',
    { username: z.string().min(1) },
    async ({ username }) => {
      try {
        // Check rate limits
        const underLimit = await rateLimiter.checkLimit();
        if (!underLimit) {
          return {
            content: [{ 
              type: 'text', 
              text: 'Rate limit exceeded. Please try again later.' 
            }],
            status: 429
          };
        }
        
        // Increment counter and fetch score
        await rateLimiter.incrementCounter();
        const score = await getYapsScore(String(username));
        
        // Generate a descriptive summary
        const summary = generateScoreSummary(score);
        
        // Return the score and summary
        return {
          content: [
            { 
              type: 'text', 
              text: JSON.stringify(score, null, 2) 
            },
            { 
              type: 'text', 
              text: summary 
            }
          ]
        };
      } catch (error) {
        console.error(`Error in get_yaps_score for ${username}:`, error);
        return {
          content: [{ 
            type: 'text', 
            text: `Error fetching YAPS score: ${error instanceof Error ? error.message : String(error)}` 
          }],
          status: 500
        };
      }
    }
  );

  // Compare scores tool
  server.tool(
    'compare_scores',
    { 
      username_a: z.string().min(1), 
      username_b: z.string().min(1) 
    },
    async ({ username_a, username_b }) => {
      try {
        // Check rate limits
        const underLimit = await rateLimiter.checkLimit();
        if (!underLimit) {
          return {
            content: [{ 
              type: 'text', 
              text: 'Rate limit exceeded. Please try again later.' 
            }],
            status: 429
          };
        }
        
        // Increment counter and fetch comparison
        await rateLimiter.incrementCounter();
        const comparison = await compareYapsScores(String(username_a), String(username_b));
        
        // Return the comparison result
        return {
          content: [
            { 
              type: 'text', 
              text: JSON.stringify(comparison, null, 2) 
            },
            { 
              type: 'text', 
              text: comparison.summary 
            }
          ]
        };
      } catch (error) {
        console.error(`Error comparing ${username_a} and ${username_b}:`, error);
        return {
          content: [{ 
            type: 'text', 
            text: `Error comparing scores: ${error instanceof Error ? error.message : String(error)}` 
          }],
          status: 500
        };
      }
    }
  );

  // Leaderboard tool
  server.tool(
    'leaderboard_today',
    {},
    async () => {
      try {
        const leaderboard = await getLeaderboard();
        
        // Format the leaderboard for readability
        const formattedLeaderboard = formatLeaderboard(leaderboard);
        
        return {
          content: [
            { 
              type: 'text', 
              text: JSON.stringify(leaderboard, null, 2) 
            },
            { 
              type: 'text', 
              text: formattedLeaderboard 
            }
          ]
        };
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
        return {
          content: [{ 
            type: 'text', 
            text: `Error fetching leaderboard: ${error instanceof Error ? error.message : String(error)}` 
          }],
          status: 500
        };
      }
    }
  );

  return server;
};

// Helper function to generate a summary of a YAPS score
const generateScoreSummary = (score: YAPSScore): string => {
  const { username, yaps_l30d, percentile, qualitative_label } = score;
  
  return `@${username} has a YAPS score of ${yaps_l30d.toFixed(1)} over the last 30 days, placing them in the ${percentile}th percentile (${qualitative_label}).`;
};

// Helper function to format the leaderboard for display
const formatLeaderboard = (leaderboard: LeaderboardEntry[]): string => {
  if (leaderboard.length === 0) {
    return 'No data available for the leaderboard.';
  }
  
  return `Top ${leaderboard.length} YAPS accounts in the last 24 hours:\n\n` +
    leaderboard.map(entry => 
      `${entry.rank}. @${entry.username}: ${entry.yaps_l24h.toFixed(1)} YAPS`
    ).join('\n');
}; 