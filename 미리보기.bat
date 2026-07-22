@echo off
title VCC 2026 Local Preview
where node >nul 2>nul
if errorlevel 1 (
  echo [X] Node.js is required. Install from https://nodejs.org and retry.
  pause
  exit /b 1
)
echo Starting local preview server and opening browser...
start "VCC Preview Server (close this window to stop)" cmd /k node "%~dp0preview-server.js"
timeout /t 1 >nul
start "" http://localhost:8080/
echo.
echo Opened http://localhost:8080/ in your browser.
echo To stop: close the "VCC Preview Server" window.
echo After swapping videos: hard refresh with Ctrl+Shift+R.
timeout /t 4 >nul
