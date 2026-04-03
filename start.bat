@echo off
setlocal EnableDelayedExpansion
title Volume Spike Bot

echo.
echo  ==========================================
echo   Volume Spike Bot — Production Launcher
echo  ==========================================
echo.

REM ── Check Node.js ────────────────────────────────────────────
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] Node.js not found. Install from https://nodejs.org
    pause & exit /b 1
)
for /f "tokens=*" %%v in ('node -v') do set NODE_VER=%%v
echo  [OK] Node.js %NODE_VER%

REM ── Check .env ───────────────────────────────────────────────
if not exist "backend\.env" (
    echo  [WARN] backend\.env not found — copying from .env.example
    copy "backend\.env.example" "backend\.env" >nul
    echo  [!]  Edit backend\.env to configure Telegram before continuing.
    echo.
)

REM ── Install dependencies ──────────────────────────────────────
echo  [1/3] Installing dependencies...
call npm install --prefix backend --silent
call npm install --prefix frontend --silent
echo  [OK] Dependencies ready

REM ── Build frontend ────────────────────────────────────────────
echo  [2/3] Building frontend...
call npm run --prefix frontend build
if %errorlevel% neq 0 (
    echo  [ERROR] Frontend build failed.
    pause & exit /b 1
)
echo  [OK] Frontend built into backend\public

REM ── Start server ──────────────────────────────────────────────
echo  [3/3] Starting server...
echo.
echo  ==========================================
echo   App running at: http://localhost:3001
echo   Press Ctrl+C to stop
echo  ==========================================
echo.

set NODE_ENV=production
node backend\server.js
pause
