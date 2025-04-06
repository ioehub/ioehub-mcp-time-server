#!/usr/bin/env node

/**
 * IoEHub MCP Time Server
 * A simple MCP server that provides the current time for AI models
 * that don't have access to time information
 * 
 * This implementation is designed to be extremely resistant to termination
 * and stay alive for MCP clients even when stdin/stdout are closed.
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');

// Create log directory if it doesn't exist
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
  try {
    fs.mkdirSync(logDir);
  } catch (err) {
    // Ignore error, will log to stderr instead
  }
}

// Log file path
const logFile = path.join(logDir, `mcp-server-${Date.now()}.log`);
let logStream;

try {
  logStream = fs.createWriteStream(logFile, { flags: 'a' });
} catch (err) {
  // Will log to stderr only
}

// Log to both stderr and file if available
const log = (level, message) => {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp} [${level}] ${message}`;
  
  // Always log to stderr
  console.error(logMessage);
  
  // Also log to file if available
  if (logStream && logStream.writable) {
    logStream.write(logMessage + '\n');
  }
};

// Keep-alive mechanisms
let isRunning = true;
let heartbeatInterval = null;
let keepAliveTimeout = null;
let stdinEndHandled = false;
let exitHandlersRegistered = false;

// Initialize readline for stdin/stdout JSON-RPC communication
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

// Start the server
function startServer() {
  log('info', '======================================================');
  log('info', 'IoEHub MCP Time Server starting...');
  log('info', `Process ID: ${process.pid}`);
  log('info', `Node.js version: ${process.version}`);
  log('info', `Platform: ${process.platform}`);
  log('info', '======================================================');
  
  registerExitHandlers();
  setupStdinHandling();
  ensureProcessStaysAlive();
  
  log('info', 'IoEHub MCP Time Server ready for MCP communication');
}

// Register handlers for various exit signals
function registerExitHandlers() {
  if (exitHandlersRegistered) return;
  exitHandlersRegistered = true;
  
  // Handle termination signals
  process.on('SIGINT', () => {
    log('info', 'Received SIGINT - ignoring and keeping server alive');
    // Don't exit
  });
  
  process.on('SIGTERM', () => {
    log('info', 'Received SIGTERM - ignoring and keeping server alive');
    // Don't exit
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
  
  // Handle process exit attempts
  process.on('exit', (code) => {
    log('warn', `Process exit with code ${code} - this should never happen!`);
  });
  
  // Keep process alive even if stdin ends
  process.stdin.on('end', () => {
    handleStdinEnd();
  });
  
  // Keep the process alive by preventing it from exiting
  process.stdin.resume();
}

// Setup stdin handling
function setupStdinHandling() {
  // Handle incoming messages
  rl.on('line', (line) => {
    if (!line || line.trim() === '') return;
    
    try {
      const message = JSON.parse(line);
      log('debug', `Received: ${JSON.stringify(message)}`);
      
      // Reset keep-alive whenever we receive a message
      resetKeepAliveTimeout();
      
      // Process message
      handleRpcMessage(message);
    } catch (error) {
      log('error', `Failed to parse message: ${error.message}`);
      sendRpcError(null, -32700, 'Parse error', error.message);
    }
  });
  
  // Handle readline interface closing
  rl.on('close', () => {
    log('warn', 'readline interface closed, but keeping server alive');
    handleStdinEnd();
  });
}

// Handle stdin ending
function handleStdinEnd() {
  if (stdinEndHandled) return;
  stdinEndHandled = true;
  
  log('warn', 'stdin ended, keeping process alive for MCP protocol');
  
  // Try to reopen stdin
  try {
    process.stdin.resume();
  } catch (e) {
    log('warn', `Failed to resume stdin: ${e.message}`);
  }
}

// Ensure the process stays alive indefinitely
function ensureProcessStaysAlive() {
  // 1. Start heartbeat
  startHeartbeat();
  
  // 2. Set up keep-alive timeout
  resetKeepAliveTimeout();
  
  // 3. Create an interval that does nothing but keeps the event loop active
  setInterval(() => {
    if (isRunning) {
      // Do nothing, just keep the event loop busy
    }
  }, 10000);
  
  // 4. Create a promise that never resolves to keep the process alive
  new Promise(() => {
    // This promise intentionally never resolves
    // This keeps the Node.js event loop active
  });
}

// Start heartbeat interval
function startHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }
  
  log('info', 'Starting server heartbeat');
  
  // Log every 10 seconds that we're still alive
  heartbeatInterval = setInterval(() => {
    log('debug', 'IoEHub MCP Time Server is still running');
  }, 10000);
}

// Reset keep-alive timeout
function resetKeepAliveTimeout() {
  if (keepAliveTimeout) {
    clearTimeout(keepAliveTimeout);
  }
  
  // Set a long timeout to make sure we don't exit
  keepAliveTimeout = setTimeout(() => {
    log('debug', 'Keep-alive timeout renewed');
    resetKeepAliveTimeout(); // Self-renewing
  }, 3600000); // 1 hour
}

// Handle JSON-RPC messages
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
      sendRpcError(id, -32601, `Method '${method}' not found`);
  }
}

// Handle initialization request
function handleInitialize(id, params = {}) {
  log('info', `Initializing with protocol: ${params.protocolVersion || 'unknown'}`);
  log('info', `Client info: ${JSON.stringify(params.clientInfo || {})}`);
  
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
}

// Handle time request
function handleGetTime(id) {
  const now = Date.now();
  const timestamp = Math.floor(now / 1000);
  const date = new Date(now);
  
  log('debug', `Providing time: ${date.toISOString()}`);
  
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

// Handle shutdown request
function handleShutdown(id) {
  log('info', 'Shutdown requested, but server will remain running');
  
  // Tell the client we're shutting down, but actually stay alive
  sendRpcResponse(id, null);
}

// Send JSON-RPC response
function sendRpcResponse(id, result) {
  const response = {
    jsonrpc: '2.0',
    id,
    result
  };
  
  log('debug', `Sending response: ${JSON.stringify(response)}`);
  
  try {
    console.log(JSON.stringify(response));
  } catch (err) {
    log('error', `Failed to send response: ${err.message}`);
  }
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
  
  log('debug', `Sending error: ${JSON.stringify(response)}`);
  
  try {
    console.log(JSON.stringify(response));
  } catch (err) {
    log('error', `Failed to send error response: ${err.message}`);
  }
}

// Start the server
startServer();

// Write a marker to know if the process exited prematurely
process.on('beforeExit', () => {
  log('warn', 'Process is about to exit - this should never happen!');
});

// This final dummy timeout helps ensure the event loop stays active
setTimeout(() => {
  log('debug', 'Initial timeout completed');
}, 1000); 