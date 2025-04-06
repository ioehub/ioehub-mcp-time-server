#!/usr/bin/env node

const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all routes
app.use(cors());

// Middleware to parse JSON requests
app.use(express.json());

// Optional: API Key Authentication (Commented out by default)
// Uncomment and set API_KEY environment variable to enable
/*
app.use((req, res, next) => {
  // Skip auth for the root path (health check)
  if (req.path === '/') {
    return next();
  }
  
  const apiKey = req.headers['x-api-key'];
  if (apiKey && apiKey === process.env.API_KEY) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized. API key required.' });
  }
});
*/

// Route to get current Unix timestamp
app.get('/time', (req, res) => {
  const timestamp = Math.floor(Date.now() / 1000); // Current Unix timestamp in seconds
  const date = new Date(timestamp * 1000);
  
  res.json({ 
    unix_time: timestamp,
    unix_ms: Date.now(),
    human_readable: date.toISOString(),
    formatted: date.toLocaleString(),
    utc: date.toUTCString(),
    date_only: date.toDateString(),
    time_only: date.toTimeString()
  });
});

// Simple health check endpoint
app.get('/', (req, res) => {
  res.send('MCP Time Server is running');
});

// Start the server
app.listen(PORT, () => {
  console.log(`MCP Time Server listening on port ${PORT}`);
}); 