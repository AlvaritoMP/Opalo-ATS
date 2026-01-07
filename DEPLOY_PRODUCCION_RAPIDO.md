# 🚀 Deploy a Producción (Opalo ATS) — Guía Rápida

Esta guía asume:
- **Frontend**: Vite/React (build estático en `Opalo-ATS/dist`)
- **Backend**: Express (Google OAuth/Drive) en `Opalo-ATS/backend`
- **BD**: Supabase (el frontend usa `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`)

---

## 1) Variables de Entorno (Producción)

### Frontend (Vite) — en el build

Debes tener estas variables **al momento de ejecutar `npm run build`** (en EasyPanel/CI/VPS):

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_API_URL=https://TU_DOMINIO_BACKEND
```

> `VITE_API_URL` debe apuntar al **backend** (dominio o subdominio). Ejemplo: `https://api.opaloats.com`

### Backend (Express) — runtime

En el servidor, configura:

```env
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://TU_DOMINIO_FRONTEND

GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=https://TU_DOMINIO_BACKEND/api/auth/google/callback
```

Notas:
- En producción normalmente se usa **HTTPS** + proxy (Nginx/Caddy). El backend puede escuchar en `5000` interno.
- `FRONTEND_URL` se usa para CORS (y debe ser EXACTO, sin slash final).

---

## 2) Google Cloud Console (OAuth) — Producción

En tu OAuth Client ID:

### Authorized JavaScript origins

- `https://TU_DOMINIO_FRONTEND`

### Authorized redirect URIs

- `https://TU_DOMINIO_BACKEND/api/auth/google/callback`

> Si backend y frontend comparten dominio, igual es válido. Solo respeta rutas y HTTPS.

---

## 3) Deploy Opción A (EasyPanel / Docker)

Ya existe `Dockerfile`/configs en el repo. Flujo típico:

- **Frontend service**:
  - Build: `npm ci && npm run build`
  - Publicar `dist` con un servidor estático (EasyPanel Static / Nginx / Caddy).
  - Inyecta variables `VITE_*` en el build.

- **Backend service**:
  - Directorio: `Opalo-ATS/backend`
  - Start: `npm ci && npm run start`
  - Variables: `PORT`, `FRONTEND_URL`, `GOOGLE_*`, `NODE_ENV`

Proxy:
- `https://TU_DOMINIO_BACKEND` → backend (puerto interno `5000`)
- `https://TU_DOMINIO_FRONTEND` → estático (dist)

---

## 4) Deploy Opción B (VPS manual: PM2 + Nginx/Caddy)

### Backend (PM2)

```bash
cd /var/www/opalo-ats/backend
npm ci
pm2 start src/server.js --name opalo-ats-backend
pm2 save
pm2 startup
```

Configura el `.env` del backend (o variables del servicio) con los valores de la sección (1).

### Frontend (build estático)

```bash
cd /var/www/opalo-ats
npm ci
VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... VITE_API_URL=https://TU_DOMINIO_BACKEND npm run build
```

Publica el directorio `dist/` con Nginx/Caddy.

---

## 5) Checklist de Verificación (antes de tocar Google Drive)

### Backend

- `https://TU_DOMINIO_BACKEND/health` responde JSON `status: ok`

### Frontend

- Carga `https://TU_DOMINIO_FRONTEND`
- En consola, `VITE_API_URL` apunta a tu dominio de backend (no localhost)

### OAuth

- Botón **Conectar con Google Drive** abre popup
- Tras autorizar, vuelve a la app sin error `client_id`

---

## 6) Recomendación de dominios

Lo más limpio:
- **Frontend**: `https://opaloats.com`
- **Backend**: `https://api.opaloats.com`

Y en Google Cloud:
- Origin: `https://opaloats.com`
- Redirect: `https://api.opaloats.com/api/auth/google/callback`


