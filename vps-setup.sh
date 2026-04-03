#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# VPS Initial Setup — run this ONCE on a fresh server
# Usage: bash vps-setup.sh
# Tested on: Ubuntu 22.04 / Debian 12
# ─────────────────────────────────────────────────────────────────────────────
set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
ok()   { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC}  $1"; }
fail() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

echo ""
echo "  Volume Spike Bot — VPS Setup"
echo "  ==============================="
echo ""

# ── 1. System update ────────────────────────────────────────────────────────
ok "Updating system packages..."
sudo apt-get update -qq && sudo apt-get upgrade -yq

# ── 2. Install Docker ────────────────────────────────────────────────────────
if command -v docker &>/dev/null; then
  ok "Docker already installed ($(docker --version))"
else
  ok "Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker "$USER"
  ok "Docker installed — you may need to log out and back in"
fi

# ── 3. Install Docker Compose plugin ────────────────────────────────────────
if docker compose version &>/dev/null; then
  ok "Docker Compose already available"
else
  ok "Installing Docker Compose plugin..."
  sudo apt-get install -yq docker-compose-plugin
fi

# ── 4. Create app directory ──────────────────────────────────────────────────
APP_DIR="$HOME/volume-spike-bot"
mkdir -p "$APP_DIR" "$APP_DIR/logs"
ok "App directory: $APP_DIR"

# ── 5. Write docker-compose.yml ─────────────────────────────────────────────
cat > "$APP_DIR/docker-compose.yml" << 'COMPOSE'
services:
  bot:
    image: ghcr.io/GITHUB_USER/volume-spike-bot:latest
    container_name: volume-spike-bot
    restart: unless-stopped
    ports:
      - "3001:3001"
    env_file:
      - .env
    environment:
      - NODE_ENV=production
    volumes:
      - ./logs:/app/logs
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "5"
COMPOSE
warn "Edit $APP_DIR/docker-compose.yml and replace GITHUB_USER with your GitHub username"

# ── 6. Write .env template ───────────────────────────────────────────────────
if [ ! -f "$APP_DIR/.env" ]; then
  cat > "$APP_DIR/.env" << 'ENV'
PORT=3001
NODE_ENV=production
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
ENV
  warn "Fill in $APP_DIR/.env with your Telegram credentials"
else
  ok ".env already exists — skipping"
fi

# ── 7. Open firewall port ────────────────────────────────────────────────────
if command -v ufw &>/dev/null; then
  sudo ufw allow 3001/tcp
  ok "Firewall: port 3001 opened"
fi

echo ""
echo "  ─────────────────────────────────────────"
echo "  Setup complete!"
echo ""
echo "  Next steps:"
echo "  1. Edit $APP_DIR/.env  (Telegram credentials)"
echo "  2. Edit $APP_DIR/docker-compose.yml (replace GITHUB_USER)"
echo "  3. Add these GitHub Secrets to your repo:"
echo "     VPS_HOST     → your server IP or domain"
echo "     VPS_USER     → $(whoami)"
echo "     VPS_SSH_KEY  → paste your private SSH key"
echo "     VPS_PORT     → 22 (or custom)"
echo "  4. Push to main branch — GitHub Actions will deploy automatically"
echo "  ─────────────────────────────────────────"
echo ""
