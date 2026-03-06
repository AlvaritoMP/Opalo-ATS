# 🔧 Solución: Webhook Llega Pero No Se Ejecuta

## 🔴 Problema Detectado

- ✅ El webhook SÍ está llegando al backend (veo requests en los logs)
- ❌ Pero NO se ejecutan los `console.log` del webhook
- ❌ No se crean candidatos

**Esto significa que el código del webhook NO está desplegado o hay un error silencioso.**

## ✅ Solución: Verificar y Redesplegar

### Paso 1: Verificar que el Código Está en Git

Abre una terminal y ejecuta:

```bash
git status
```

Verifica que estos archivos estén en el repositorio:
- `Opalo-ATS/backend/src/routes/webhooks.js`
- `Opalo-ATS/backend/src/server.js` (con la línea `import webhookRoutes from './routes/webhooks.js'`)
- `Opalo-ATS/backend/package.json` (con `"@supabase/supabase-js": "^2.39.0"`)

### Paso 2: Hacer Commit y Push (Si Faltan Cambios)

Si hay cambios sin commitear:

```bash
git add Opalo-ATS/backend/
git commit -m "Agregar endpoint de webhook de Tally"
git push origin main
```

### Paso 3: Verificar Root Directory en Easypanel

1. Ve a Easypanel → Tu app del backend
2. Verifica que **Root Directory** sea: `Opalo-ATS/backend`
   - O si el backend está en la raíz: `backend`
3. Si está mal, cámbialo y haz redeploy

### Paso 4: Verificar que el Archivo Existe

En Easypanel, verifica en los logs del build que se instale `@supabase/supabase-js`:

Busca en los logs algo como:
```
npm ci
@supabase/supabase-js@2.39.0
```

Si NO ves esto, el `package.json` no tiene la dependencia o no se está instalando.

### Paso 5: Redesplegar el Backend

1. En Easypanel, ve a tu app del backend
2. Haz clic en **"Redeploy"** o **"Rebuild"**
3. Espera a que termine el build
4. Verifica los logs para asegurarte de que no hay errores

### Paso 6: Verificar Variables de Entorno

Asegúrate de que el backend tenga estas variables:

```env
SUPABASE_URL=https://afhiiplxqtodqxvmswor.supabase.co
SUPABASE_SERVICE_KEY=tu-service-key-aqui
```

**Si faltan estas variables, el webhook fallará silenciosamente.**

### Paso 7: Probar de Nuevo

1. Envía un formulario de prueba desde Tally
2. Revisa los logs del backend
3. Ahora DEBERÍAS ver:
   - `📥 Webhook recibido de Tally - ID: ...`
   - `📋 Datos recibidos: ...`
   - `✅ Integración encontrada: ...`
   - O algún error específico

## 🔍 Diagnóstico Adicional

### Si Aún No Funciona Después del Redeploy

Agrega este código temporal al inicio del archivo `webhooks.js` para forzar logs:

```javascript
router.post('/tally/:webhookId', async (req, res) => {
    // FORZAR LOG INMEDIATO
    console.log('🔴 WEBHOOK ENDPOINT LLAMADO');
    console.log('🔴 Params:', req.params);
    console.log('🔴 Body:', req.body);
    
    try {
        // ... resto del código
```

Esto te ayudará a verificar si el código se está ejecutando.

### Verificar que el Módulo se Carga

Agrega esto al inicio de `server.js`:

```javascript
console.log('🔴 Cargando webhookRoutes...');
import webhookRoutes from './routes/webhooks.js';
console.log('🔴 webhookRoutes cargado:', webhookRoutes);
```

## 📋 Checklist Completo

- [ ] El archivo `webhooks.js` existe en `Opalo-ATS/backend/src/routes/`
- [ ] El archivo `server.js` importa `webhookRoutes`
- [ ] El `package.json` tiene `@supabase/supabase-js`
- [ ] Los cambios están commiteados y pusheados
- [ ] El Root Directory en Easypanel es correcto
- [ ] Se hizo redeploy después de los cambios
- [ ] Las variables `SUPABASE_URL` y `SUPABASE_SERVICE_KEY` están configuradas
- [ ] Los logs muestran que se instaló `@supabase/supabase-js`

## 🎯 Próximos Pasos

1. **Verifica que el código esté en Git** (Paso 1)
2. **Haz redeploy del backend** (Paso 5)
3. **Envía un formulario de prueba** y revisa los logs
4. **Comparte los nuevos logs** para ver qué está pasando
