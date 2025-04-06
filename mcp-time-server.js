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

// Keep the process alive
let keepAliveInterval;

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

// Listen for stdin closing
rl.on('close', () => {
  console.error(`[info] Input stream closed, shutting down...`);
  clearInterval(keepAliveInterval);
  process.exit(0);
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
  
  // Start the keep-alive timer before sending response
  // This ensures the Node.js process doesn't exit
  startKeepAlive();
  
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
  
  // Clean up and exit
  stopKeepAlive();
  
  // Allow time for the response to be sent
  setTimeout(() => {
    process.exit(0);
  }, 100);
}

// Start keep-alive mechanisms
function startKeepAlive() {
  if (!keepAliveInterval) {
    console.error('[info] Starting keep-alive mechanisms');
    
    // Send a heartbeat log every minute
    keepAliveInterval = setInterval(() => {
      console.error(`[debug] MCP time server is still running...`);
    }, 60000);
    
    // Don't let the interval prevent the process from exiting
    // if everything else is done
    keepAliveInterval.unref();
  }
}

// Stop keep-alive mechanisms
function stopKeepAlive() {
  if (keepAliveInterval) {
    console.error('[info] Stopping keep-alive mechanisms');
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
  }
}

// Helper for sending JSON-RPC responses
function sendJsonRpcResponse(id, result) {
  const response = {
    jsonrpc: "2.0",
    id,
    result
  };
  
  // Write to stdout and flush
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
  
  // Write to stdout and flush
  console.log(JSON.stringify(response));
}

// Handle process termination
process.on('SIGINT', () => {
  console.error(`[info] Received SIGINT, shutting down...`);
  stopKeepAlive();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error(`[info] Received SIGTERM, shutting down...`);
  stopKeepAlive();
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error(`[error] Uncaught exception: ${err.message}`);
  console.error(err.stack);
  // Don't exit, try to keep the server running
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error(`[error] Unhandled rejection at: ${promise}, reason: ${reason}`);
  // Don't exit, try to keep the server running
});

// Explicitly prevent the process from exiting when stdin ends
// This is important for keeping the MCP server alive
process.stdin.on('end', () => {
  console.error(`[warn] stdin ended, but keeping process alive for MCP protocol`);
});

// This keeps the Node.js process from exiting
process.stdin.resume();

console.error(`[info] IoEHub MCP Time Server ready to accept connections`); 