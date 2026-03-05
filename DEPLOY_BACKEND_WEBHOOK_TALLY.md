# 🚀 Deploy del Backend con Webhook de Tally - Guía Simple

## ✅ Estado Actual

El código del backend **ya está actualizado** con:
- ✅ Endpoint de webhook (`/api/webhooks/tally/:webhookId`)
- ✅ Dependencia `@supabase/supabase-js` agregada
- ✅ Lógica de mapeo de campos de Tally a candidatos
- ✅ Logging detallado para debugging

## 📋 Pasos para Hacer Deploy

### Paso 1: Verificar que los Cambios Están en Git

Abre una terminal en la raíz del proyecto y ejecuta:

```bash
git status
```

Deberías ver cambios en:
- `Opalo-ATS/backend/src/routes/webhooks.js` (nuevo archivo)
- `Opalo-ATS/backend/src/server.js` (actualizado)
- `Opalo-ATS/backend/package.json` (actualizado)

### Paso 2: Hacer Commit y Push

```bash
# Agregar los cambios
git add Opalo-ATS/backend/

# Hacer commit
git commit -m "Agregar endpoint de webhook de Tally"

# Hacer push
git push origin main
```

### Paso 3: Configurar Variables de Entorno en Easypanel

**⚠️ IMPORTANTE**: Necesitas agregar estas variables de entorno al backend en Easypanel:

1. Ve a tu proyecto en **Easypanel**
2. Abre la app del **backend** (probablemente se llama `opalo-atsopalo-backend` o similar)
3. Ve a **"Environment Variables"** o **"Variables de Entorno"**
4. **Agrega estas variables** (si no las tienes):

```env
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_KEY=tu-service-role-key-aqui
```

**Cómo obtener el Service Key:**
1. Ve a tu proyecto en Supabase
2. Ve a **Settings** → **API**
3. Busca **"service_role" key** (⚠️ NUNCA lo expongas en el frontend)
4. Cópialo y pégalo en `SUPABASE_SERVICE_KEY`

**Variables que ya deberías tener:**
```env
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://tu-frontend-url.com
GOOGLE_CLIENT_ID=tu_google_client_id
GOOGLE_CLIENT_SECRET=tu_google_client_secret
GOOGLE_REDIRECT_URI=https://tu-backend-url.com/api/auth/google/callback
```

### Paso 4: Hacer Redeploy en Easypanel

1. En Easypanel, ve a tu app del backend
2. Haz clic en **"Redeploy"** o **"Rebuild"** o **"Deploy"**
3. Espera a que termine el build (puede tardar unos minutos)
4. Verifica los logs para asegurarte de que no hay errores

### Paso 5: Verificar que Funciona

1. **Probar el health check:**
   ```bash
   curl https://tu-backend-url.com/health
   ```
   Deberías ver:
   ```json
   {
     "status": "ok",
     "timestamp": "...",
     "service": "Opalo ATS Backend - Google Drive API"
   }
   ```

2. **Probar el endpoint de webhook** (debería dar 404 si no existe la integración, pero significa que el endpoint está funcionando):
   ```bash
   curl -X POST https://tu-backend-url.com/api/webhooks/tally/test-id \
     -H "Content-Type: application/json" \
     -d '{"test": "data"}'
   ```
   Deberías recibir una respuesta (aunque sea un error 404, significa que el endpoint está funcionando).

## 🔍 Verificar en los Logs

Después del deploy, revisa los logs del backend en Easypanel. Deberías ver:

```
🚀 Servidor backend corriendo en http://0.0.0.0:5000
📡 Frontend URL: https://...
✅ Backend listo para recibir peticiones
```

**NO deberías ver errores** relacionados con:
- `@supabase/supabase-js` no encontrado
- `Cannot find module './routes/webhooks'`
- Variables de entorno faltantes

## ✅ Checklist Final

- [ ] Cambios commiteados y pusheados a Git
- [ ] Variables `SUPABASE_URL` y `SUPABASE_SERVICE_KEY` configuradas en Easypanel
- [ ] Redeploy completado sin errores
- [ ] Health check funciona (`/health`)
- [ ] Endpoint de webhook responde (aunque sea con error 404)

## 🎯 Próximos Pasos

Una vez que el backend esté desplegado:

1. **Verifica la URL del webhook** en tu integración (debería ser algo como):
   ```
   https://tu-backend-url.com/api/webhooks/tally/[id-unico]
   ```

2. **Configura el webhook en Tally** con esa URL exacta

3. **Envía un formulario de prueba** desde Tally

4. **Revisa los logs del backend** para ver si llegó el webhook (busca mensajes que empiecen con `📥`)

5. **Verifica en Supabase** usando `VERIFICAR_WEBHOOK_TALLY.sql` para ver si se creó el candidato

## 🐛 Solución de Problemas

### Error: "Cannot find module '@supabase/supabase-js'"

**Solución**: El `package.json` ya tiene la dependencia, pero puede que necesites hacer un rebuild completo:
- En Easypanel, haz clic en **"Rebuild"** (no solo "Redeploy")
- O verifica que el `package.json` tenga `"@supabase/supabase-js": "^2.39.0"`

### Error: "SUPABASE_URL is not defined"

**Solución**: Agrega las variables de entorno en Easypanel:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`

### El endpoint no responde

**Solución**: 
- Verifica que el Root Directory en Easypanel sea `Opalo-ATS/backend` (o `backend` si está en la raíz)
- Verifica que el puerto sea `5000`
- Revisa los logs del backend para ver errores

## 📚 Documentación Relacionada

- `GUIA_VERIFICAR_WEBHOOK_TALLY.md` - Cómo verificar que funciona
- `VERIFICAR_WEBHOOK_TALLY.sql` - Scripts SQL para verificar en Supabase
- `GUIA_INTEGRACION_TALLY.md` - Guía completa de integración
