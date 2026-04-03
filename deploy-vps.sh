#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
#  Volume Spike Bot — VPS Deploy Script
#  Corre esto directamente en el VPS:
#
#    Primera vez:
#      git clone https://github.com/TU_USUARIO/TU_REPO.git ~/bot
#      cd ~/bot && bash deploy-vps.sh
#
#    Actualizar:
#      cd ~/bot && bash deploy-vps.sh
# ─────────────────────────────────────────────────────────────────────────────
set -e

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; CYAN='\033[0;36m'; NC='\033[0m'
step()  { echo -e "\n${CYAN}▶ $1${NC}"; }
ok()    { echo -e "${GREEN}  ✓ $1${NC}"; }
warn()  { echo -e "${YELLOW}  ! $1${NC}"; }
fail()  { echo -e "${RED}  ✗ $1${NC}"; exit 1; }

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_NAME="volume-spike-bot"

echo ""
echo -e "${CYAN}  ╔══════════════════════════════════╗"
echo -e "  ║   Volume Spike Bot — Deploy     ║"
echo -e "  ╚══════════════════════════════════╝${NC}"
echo -e "  Dir: ${APP_DIR}"
echo ""

# ── 1. Node.js ───────────────────────────────────────────────────────────────
step "Verificando Node.js..."
if ! command -v node &>/dev/null; then
  warn "Node.js no encontrado. Instalando via nvm..."
  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
  export NVM_DIR="$HOME/.nvm"
  # shellcheck disable=SC1091
  source "$NVM_DIR/nvm.sh"
  nvm install 20
  nvm use 20
  nvm alias default 20
else
  NODE_VER=$(node -v)
  ok "Node.js $NODE_VER"
fi

# Asegurar que nvm esté en PATH para esta sesión
if [ -f "$HOME/.nvm/nvm.sh" ]; then
  export NVM_DIR="$HOME/.nvm"
  source "$NVM_DIR/nvm.sh"
fi

# ── 2. PM2 ───────────────────────────────────────────────────────────────────
step "Verificando PM2..."
if ! command -v pm2 &>/dev/null; then
  warn "Instalando PM2..."
  npm install -g pm2
  ok "PM2 instalado"
else
  ok "PM2 $(pm2 -v)"
fi

# ── 3. Pull latest code ───────────────────────────────────────────────────────
step "Actualizando código..."
if git -C "$APP_DIR" rev-parse &>/dev/null; then
  git -C "$APP_DIR" pull --ff-only
  ok "Código actualizado ($(git -C "$APP_DIR" log -1 --format='%h %s'))"
else
  warn "No es un repo git — omitiendo pull"
fi

# ── 4. .env check ────────────────────────────────────────────────────────────
step "Verificando .env..."
ENV_FILE="$APP_DIR/backend/.env"
if [ ! -f "$ENV_FILE" ]; then
  cp "$APP_DIR/backend/.env.example" "$ENV_FILE"
  warn ".env creado desde .env.example"
  warn "Edita $ENV_FILE con tus credenciales de Telegram y vuelve a correr el script"
  echo ""
  echo -e "  ${YELLOW}nano $ENV_FILE${NC}"
  echo ""
  exit 0
fi
ok ".env presente"

# ── 5. Instalar dependencias ──────────────────────────────────────────────────
step "Instalando dependencias..."
npm install --prefix "$APP_DIR/backend"  --omit=dev --silent
npm install --prefix "$APP_DIR/frontend" --silent
ok "Dependencias listas"

# ── 6. Build frontend ─────────────────────────────────────────────────────────
step "Compilando frontend..."
npm run --prefix "$APP_DIR/frontend" build
ok "Frontend compilado en backend/public"

# ── 7. Crear directorio de logs ───────────────────────────────────────────────
mkdir -p "$APP_DIR/logs"

# ── 8. PM2 start / restart ───────────────────────────────────────────────────
step "Iniciando proceso con PM2..."
if pm2 describe "$APP_NAME" &>/dev/null; then
  pm2 reload "$APP_NAME" --update-env
  ok "Proceso reiniciado"
else
  pm2 start "$APP_DIR/backend/server.js" \
    --name "$APP_NAME" \
    --cwd  "$APP_DIR/backend" \
    --env  production \
    --log  "$APP_DIR/logs/out.log" \
    --output "$APP_DIR/logs/out.log" \
    --error  "$APP_DIR/logs/error.log" \
    --log-date-format "YYYY-MM-DD HH:mm:ss"
  ok "Proceso iniciado"
fi

# ── 9. Guardar PM2 para que arranque al reiniciar el servidor ─────────────────
pm2 save --force

# Configurar pm2 startup (solo si no está ya)
if ! systemctl is-enabled "pm2-$USER" &>/dev/null 2>&1; then
  warn "Configurando PM2 para arrancar al inicio del servidor..."
  env PATH="$PATH:$(which node | xargs dirname)" pm2 startup systemd -u "$USER" --hp "$HOME" || true
fi

# ── Resumen ───────────────────────────────────────────────────────────────────
PORT=$(grep -E '^PORT=' "$ENV_FILE" | cut -d= -f2 || echo 3001)
PORT=${PORT:-3001}

echo ""
echo -e "${GREEN}  ╔══════════════════════════════════════╗"
echo -e "  ║   Deploy completado con éxito  ✓    ║"
echo -e "  ╚══════════════════════════════════════╝${NC}"
echo ""
echo -e "  URL:      ${CYAN}http://$(curl -s ifconfig.me 2>/dev/null || echo 'TU_IP'):${PORT}${NC}"
echo -e "  Logs:     ${CYAN}pm2 logs ${APP_NAME}${NC}"
echo -e "  Status:   ${CYAN}pm2 status${NC}"
echo -e "  Restart:  ${CYAN}pm2 restart ${APP_NAME}${NC}"
echo -e "  Stop:     ${CYAN}pm2 stop ${APP_NAME}${NC}"
echo ""
