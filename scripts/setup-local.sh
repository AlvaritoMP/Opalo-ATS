#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "=== Opalo ATS - Preparar PC local ==="
echo ""

# Node.js
if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: Node.js no está instalado. Instala Node.js >= 20 desde https://nodejs.org"
  exit 1
fi

NODE_MAJOR="$(node -v | sed 's/v//' | cut -d. -f1)"
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "ERROR: Se requiere Node.js >= 20 (actual: $(node -v))"
  exit 1
fi

echo "Node.js $(node -v) | npm $(npm -v)"

# Git
if ! command -v git >/dev/null 2>&1; then
  echo "ERROR: Git no está instalado."
  exit 1
fi

if [ -z "$(git config user.name 2>/dev/null || true)" ] || [ -z "$(git config user.email 2>/dev/null || true)" ]; then
  echo ""
  echo "AVISO: Configura tu identidad de Git antes de hacer commits:"
  echo "  git config --global user.name \"Tu Nombre\""
  echo "  git config --global user.email \"tu@email.com\""
  echo ""
fi

# Dependencias
echo ""
echo "Instalando dependencias del frontend..."
npm install

echo ""
echo "Instalando dependencias del backend..."
npm install --prefix Opalo-ATS/backend

# Variables de entorno
echo ""
if [ ! -f .env.local ]; then
  cp .env.example .env.local
  echo "Creado .env.local desde .env.example"
  echo "  -> Completa VITE_SUPABASE_ANON_KEY y demás valores"
else
  echo ".env.local ya existe (no se sobrescribe)"
fi

if [ ! -f Opalo-ATS/backend/.env ]; then
  cp Opalo-ATS/backend/.env.example Opalo-ATS/backend/.env
  echo "Creado Opalo-ATS/backend/.env desde .env.example"
  echo "  -> Completa SUPABASE_SERVICE_KEY y credenciales de Google"
else
  echo "Opalo-ATS/backend/.env ya existe (no se sobrescribe)"
fi

echo ""
echo "=== Setup completado ==="
echo ""
echo "Siguiente paso: copia las credenciales desde tu PC del trabajo o Easypanel"
echo "  - Frontend: .env.local"
echo "  - Backend:  Opalo-ATS/backend/.env"
echo ""
echo "Para desarrollo, abre dos terminales:"
echo "  Terminal 1: npm run dev"
echo "  Terminal 2: npm run dev:backend"
echo ""
echo "Flujo de despliegue:"
echo "  git add . && git commit -m \"...\" && git push origin main"
echo "  (Easypanel redeploya automáticamente desde el repositorio)"
