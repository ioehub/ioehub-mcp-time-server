#!/usr/bin/env node

const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all routes
app.use(cors());

// Middleware to parse JSON requests
app.use(express.json());

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
  res.send('IoEHub MCP Time Server is running');
});

// Start the server
app.listen(PORT, () => {
  console.log(`IoEHub MCP Time Server listening on port ${PORT}`);
}); 