# IoEHub MCP Time Server

A robust MCP (Model Context Protocol) Time Server that provides the current Unix timestamp. This server implements the MCP protocol to provide time information for AI models that don't have access to the current time.

## Features

- **Extreme Reliability**: Designed to stay running even when stdin/stdout connections are closed
- **Comprehensive Logging**: Logs to both stderr and file for troubleshooting
- **Self-Healing**: Resists termination attempts and maintains availability
- **Rich Time Information**: Provides time data in multiple formats
- **MCP Protocol Compliant**: Fully compatible with Claude, Cursor and other MCP clients

## Installation and Usage

There are several ways to start the server:

### Method 1: Using the batch file (Recommended for Windows)

```bash
start-mcp-server.bat
```

This will start the server in background mode, allowing it to run independently.

### Method 2: Direct node command

```bash
node ioehub-time.js
```

### Method 3: Using npm

```bash
npm install
npm start
```

## Protocol Support

This server implements the Model Context Protocol (MCP) and supports the following methods:

- `initialize`: Initialize the server with capabilities
- `getTime`: Get the current time in various formats
- `shutdown`: Gracefully shut down the server (server actually stays running)

## Time Response Format

The server provides time information in the following formats:

```json
{
  "unix_time": 1713258180,
  "unix_ms": 1713258180123,
  "human_readable": "2024-04-16T09:36:20.000Z",
  "formatted": "4/16/2024, 5:36:20 PM",
  "utc": "Tue, 16 Apr 2024 09:36:20 GMT",
  "date_only": "Tue Apr 16 2024",
  "time_only": "09:36:20 GMT+0000 (Coordinated Universal Time)"
}
```

## Logging

Logs are written to both stderr and to a log file in the `logs` directory. Each server instance creates a new log file with a timestamp, making it easy to troubleshoot issues.

## Integration with AI Platforms

### MCP Configuration

Add the time server to your MCP configuration using the following JSON format:

```json
{
  "mcpServers": {
    "IoEHubMcpTimeServer": {
      "command": "cmd",
      "args": [
        "/c",
        "C:\\path\\to\\your\\ioehub-mcp-time-server\\start-mcp-server.bat"
      ]
    }
  }
}
```

For Unix/Linux/macOS environments:

```json
{
  "mcpServers": {
    "IoEHubMcpTimeServer": {
      "command": "node",
      "args": [
        "/path/to/your/ioehub-mcp-time-server/ioehub-time.js"
      ]
    }
  }
}
```

### Using with Claude

Claude AI doesn't have direct access to the current time. To integrate the IoEHub MCP Time Server with Claude:

1. Set up the IoEHub MCP Time Server in your MCP configuration:

```json
{
  "mcpServers": {
    "IoEHubMcpTimeServer": {
      "command": "cmd",
      "args": [
        "/c",
        "C:\\path\\to\\your\\ioehub-mcp-time-server\\start-mcp-server.bat"
      ]
    }
  }
}
```

2. Claude will automatically gain access to the time server via the MCP protocol. You can access time information directly through function calls:

```
I need to get the current time.
```

### Using with Cursor

Cursor IDE can benefit from the IoEHub MCP Time Server when working with AI-assisted coding that requires timestamps:

1. Configure the IoEHub MCP Time Server in your project settings:

```json
{
  "mcpServers": {
    "IoEHubMcpTimeServer": {
      "command": "cmd",
      "args": [
        "/c",
        "C:\\path\\to\\your\\ioehub-mcp-time-server\\start-mcp-server.bat"
      ]
    }
  }
}
```

2. Cursor will automatically have access to the current time information through the MCP protocol.

## Troubleshooting

If you encounter issues:

1. Check the log files in the `logs` directory
2. Ensure no other Node.js processes are running that might conflict
3. Make sure your MCP configuration points to the correct file paths
