@echo off
title IoEHub MCP Time Server
REM Echo messages to stderr instead of stdout
>&2 echo Starting IoEHub MCP Time Server...
>&2 echo.

REM Set the current directory to the script directory
CD /D "%~dp0"
>&2 echo Working directory set to: %CD%

REM Create the logs directory if it doesn't exist
if not exist "logs" mkdir logs
>&2 echo Log directory: %CD%\logs

REM Write startup information to a log file
echo Starting IoEHub MCP Time Server at %date% %time% > logs\startup.log
echo Working directory: %CD% >> logs\startup.log
echo NodeJS: %NODEJS_PATH% >> logs\startup.log

REM Get the current script directory to use absolute paths
SET SERVER_PATH=%CD%\ioehub-time.js
>&2 echo Server path: %SERVER_PATH%

REM Terminate any existing node.js processes that might be running our server
>&2 echo Checking for existing node.js processes...
FOR /F "tokens=1" %%i IN ('tasklist /FI "IMAGENAME eq node.exe" /NH') DO taskkill /F /IM %%i > NUL 2>&1
>&2 echo Existing processes terminated.

REM Start the server in the background using start command without outputting to stdout
>&2 echo Starting server in background mode...
start "IoEHub MCP Time Server" /B node "%SERVER_PATH%"

REM Leave a message for the user (on stderr)
>&2 echo.
>&2 echo Server started successfully in background mode.
>&2 echo Process will continue running even if this window is closed.
>&2 echo To stop the server, use Task Manager to terminate node.exe processes.
>&2 echo.
>&2 echo View logs in the logs directory: %CD%\logs
>&2 echo.
>&2 echo Press any key to close this window...
pause > nul 