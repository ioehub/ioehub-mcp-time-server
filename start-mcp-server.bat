@echo off
title IoEHub MCP Time Server
REM Echo messages to stderr instead of stdout
>&2 echo Starting IoEHub MCP Time Server...
>&2 echo.

REM Create the logs directory if it doesn't exist
if not exist "logs" mkdir logs

REM Write startup information to a log file
echo Starting IoEHub MCP Time Server at %date% %time% > logs\startup.log
echo NodeJS: %NODEJS_PATH% >> logs\startup.log

REM Start the server in the background using start command without outputting to stdout
start "IoEHub MCP Time Server" /B node ioehub-time.js

REM Leave a message for the user (on stderr)
>&2 echo Server started successfully in background mode.
>&2 echo Process will continue running even if this window is closed.
>&2 echo To stop the server, use Task Manager to terminate node.exe processes.
>&2 echo.
>&2 echo View logs in the logs directory.
>&2 echo.
>&2 echo Press any key to close this window...
pause > nul 