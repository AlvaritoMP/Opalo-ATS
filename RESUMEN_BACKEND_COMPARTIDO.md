# ✅ Resumen: Backend Compartido para Opalopy y Opalo ATS

## 🎯 Respuesta: Usa el Mismo Backend

**Puedes usar el mismo backend** que ya tienes para Opalopy. No necesitas crear uno nuevo.

---

## ✅ ¿Por Qué Funciona?

1. **El backend solo maneja OAuth** - No tiene lógica de negocio específica
2. **Las apps están separadas por `app_name`** - Ya implementamos multi-tenancy
3. **Google Drive crea carpetas separadas** - Cada app tiene su propia carpeta raíz
4. **Más simple y eficiente** - Menos recursos, menos configuración

---

## 🔧 Cambios Realizados

### 1. Backend Actualizado para Múltiples Orígenes

He actualizado `Opalo-ATS/backend/src/server.js` para que acepte requests de:
- `http://localhost:3000` (Opalopy desarrollo)
- `http://localhost:3001` (Opalo ATS desarrollo)
- URLs de producción (configurables por variables de entorno)

### 2. Configuración de Variables de Entorno

En el backend compartido, puedes usar:

```env
PORT=5000

# Frontend principal (para redirecciones por defecto)
FRONTEND_URL=http://localhost:3000

# Frontends adicionales (opcional, para CORS)
FRONTEND_URL_OPALOPY=http://localhost:3000
FRONTEND_URL_OPALO_ATS=http://localhost:3001

# Google OAuth (compartido)
GOOGLE_CLIENT_ID=tu_client_id_aqui
GOOGLE_CLIENT_SECRET=tu_client_secret_aqui
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback
```

---

## 📋 Configuración para Desarrollo Local

### Opalopy

1. **Frontend**: Corre en `http://localhost:3000`
2. **Backend**: Usa `http://localhost:5000`
3. **Configuración**: Ya está configurado

### Opalo ATS

1. **Frontend**: Corre en `http://localhost:3001`
2. **Backend**: Usa el mismo `http://localhost:5000`
3. **Configuración**: 
   - Crea `Opalo-ATS/backend/.env` (ver `CREAR_ENV_MANUALMENTE.md`)
   - O simplemente usa el backend de Opalopy corriendo

---

## 🚀 Cómo Usar el Backend Compartido

### Opción A: Usar el Backend de Opalopy (Recomendado)

1. **Inicia el backend de Opalopy**:
   ```bash
   cd Opalopy/backend
   npm run dev
   ```

2. **Configura Opalo ATS para usar ese backend**:
   - En `Opalo-ATS/.env.local`, agrega:
     ```env
     VITE_API_URL=http://localhost:5000
     ```

3. **Inicia Opalo ATS**:
   ```bash
   cd Opalo-ATS
   npm run dev
   ```

### Opción B: Usar el Backend de Opalo ATS

1. **Actualiza CORS en el backend de Opalo ATS** (ya hecho)
2. **Inicia el backend de Opalo ATS**:
   ```bash
   cd Opalo-ATS/backend
   npm run dev
   ```

3. **Configura Opalopy para usar ese backend**:
   - En `Opalopy/.env.local`, agrega:
     ```env
     VITE_API_URL=http://localhost:5000
     ```

---

## 📝 Configuración del Frontend

### Opalo ATS

En `Opalo-ATS/.env.local`:

```env
VITE_API_URL=http://localhost:5000
```

El frontend ya está configurado para usar `VITE_API_URL` en `lib/googleDrive.ts`.

### Opalopy

Si quieres que Opalopy también use el backend compartido, en `Opalopy/.env.local`:

```env
VITE_API_URL=http://localhost:5000
```

---

## ✅ Checklist

- [x] Backend actualizado para aceptar múltiples orígenes (CORS)
- [ ] Archivo `.env` creado en `Opalo-ATS/backend/.env` (o usar el de Opalopy)
- [ ] Google Cloud Console actualizado con Redirect URI
- [ ] `VITE_API_URL=http://localhost:5000` configurado en `Opalo-ATS/.env.local`
- [ ] Backend corriendo (de Opalopy o Opalo ATS)
- [ ] Frontend de Opalo ATS corriendo en puerto 3001
- [ ] Probada conexión de Google Drive en Opalo ATS

---

## 🎯 Ventajas del Backend Compartido

- ✅ **Menos recursos** - Un solo servicio
- ✅ **Más simple** - Una sola configuración
- ✅ **Mantenimiento fácil** - Un solo lugar para actualizar
- ✅ **Mismas credenciales** - No necesitas duplicar OAuth

---

## 🔄 Si Necesitas Separar en el Futuro

Si en el futuro necesitas backends separados:

1. Crea un nuevo backend para Opalo ATS
2. Configura variables de entorno separadas
3. Actualiza Google Cloud Console con el nuevo Redirect URI
4. Actualiza `VITE_API_URL` en el frontend

Pero por ahora, **el backend compartido es la mejor opción**.

