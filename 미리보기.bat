@echo off
chcp 65001 >nul
title VCC 2026 로컬 미리보기 실행기
where node >nul 2>nul
if errorlevel 1 (
  echo [X] Node.js가 필요합니다. https://nodejs.org 에서 설치 후 다시 실행하세요.
  pause
  exit /b 1
)
echo 로컬 미리보기 서버를 시작하고 브라우저를 엽니다...
start "VCC 미리보기 서버 (닫으면 종료)" cmd /k node "%~dp0preview-server.js"
timeout /t 1 >nul
start "" http://localhost:8080/
echo.
echo 브라우저에서 http://localhost:8080/ 이 열립니다.
echo 서버를 끄려면 "VCC 미리보기 서버" 창을 닫으세요.
echo (영상 교체 후에는 브라우저에서 Ctrl+Shift+R 하드 새로고침)
timeout /t 3 >nul
