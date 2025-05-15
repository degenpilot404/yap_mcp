#!/bin/bash
# Script to start the YAPS MCP server in stdio mode for LLM integration

# Change to the project directory
cd "$(dirname "$0")"

# Run the server in stdio mode
node dist/index.js --stdio 