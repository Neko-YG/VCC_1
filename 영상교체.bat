@echo off
chcp 65001 >nul
title VCC 2026 영상 최적화 인코더
echo ============================================
echo   VCC 2026 영상 최적화 인코더
echo   video_src\ 폴더의 원본을 웹용으로 재인코딩합니다.
echo ============================================
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0encode-videos.ps1"
echo.
pause
