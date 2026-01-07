# 🔧 Solución: Puerto 5000 Ya Está en Uso

## 🔴 Error

```
Error: listen EADDRINUSE: address already in use 0.0.0.0:5000
```

Esto significa que **otro proceso** (probablemente el backend de Opalopy) ya está usando el puerto 5000.

---

## ✅ Solución: Usar el Backend Compartido (Recomendado)

Como acordamos usar el **mismo backend** para Opalopy y Opalo ATS, puedes usar el backend de Opalopy que ya está corriendo.

### Paso 1: Verificar que el Backend de Opalopy Funcione

1. **Abre en el navegador**: `http://localhost:5000/health`
2. **Deberías ver**:
   ```json
   {
     "status": "ok",
     "service": "ATS Pro Backend - Google Drive API"
   }
   ```

3. **Si funciona**, puedes usarlo para Opalo ATS también

### Paso 2: Verificar Credenciales en Opalopy

1. **Abre**: `Opalopy/backend/.env`
2. **Verifica que tenga**:
   ```env
GOOGLE_CLIENT_ID=tu_google_client_id
GOOGLE_CLIENT_SECRET=tu_google_client_secret
   GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback
   ```

3. **Si tiene las credenciales**, el backend compartido funcionará para Opalo ATS

### Paso 3: Verificar CORS en el Backend de Opalopy

El backend de Opalopy debe aceptar requests de `http://localhost:3001` (Opalo ATS).

**Si el backend de Opalopy ya tiene CORS configurado para múltiples orígenes**, debería funcionar.

**Si no**, necesitas actualizar `Opalopy/backend/src/server.js` para aceptar `http://localhost:3001`.

---

## 🔄 Alternativa: Terminar el Proceso y Usar Backend de Opalo ATS

Si prefieres usar el backend de Opalo ATS en lugar del compartido:

### Paso 1: Encontrar el Proceso

```powershell
# Ver qué proceso usa el puerto 5000
Get-NetTCPConnection -LocalPort 5000 | Select-Object OwningProcess
```

### Paso 2: Terminar el Proceso

```powershell
# Reemplaza PID con el número que veas
Stop-Process -Id PID -Force
```

### Paso 3: Iniciar Backend de Opalo ATS

```bash
cd Opalo-ATS\backend
npm run dev
```

---

## ✅ Recomendación

**Usa el backend compartido de Opalopy** porque:

1. ✅ Ya está corriendo y funcionando
2. ✅ Ya tiene las credenciales configuradas
3. ✅ Ya está configurado para Google Drive
4. ✅ Solo necesitas verificar que acepte requests de `http://localhost:3001`

---

## 🔍 Verificar que el Backend Compartido Funcione

1. **Abre**: `http://localhost:5000/health`
2. **Debería responder** con JSON

3. **Prueba la URL de autenticación**:
   - Abre: `http://localhost:5000/api/auth/google/drive`
   - Debería redirigir a Google (no mostrar error de client_id)

4. **Si funciona**, el backend compartido está listo para Opalo ATS

---

## 📝 Nota sobre CORS

Si el backend de Opalopy no acepta requests de `http://localhost:3001`, necesitas actualizar `Opalopy/backend/src/server.js` para incluir ese origen en CORS.

Pero primero, **prueba si funciona** tal como está. Muchos backends ya están configurados para aceptar cualquier origen en desarrollo.

---

## 🎯 Resumen

**Opción 1 (Recomendada)**: Usar el backend de Opalopy que ya está corriendo
- Verifica que `http://localhost:5000/health` funcione
- Prueba conectar Google Drive desde Opalo ATS

**Opción 2**: Terminar el proceso y usar backend de Opalo ATS
- Termina el proceso en puerto 5000
- Inicia el backend de Opalo ATS

