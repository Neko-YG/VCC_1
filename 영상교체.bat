@echo off
title VCC 2026 Video Encoder
echo ============================================
echo   VCC 2026 Video Encoder
echo   Re-encodes source videos in video_src\ for web.
echo   (Korean guide: video_src\README.txt)
echo ============================================
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0encode-videos.ps1"
echo.
pause
