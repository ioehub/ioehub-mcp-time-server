#!/usr/bin/env node

/**
 * IoEHub MCP Time Server
 * A simple MCP server that provides the current time for AI models
 * that don't have access to time information
 */

// Standard readline for stdin/stdout communication
const readline = require('readline');

// Initialize readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

// Log to stderr so it doesn't interfere with MCP communication
const log = (level, message) => {
  console.error(`[${level}] ${message}`);
};

// Keep the process alive
let isServerActive = true;
let heartbeatInterval = null;
let keepAliveTimeout = null;
let stdinEndHandled = false;

log('info', 'IoEHub MCP Time Server initializing...');

// Handle incoming messages
rl.on('line', (line) => {
  if (!line || line.trim() === '') return;
  
  try {
    const message = JSON.parse(line);
    log('debug', `Received: ${JSON.stringify(message)}`);
    
    // Reset the keep-alive timeout whenever we receive a message
    resetKeepAliveTimeout();
    
    // Process message based on method
    handleRpcMessage(message);
  } catch (error) {
    log('error', `Failed to parse message: ${error.message}`);
    sendRpcError(null, -32700, 'Parse error', error.message);
  }
});

// Handle process closure
rl.on('close', () => {
  if (stdinEndHandled) return;
  
  log('info', 'Input stream closed, but keeping server alive');
  stdinEndHandled = true;
  
  // Don't exit when stdin closes
  // This is crucial for MCP protocol
});

// Main message handler
function handleRpcMessage(message) {
  if (!message || typeof message !== 'object') {
    return sendRpcError(null, -32600, 'Invalid request');
  }
  
  const { id, method, params } = message;
  
  if (!method) {
    return sendRpcError(id, -32600, 'Method is required');
  }
  
  switch (method) {
    case 'initialize':
      handleInitialize(id, params);
      break;
    case 'getTime':
      handleGetTime(id);
      break;
    case 'shutdown':
      handleShutdown(id);
      break;
    default:
      log('warn', `Unsupported method: ${method}`);
      sendRpcError(id, -32601, 'Method not found');
  }
}

// Handle initialization
function handleInitialize(id, params = {}) {
  log('info', `Initializing with protocol: ${params.protocolVersion || 'unknown'}`);
  
  // Start heartbeat to keep process alive
  startHeartbeat();
  
  // Send capabilities response
  sendRpcResponse(id, {
    serverInfo: {
      name: 'IoEHubMcpTimeServer',
      version: '1.0.0'
    },
    capabilities: {
      timeProvider: true
    }
  });
  
  // Ensure process stays alive after initialization
  ensureProcessStaysAlive();
}

// Handle time request
function handleGetTime(id) {
  const now = Date.now();
  const timestamp = Math.floor(now / 1000);
  const date = new Date(now);
  
  sendRpcResponse(id, {
    unix_time: timestamp,
    unix_ms: now,
    human_readable: date.toISOString(),
    formatted: date.toLocaleString(),
    utc: date.toUTCString(),
    date_only: date.toDateString(),
    time_only: date.toTimeString()
  });
}

// Handle shutdown
function handleShutdown(id) {
  log('info', 'Shutdown requested');
  sendRpcResponse(id, null);
  
  // Clean up and exit after response is sent
  setTimeout(() => {
    cleanup();
    process.exit(0);
  }, 100);
}

// Send JSON-RPC response
function sendRpcResponse(id, result) {
  const response = {
    jsonrpc: '2.0',
    id,
    result
  };
  
  // Log the response before sending
  log('debug', `Sending response: ${JSON.stringify(response)}`);
  
  // Write to stdout
  console.log(JSON.stringify(response));
}

// Send JSON-RPC error
function sendRpcError(id, code, message, data = undefined) {
  const response = {
    jsonrpc: '2.0',
    id,
    error: {
      code,
      message
    }
  };
  
  if (data !== undefined) {
    response.error.data = data;
  }
  
  // Log the error before sending
  log('debug', `Sending error: ${JSON.stringify(response)}`);
  
  // Write to stdout
  console.log(JSON.stringify(response));
}

// Start heartbeat interval to keep server alive
function startHeartbeat() {
  if (!heartbeatInterval) {
    log('info', 'Starting server heartbeat');
    
    // Send a heartbeat log at regular intervals
    heartbeatInterval = setInterval(() => {
      log('debug', 'IoEHub MCP Time Server is still running');
    }, 10000); // Every 10 seconds for more frequent feedback
  }
}

// Reset keep-alive timeout - prevents exiting if no activity
function resetKeepAliveTimeout() {
  if (keepAliveTimeout) {
    clearTimeout(keepAliveTimeout);
  }
  
  // Set a very long timeout - effectively keeping the process alive indefinitely
  keepAliveTimeout = setTimeout(() => {
    log('debug', 'Keep-alive timeout renewed');
  }, 24 * 60 * 60 * 1000); // 24 hours
}

// Ensure process stays alive regardless of stdin/stdout status
function ensureProcessStaysAlive() {
  // 1. Create an interval that does nothing but keeps the event loop active
  setInterval(() => {}, 60000);
  
  // 2. Create an infinite promise that never resolves
  new Promise(() => {
    // This promise intentionally never resolves
  });
  
  // 3. Explicitly prevent process exit via stdin end
  process.stdin.on('end', () => {
    if (stdinEndHandled) return;
    
    log('warn', 'stdin ended, keeping process alive for MCP protocol');
    stdinEndHandled = true;
    
    // Don't exit
    process.stdin.resume();
  });
  
  // 4. Set up keep-alive timeout
  resetKeepAliveTimeout();
}

// Cleanup function
function cleanup() {
  isServerActive = false;
  
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
  
  if (keepAliveTimeout) {
    clearTimeout(keepAliveTimeout);
    keepAliveTimeout = null;
  }
}

// Handle termination signals
process.on('SIGINT', () => {
  log('info', 'Received SIGINT');
  cleanup();
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('info', 'Received SIGTERM');
  cleanup();
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  log('error', `Uncaught exception: ${err.message}`);
  log('error', err.stack);
  // Don't exit, keep the server running
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  log('error', `Unhandled rejection: ${reason}`);
  // Don't exit, keep the server running
});

// Explicitly handle stdin end event at process level
process.stdin.on('end', () => {
  if (stdinEndHandled) return;
  
  log('warn', 'stdin ended at process level, keeping process alive for MCP protocol');
  stdinEndHandled = true;
  
  // Force the process to stay alive by resuming stdin
  process.stdin.resume();
});

// Force stdin to stay open
process.stdin.resume();

// Ready to receive messages
log('info', 'IoEHub MCP Time Server ready for MCP communication');

// Ensure process stays alive from the start
ensureProcessStaysAlive(); 