# 🚀 Deploy de Opalo ATS en Servidor Nuevo

## 📋 Prerrequisitos

- ✅ Servidor VPS con Ubuntu/Debian
- ✅ Acceso SSH al servidor
- ✅ Dominio configurado (opcional pero recomendado)
- ✅ Node.js 20+ instalado
- ✅ Nginx o Caddy instalado

---

## 🔧 Paso 1: Preparar el Servidor

### 1.1. Conectarse al Servidor

```bash
ssh usuario@tu-servidor.com
```

### 1.2. Instalar Node.js (si no está instalado)

```bash
# Instalar Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verificar instalación
node --version  # Debe ser v20.x o superior
npm --version
```

### 1.3. Instalar PM2 (para gestionar procesos Node.js)

```bash
sudo npm install -g pm2
```

### 1.4. Instalar Nginx (si no está instalado)

```bash
sudo apt update
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

---

## 📥 Paso 2: Clonar el Repositorio

### 2.1. Crear Directorio de Trabajo

```bash
sudo mkdir -p /var/www/opalo-ats
sudo chown -R $USER:$USER /var/www/opalo-ats
cd /var/www/opalo-ats
```

### 2.2. Clonar Repositorio

```bash
git clone https://github.com/AlvaritoMP/Opalo-ATS.git .
```

O si prefieres SSH:
```bash
git clone git@github.com:AlvaritoMP/Opalo-ATS.git .
```

---

## 🔧 Paso 3: Configurar el Backend

### 3.1. Instalar Dependencias del Backend

```bash
cd /var/www/opalo-ats/Opalo-ATS/backend
npm ci --production
```

### 3.2. Crear Archivo `.env` del Backend

```bash
nano .env
```

Contenido:
```env
PORT=5000
NODE_ENV=production
GOOGLE_CLIENT_ID=tu_google_client_id
GOOGLE_CLIENT_SECRET=tu_google_client_secret
GOOGLE_REDIRECT_URI=https://api.tu-dominio.com/api/auth/google/callback
FRONTEND_URL=https://tu-dominio.com
```

**⚠️ IMPORTANTE**: Reemplaza `tu-dominio.com` con tu dominio real.

### 3.3. Iniciar Backend con PM2

```bash
cd /var/www/opalo-ats/Opalo-ATS/backend
pm2 start src/server.js --name opalo-ats-backend
pm2 save
pm2 startup
```

**Verificar que funciona**:
```bash
pm2 logs opalo-ats-backend
# Deberías ver: "🚀 Servidor backend corriendo..."
```

**Probar health check**:
```bash
curl http://localhost:5000/health
# Debería responder: {"status":"ok",...}
```

---

## 🎨 Paso 4: Configurar el Frontend

### 4.1. Instalar Dependencias del Frontend

```bash
cd /var/www/opalo-ats
npm ci
```

### 4.2. Build del Frontend

```bash
export VITE_SUPABASE_URL=https://afhiiplxqtodqxvmswor.supabase.co
export VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmaGlpcGx4cXRvZHF4dm1zd29yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4Njg4MTYsImV4cCI6MjA3ODQ0NDgxNn0.r9YmrHHajLsd5YHUkPnmD7UazpvmsW0TfqC5jy0_3ZU
export VITE_API_URL=https://api.tu-dominio.com

npm run build
```

**⚠️ IMPORTANTE**: Reemplaza `api.tu-dominio.com` con la URL real de tu backend.

Esto creará el directorio `dist/` con los archivos estáticos.

---

## 🌐 Paso 5: Configurar Nginx

### 5.1. Configuración para Frontend

```bash
sudo nano /etc/nginx/sites-available/opalo-ats
```

Contenido:
```nginx
# Frontend - Opalo ATS
server {
    listen 80;
    server_name tu-dominio.com www.tu-dominio.com;

    root /var/www/opalo-ats/dist;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript application/json;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Don't cache HTML
    location ~* \.html$ {
        expires -1;
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0";
    }

    # Handle client-side routing (React Router)
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### 5.2. Configuración para Backend (Proxy)

```bash
sudo nano /etc/nginx/sites-available/opalo-ats-backend
```

Contenido:
```nginx
# Backend - Opalo ATS API
server {
    listen 80;
    server_name api.tu-dominio.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 5.3. Habilitar Sitios

```bash
sudo ln -s /etc/nginx/sites-available/opalo-ats /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/opalo-ats-backend /etc/nginx/sites-enabled/
sudo nginx -t  # Verificar configuración
sudo systemctl reload nginx
```

---

## 🔒 Paso 6: Configurar SSL con Certbot

### 6.1. Instalar Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 6.2. Obtener Certificados SSL

```bash
sudo certbot --nginx -d tu-dominio.com -d www.tu-dominio.com
sudo certbot --nginx -d api.tu-dominio.com
```

Certbot configurará automáticamente HTTPS en Nginx.

---

## 🔐 Paso 7: Configurar Google Cloud Console

### 7.1. Agregar URLs de Producción

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Selecciona tu proyecto
3. Ve a **APIs & Services** → **Credentials**
4. Haz clic en tu **OAuth 2.0 Client ID**

### 7.2. Authorized JavaScript origins

Agrega:
```
https://tu-dominio.com
https://api.tu-dominio.com
```

### 7.3. Authorized redirect URIs

Agrega:
```
https://api.tu-dominio.com/api/auth/google/callback
```

---

## ✅ Paso 8: Verificación Final

### 8.1. Verificar Backend

```bash
curl https://api.tu-dominio.com/health
# Debería responder: {"status":"ok",...}
```

### 8.2. Verificar Frontend

Abre en el navegador:
```
https://tu-dominio.com
```

Debería cargar la aplicación.

### 8.3. Verificar Google Drive

1. Abre la app en producción
2. Inicia sesión
3. Ve a **Settings** → **Almacenamiento de Archivos**
4. Haz clic en **"Conectar con Google Drive"**
5. Debería funcionar correctamente

---

## 🔄 Paso 9: Actualizar Código (Futuro)

Cuando necesites actualizar la app:

```bash
cd /var/www/opalo-ats
git pull origin main

# Rebuild frontend
export VITE_SUPABASE_URL=https://afhiiplxqtodqxvmswor.supabase.co
export VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmaGlpcGx4cXRvZHF4dm1zd29yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4Njg4MTYsImV4cCI6MjA3ODQ0NDgxNn0.r9YmrHHajLsd5YHUkPnmD7UazpvmsW0TfqC5jy0_3ZU
export VITE_API_URL=https://api.tu-dominio.com
npm run build

# Reiniciar backend
cd Opalo-ATS/backend
pm2 restart opalo-ats-backend
```

---

## 🐛 Troubleshooting

### Backend no responde

```bash
# Ver logs
pm2 logs opalo-ats-backend

# Reiniciar
pm2 restart opalo-ats-backend

# Verificar que está corriendo
pm2 list
```

### Frontend no carga

```bash
# Verificar que dist/ existe
ls -la /var/www/opalo-ats/dist

# Verificar permisos
sudo chown -R www-data:www-data /var/www/opalo-ats/dist

# Ver logs de Nginx
sudo tail -f /var/log/nginx/error.log
```

### Error 502 Bad Gateway

```bash
# Verificar que el backend está corriendo
pm2 list

# Verificar que escucha en puerto 5000
sudo netstat -tlnp | grep 5000

# Verificar configuración de Nginx
sudo nginx -t
```

---

## 📝 Resumen de Comandos Importantes

```bash
# Ver estado de PM2
pm2 list
pm2 logs opalo-ats-backend

# Reiniciar servicios
pm2 restart opalo-ats-backend
sudo systemctl reload nginx

# Ver logs
pm2 logs opalo-ats-backend
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

---

## ✅ Checklist Final

- [ ] Node.js 20+ instalado
- [ ] PM2 instalado
- [ ] Nginx instalado y configurado
- [ ] Repositorio clonado
- [ ] Backend `.env` configurado
- [ ] Backend corriendo con PM2
- [ ] Frontend build ejecutado
- [ ] Nginx configurado para frontend y backend
- [ ] SSL configurado con Certbot
- [ ] Google Cloud Console actualizado
- [ ] Backend responde en `/health`
- [ ] Frontend carga correctamente
- [ ] Google Drive funciona en producción

---

## 🎯 Estructura Final del Servidor

```
/var/www/opalo-ats/
├── dist/                    # Frontend build (servido por Nginx)
├── Opalo-ATS/
│   ├── backend/
│   │   ├── src/
│   │   ├── .env            # Variables de entorno del backend
│   │   └── package.json
│   └── ...
└── ...
```

**Backend**: Corre en puerto 5000 (interno), accesible vía `api.tu-dominio.com`  
**Frontend**: Archivos estáticos en `dist/`, servidos por Nginx en `tu-dominio.com`

