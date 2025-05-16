# YAPS MCP Server
[![smithery badge](https://smithery.ai/badge/@degenpilot404/yap_mcp)](https://smithery.ai/server/@degenpilot404/yap_mcp)

An MCP (Model Context Protocol) server that wraps Kaito's YAPS API to provide tokenized attention scores for X/Twitter accounts. This server enables LLMs to query credibility and influence metrics for any X account, with built-in caching and rate limiting.

## Features

- 🔍 **Influencer Trust Score**: Fetch YAPS scores for any X/Twitter account with caching
- 🔄 **Comparison Tool**: Compare the credibility of two influencers with natural language summaries
- 📊 **Daily Leaderboard**: Top-10 crypto influencers automatically refreshed daily
- 🚦 **Rate Limiting**: Graceful handling of YAPS API's 100 calls / 5 min limit
- 💾 **Redis Caching**: 10-minute TTL for scores, 24-hour TTL for leaderboards

## Getting Started

### Installing via Smithery

To install yap_mcp for Claude Desktop automatically via [Smithery](https://smithery.ai/server/@degenpilot404/yap_mcp):

```bash
npx -y @smithery/cli install @degenpilot404/yap_mcp --client claude
```

### Prerequisites

- Node.js 18 or higher
- Redis server

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/yap-mcp.git
cd yap-mcp
```

2. Install dependencies
```bash
npm install
```

3. Create a `.env` file based on the following template:
```env
# YAPS API (no API key needed - using public API with rate limits)
YAPS_API_ENDPOINT=https://api.kaito.ai/api/v1/yaps

# Redis cache
REDIS_URI=redis://localhost:6379

# Server
PORT=3000
NODE_ENV=development

# YAPS cache TTL in seconds
YAPS_CACHE_TTL=600  # 10 minutes

# Leaderboard settings
LEADERBOARD_CACHE_TTL=86400  # 24 hours
```

4. Build the project
```bash
npm run build
```

5. Start the server
```bash
npm start
```

For integration with LLM providers, use the stdio transport:
```bash
npm start -- --stdio
```

## MCP Resources and Tools

### Resources

- `yaps-score` - YAPS score for a Twitter user
  - Schema: `yaps-score://{username}`

### Tools

- `get_yaps_score` - Get YAPS score and summary for a Twitter user
  - Input: `{ username: string }`
  - Output: JSON object with score and natural language summary

- `compare_scores` - Compare YAPS scores between two Twitter users
  - Input: `{ username_a: string, username_b: string }`
  - Output: JSON comparison with deltas and natural language verdict

- `leaderboard_today` - Get today's top-10 YAPS leaderboard
  - Input: `{}`
  - Output: Array of top 10 accounts by 24h YAPS score

## Using with OpenAI GPT

Example of using the YAPS MCP server with OpenAI:

```javascript
import OpenAI from 'openai';
import { spawn } from 'child_process';

const openai = new OpenAI({ apiKey: 'your-api-key' });

// Start the MCP server as a child process
const mcpProcess = spawn('node', ['dist/index.js', '--stdio'], {
  stdio: ['pipe', 'pipe', process.stderr]
});

// Example function to call GPT with tools
async function askGptWithTools(question) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [{ role: 'user', content: question }],
      tools: [
        {
          type: 'function',
          function: {
            name: 'get_yaps_score',
            description: 'Get YAPS tokenized attention score for an X/Twitter account',
            parameters: {
              type: 'object',
              properties: {
                username: {
                  type: 'string',
                  description: 'Twitter username (with or without @)'
                }
              },
              required: ['username']
            }
          }
        },
        // Additional tools would be defined here
      ],
      tool_choice: 'auto'
    });

    console.log(response.choices[0].message);
    
    // Process tool calls if any
    if (response.choices[0].message.tool_calls) {
      // Implementation for handling tool calls would go here
    }

    return response;
  } catch (error) {
    console.error('Error calling GPT:', error);
    throw error;
  }
}

// Example usage
askGptWithTools('What is the YAPS score for @VitalikButerin?');
```

## Performance and Availability

- P95 tool latency < 300 ms (cache hit) / < 2 s (cache miss)
- 99% monthly availability with stateless containers
- Prometheus metrics for monitoring calls and errors

## API Rate Limits

The YAPS API is available as an open source API with the following limitations:
- Default rate limit: 100 calls every 5 minutes
- This MCP server implements caching and rate limiting to respect these constraints

## Technical Details

- Built with TypeScript and Node.js
- Uses MCP SDK version 1.11.3
- Express.js for HTTP handling
- Redis for caching and rate limiting

## License

MIT 
