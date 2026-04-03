@echo off
title Volume Spike Bot — DEV

echo  [DEV] Starting backend on :3001 and frontend on :3000
echo.

start "Backend" cmd /k "cd backend && node server.js"
timeout /t 2 /nobreak >nul
start "Frontend" cmd /k "cd frontend && npm run dev"

echo  Backend:  http://localhost:3001
echo  Frontend: http://localhost:3000  (with hot-reload)
