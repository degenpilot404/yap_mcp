import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import { config } from './config.js';
import { createMcpServer } from './mcp.js';
import { RedisRateLimiter } from './services/rate-limiter.js';

// Create the MCP server
const server = createMcpServer();

// Determine which transport to use based on environment
const useStdio = process.argv.includes('--stdio');

// Start the server with the appropriate transport
async function startServer() {
  try {
    if (useStdio) {
      // Use stdio transport for integration with LLM clients like Cursor
      console.error('Starting MCP server with stdio transport for LLM integration');
      
      // Create and connect to stdio transport
      const transport = new StdioServerTransport();
      await server.connect(transport);
      
      console.error('YAPS MCP server started successfully with stdio transport');
    } else {
      // Use HTTP transport for development and testing
      console.log(`Starting MCP server with HTTP transport on port ${config.PORT}`);
      
      // Initialize rate limiter for tracking API usage
      const rateLimiter = new RedisRateLimiter();
      
      // Create an Express app
      const app = express();
      
      // Add JSON middleware
      app.use(express.json());
      
      // Add a simple health check endpoint
      app.get('/', (req, res) => {
        console.log('Health check endpoint accessed');
        res.status(200).json({ status: 'ok', message: 'YAPS MCP server is running' });
      });
      
      // Create HTTP transport (stateless mode)
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined, // Stateless mode
      });
      
      // Set up the Express route for handling MCP requests
      app.post('/mcp', (req, res) => {
        console.log('Received MCP request:', req.body);
        transport.handleRequest(req, res, req.body);
      });
      
      // Connect the server to the transport
      await server.connect(transport);
      
      // Add more routes for debugging
      app.get('/api/status', (req, res) => {
        console.log('Status endpoint accessed');
        res.status(200).json({ 
          status: 'ok', 
          server: 'running',
          redis: 'connected',
          config: {
            port: config.PORT,
            environment: config.NODE_ENV
          }
        });
      });
      
      // Start the Express server with better error handling
      const httpServer = app.listen(config.PORT, () => {
        console.log(`MCP HTTP server listening on port ${config.PORT}`);
      });
      
      httpServer.on('error', (error) => {
        console.error('HTTP server error:', error);
        if ((error as any).code === 'EADDRINUSE') {
          console.error(`Port ${config.PORT} is already in use. Please try a different port.`);
        }
      });
    }
    
    console.error('YAPS MCP server initialization complete');
  } catch (error) {
    console.error('Error starting MCP server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.error('Shutting down YAPS MCP server...');
  // Perform any cleanup tasks here
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled promise rejection:', reason);
});

// Start the server
startServer(); 