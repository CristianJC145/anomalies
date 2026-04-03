@echo off
setlocal EnableDelayedExpansion
title Volume Spike Bot — Deploy

REM ─────────────────────────────────────────────────────────────────────
REM  Manual deploy: builds image locally and pushes to VPS via SSH/SCP
REM  Requirements: Docker Desktop, SSH client (comes with Windows 10+)
REM ─────────────────────────────────────────────────────────────────────

REM ── CONFIG — edit these ──────────────────────────────────────────────
set VPS_USER=root
set VPS_HOST=YOUR_VPS_IP
set VPS_PORT=22
set APP_DIR=~/volume-spike-bot
REM ────────────────────────────────────────────────────────────────────

echo.
echo  ======================================
echo   Volume Spike Bot — Manual Deploy
echo  ======================================
echo   Target: %VPS_USER%@%VPS_HOST%
echo.

REM ── Check Docker ─────────────────────────────────────────────────────
where docker >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] Docker not found. Install Docker Desktop.
    pause & exit /b 1
)

REM ── Build image ──────────────────────────────────────────────────────
echo  [1/4] Building Docker image...
docker build -t volume-spike-bot:latest .
if %errorlevel% neq 0 (
    echo  [ERROR] Docker build failed.
    pause & exit /b 1
)
echo  [OK] Image built

REM ── Save and transfer image ───────────────────────────────────────────
echo  [2/4] Transferring image to VPS...
docker save volume-spike-bot:latest | ssh -p %VPS_PORT% %VPS_USER%@%VPS_HOST% "docker load"
if %errorlevel% neq 0 (
    echo  [ERROR] Transfer failed. Check SSH credentials.
    pause & exit /b 1
)
echo  [OK] Image transferred

REM ── Transfer compose + env ────────────────────────────────────────────
echo  [3/4] Syncing config files...
scp -P %VPS_PORT% docker-compose.yml %VPS_USER%@%VPS_HOST%:%APP_DIR%/docker-compose.yml
REM .env only if not exists on VPS (don't overwrite secrets)
ssh -p %VPS_PORT% %VPS_USER%@%VPS_HOST% "test -f %APP_DIR%/.env || echo 'WARNING: .env missing on VPS!'"

REM ── Restart container ─────────────────────────────────────────────────
echo  [4/4] Restarting container on VPS...
ssh -p %VPS_PORT% %VPS_USER%@%VPS_HOST% "cd %APP_DIR% && docker compose up -d --no-build && docker image prune -f"
if %errorlevel% neq 0 (
    echo  [ERROR] Remote restart failed.
    pause & exit /b 1
)

echo.
echo  ======================================
echo   Deploy complete!
echo   App running at: http://%VPS_HOST%:3001
echo  ======================================
echo.
pause
