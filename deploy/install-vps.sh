#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> COUNTER_STRYKE — instalacion VPS"
echo "    Directorio: $ROOT"

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: Node.js no encontrado. Instala Node 20+ (nvm o apt)."
  exit 1
fi

NODE_VER="$(node -v | sed 's/v//' | cut -d. -f1)"
if [ "$NODE_VER" -lt 18 ]; then
  echo "ERROR: Se requiere Node.js 18+. Actual: $(node -v)"
  exit 1
fi

echo "==> Instalando dependencias..."
npm run install:all

if [ ! -f .env ] && [ -f .env.example ]; then
  cp .env.example .env
  echo "==> Creado .env desde .env.example (revisa los valores)"
fi

echo ""
echo "Listo. Opciones para arrancar:"
echo ""
echo "  A) Directo (prueba rapida):"
echo "     npm run start:prod"
echo "     Abre http://TU_IP:3001"
echo ""
echo "  B) PM2 (recomendado en VPS):"
echo "     npm install -g pm2"
echo "     pm2 start deploy/ecosystem.config.cjs"
echo "     pm2 save && pm2 startup"
echo ""
echo "  C) Docker:"
echo "     docker compose up -d --build"
echo ""
echo "  D) Nginx + HTTPS (produccion):"
echo "     Ver deploy/nginx.conf.example"
echo "     sudo certbot --nginx -d tu-dominio.com"
echo ""
