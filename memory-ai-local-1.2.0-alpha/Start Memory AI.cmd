@echo off
title Memory AI Local
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Install Node.js 22 or newer, then run this file again.
  pause
  exit /b 1
)
echo Starting Memory AI Local...
echo Your browser will open automatically. Keep this window open while using Memory AI.
node --no-warnings=ExperimentalWarning backend\server.js
if errorlevel 1 (
  echo.
  echo Memory AI failed to start. Please keep this window and check the message above.
  pause
)
