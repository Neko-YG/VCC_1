@echo off
title VCC 2026 Control Panel Launcher
where node >nul 2>nul
if errorlevel 1 (
  echo [X] Node.js is required. Install from https://nodejs.org and retry.
  echo     See the Korean guide .txt in this folder.
  pause
  exit /b 1
)
echo Starting VCC 2026 control panel...
start "VCC Control Panel Server (close this window to stop)" cmd /k node "%~dp0control-server.js"
timeout /t 1 >nul
start "" http://localhost:8080/
echo.
echo A control panel opened at http://localhost:8080/ in your browser.
echo To stop: close the "VCC Control Panel Server" window.
timeout /t 4 >nul
