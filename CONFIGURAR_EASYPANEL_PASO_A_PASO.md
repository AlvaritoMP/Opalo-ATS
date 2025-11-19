# 🔧 Configurar Backend en Easypanel - Paso a Paso

## 📍 Configuración Actual

Veo que tienes **Nixpacks** seleccionado. Ahora necesitamos verificar y configurar:

---

## Paso 1: Buscar "Root Directory"

El campo **"Root Directory"** puede estar en otra sección. Busca:

1. **En la misma página de configuración**, scroll hacia abajo
2. O busca una sección llamada:
   - **"Source"** o **"Repository"**
   - **"General"** o **"Settings"**
   - **"Deploy"** o **"Build Settings"**

El campo debería verse algo así:
```
Root Directory: [backend]
```

**⚠️ IMPORTANTE**: Debe ser exactamente `backend` (sin barra, sin espacios)

---

## Paso 2: Configurar Comandos (Si los Campos Están Vacíos)

Si los campos están vacíos, Nixpacks debería usar el `nixpacks.toml` del backend. Pero si quieres asegurarte, puedes configurarlos manualmente:

### Install Command:
```
npm ci
```

### Build Command:
(Dejar vacío - no necesitamos build para el backend)

### Start Command:
```
sh -c 'node src/server.js & sleep 2 && caddy run --config /app/Caddyfile --adapter caddyfile'
```

O más simple (si Easypanel maneja Caddy automáticamente):
```
node src/server.js
```

---

## Paso 3: Verificar Variables de Entorno

1. Busca la sección **"Environment Variables"** o **"Variables de Entorno"**
2. Verifica que tengas:

```env
PORT=5000
FRONTEND_URL=https://opalo-atsalfaoro.bouasv.easypanel.host
GOOGLE_CLIENT_ID=tu_client_id
GOOGLE_CLIENT_SECRET=tu_client_secret
SESSION_SECRET=tu_secret_aleatorio
```

---

## Paso 4: Verificar Source/Repository

1. Busca la sección **"Source"** o **"Repository"**
2. Debe ser:
   ```
   https://github.com/AlvaritoMP/Opalopy.git
   ```
3. **Branch**: `main`
4. **Root Directory**: `backend` ⚠️ **MUY IMPORTANTE**

---

## ✅ Checklist

- [ ] **Nixpacks** seleccionado ✅ (ya lo tienes)
- [ ] **Root Directory** configurado como `backend`
- [ ] **Source/Repository**: `https://github.com/AlvaritoMP/Opalopy.git`
- [ ] **Branch**: `main`
- [ ] **Variables de entorno** configuradas
- [ ] **Start Command** configurado (o dejar que use `nixpacks.toml`)

---

## 🔍 Si No Encuentras "Root Directory"

Puede estar en:
1. La sección **"Source"** o **"Repository"**
2. Una sección separada llamada **"General Settings"**
3. O puede que necesites hacer scroll hacia abajo en la página actual

---

## 📝 Nota

Si no puedes encontrar el campo "Root Directory", es posible que Easypanel lo detecte automáticamente desde el `nixpacks.toml`. Pero es mejor configurarlo explícitamente para evitar problemas.

---

## 🆘 Si Sigue Sin Funcionar

1. **Toma una captura** de TODA la página de configuración (haz scroll completo)
2. O busca específicamente la sección donde está configurado el repositorio Git
3. El Root Directory debería estar cerca de donde está configurado el Source/Repository

