# ✅ Estado Actual de Opalo ATS

## 🎯 Frontend

- ✅ **Corriendo**: `http://localhost:3002`
- ⚠️ **Puerto**: 3002 (no 3001, porque estaba ocupado)
- 📝 **Nota**: El puerto puede cambiar si 3001 está ocupado

---

## 📋 Checklist para Google Drive

### 1. Frontend ✅

- [x] Frontend corriendo
- [ ] `.env.local` en la raíz con `VITE_API_URL=http://localhost:5000`
- [ ] Frontend reiniciado después de agregar `VITE_API_URL`

### 2. Backend ⚠️

- [ ] Backend corriendo en puerto 5000
- [ ] Health check funciona: `http://localhost:5000/health`
- [ ] `backend/.env` configurado con credenciales de Google OAuth

### 3. Google Cloud Console ⚠️

- [ ] Redirect URI agregado: `http://localhost:5000/api/auth/google/callback`

---

## 🔧 Próximos Pasos

### Paso 1: Verificar/Crear `.env.local`

Abre `Opalo-ATS/.env.local` y asegúrate de que tenga:

```env
VITE_API_URL=http://localhost:5000
```

Si no existe, créalo con esa línea.

### Paso 2: Reiniciar el Frontend

Después de crear/editar `.env.local`:

1. Presiona `Ctrl+C` en la terminal donde corre el frontend
2. Ejecuta: `npm run dev`
3. Debería iniciar en el puerto 3001 o 3002

### Paso 3: Iniciar el Backend

En una **nueva terminal**:

```bash
cd Opalo-ATS/backend
npm run dev
```

Deberías ver:
```
🚀 Servidor backend corriendo en http://0.0.0.0:5000
✅ Backend listo para recibir peticiones
```

### Paso 4: Verificar Backend

Abre en el navegador: `http://localhost:5000/health`

Deberías ver:
```json
{
  "status": "ok",
  "timestamp": "...",
  "service": "Opalo ATS Backend - Google Drive API"
}
```

### Paso 5: Configurar Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. APIs & Services → Credentials
3. Edita tu OAuth Client ID
4. Agrega en "Authorized redirect URIs":
   - `http://localhost:5000/api/auth/google/callback`
5. Guarda

### Paso 6: Probar Google Drive

1. Abre `http://localhost:3002` (o el puerto que te muestre)
2. Inicia sesión
3. Ve a Settings → Almacenamiento de Archivos
4. Haz clic en "Conectar con Google Drive"
5. Debería funcionar

---

## 📝 Notas

- El frontend puede correr en puerto 3001, 3002, 3003, etc. (depende de qué puertos estén ocupados)
- El backend siempre debe correr en puerto 5000
- `VITE_API_URL` debe apuntar a `http://localhost:5000` (el backend)

---

## ✅ Resumen

1. ✅ Frontend corriendo (puerto 3002)
2. ⚠️ Verificar `.env.local` con `VITE_API_URL`
3. ⚠️ Iniciar backend en puerto 5000
4. ⚠️ Configurar Google Cloud Console
5. ⚠️ Probar conexión con Google Drive

