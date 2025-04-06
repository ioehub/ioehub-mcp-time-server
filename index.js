#!/usr/bin/env node

// IoEHub MCP Time Server
// MCP server for providing current time information

const readline = require('readline');

// Set up stdin/stdout for JSON-RPC communication
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

// Use console.error for logging - this shows up in MCP client logs
// but doesn't interfere with the JSON-RPC communication
console.error(`[info] Initializing IoEHub MCP Time Server...`);

// Listen for incoming messages on stdin
rl.on('line', (line) => {
  try {
    // Parse the incoming JSON message
    const message = JSON.parse(line);
    console.error(`[debug] Received message: ${JSON.stringify(message)}`);
    
    // Handle the message based on its method
    handleMessage(message);
  } catch (error) {
    console.error(`[error] Failed to parse message: ${error.message}`);
    
    // Send error response
    sendJsonRpcError(null, -32700, "Parse error");
  }
});

// Handle different message types
function handleMessage(message) {
  const { method, id } = message;
  
  switch (method) {
    case 'initialize':
      handleInitialize(message);
      break;
    case 'getTime':
      handleGetTime(id);
      break;
    case 'shutdown':
      handleShutdown(id);
      break;
    default:
      console.error(`[warn] Method not supported: ${method}`);
      sendJsonRpcError(id, -32601, "Method not found");
  }
}

// Handle initialization request
function handleInitialize(message) {
  const { id, params } = message;
  console.error(`[info] Initializing with protocol version: ${params.protocolVersion}`);
  
  // Send capabilities response
  sendJsonRpcResponse(id, {
    serverInfo: {
      name: "IoEHubMcpTimeServer",
      version: "1.0.0"
    },
    capabilities: {
      timeProvider: true
    }
  });
}

// Handle get time request
function handleGetTime(id) {
  const timestamp = Math.floor(Date.now() / 1000);
  const date = new Date(timestamp * 1000);
  
  sendJsonRpcResponse(id, {
    unix_time: timestamp,
    unix_ms: Date.now(),
    human_readable: date.toISOString(),
    formatted: date.toLocaleString(),
    utc: date.toUTCString(),
    date_only: date.toDateString(),
    time_only: date.toTimeString()
  });
}

// Handle shutdown request
function handleShutdown(id) {
  console.error(`[info] Shutting down...`);
  sendJsonRpcResponse(id, null);
  
  // Allow time for the response to be sent
  setTimeout(() => {
    process.exit(0);
  }, 100);
}

// Helper for sending JSON-RPC responses
function sendJsonRpcResponse(id, result) {
  const response = {
    jsonrpc: "2.0",
    id,
    result
  };
  
  // Write to stdout
  console.log(JSON.stringify(response));
}

// Helper for sending JSON-RPC errors
function sendJsonRpcError(id, code, message, data) {
  const response = {
    jsonrpc: "2.0",
    id,
    error: {
      code,
      message,
      data
    }
  };
  
  // Write to stdout
  console.log(JSON.stringify(response));
}

// Handle process termination
process.on('SIGINT', () => {
  console.error(`[info] Received SIGINT, shutting down...`);
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error(`[info] Received SIGTERM, shutting down...`);
  process.exit(0);
});

console.error(`[info] IoEHub MCP Time Server ready to accept connections`); 