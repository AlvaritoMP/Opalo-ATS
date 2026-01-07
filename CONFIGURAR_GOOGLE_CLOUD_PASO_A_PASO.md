# 🔧 Configurar Google Cloud Console para Opalo ATS

## 🎯 Objetivo

Agregar el Redirect URI de Opalo ATS en Google Cloud Console para que Google Drive funcione.

---

## 📋 Pasos Detallados

### Paso 1: Acceder a Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. **Inicia sesión** con tu cuenta de Google
3. **Selecciona el proyecto** donde están las credenciales de Opalopy
   - Puede ser el proyecto donde está "ATS Alfa Oro" o "ATS Pro"

### Paso 2: Ir a Credenciales

1. En el menú lateral izquierdo, haz clic en **"APIs & Services"**
2. Haz clic en **"Credentials"** (Credenciales)

### Paso 3: Encontrar tu OAuth Client ID

1. Busca tu **OAuth 2.0 Client ID**
   - Puede llamarse "Web client 1" o "ATS Pro Backend" o similar
   - Es el mismo que usa Opalopy
2. **Haz clic** en el nombre del Client ID para editarlo

### Paso 4: Agregar Redirect URI

1. Desplázate hacia abajo hasta la sección **"Authorized redirect URIs"**
2. **Verifica** si ya está:
   - `http://localhost:5000/api/auth/google/callback` ✅
   
3. **Si NO está**, haz clic en **"+ ADD URI"** y agrega:
   ```
   http://localhost:5000/api/auth/google/callback
   ```

4. **IMPORTANTE**: 
   - Debe ser exactamente: `http://localhost:5000/api/auth/google/callback`
   - Con `http://` (no `https://`)
   - Sin barra al final
   - Con la ruta completa `/api/auth/google/callback`

### Paso 5: Guardar Cambios

1. Haz clic en **"SAVE"** (Guardar) en la parte inferior de la página
2. Espera a que se guarden los cambios (puede tomar unos segundos)

---

## ✅ Verificación

Después de guardar, deberías ver en "Authorized redirect URIs":

- ✅ `http://localhost:3000/api/auth/google/callback` (Opalopy - si existe)
- ✅ `http://localhost:5000/api/auth/google/callback` (Opalo ATS - NUEVO)
- ✅ `https://opalo-ats-backend.bouasv.easypanel.host/api/auth/google/callback` (Producción - si existe)

---

## 📸 Ubicación Visual

```
Google Cloud Console
└── APIs & Services
    └── Credentials
        └── OAuth 2.0 Client IDs
            └── [Tu Client ID] ← Haz clic aquí
                └── Authorized redirect URIs ← Agrega aquí
```

---

## ⚠️ Errores Comunes

### Error: "redirect_uri_mismatch"

**Causa**: El Redirect URI en Google Cloud Console no coincide exactamente con el que usa el backend.

**Solución**:
1. Verifica que sea exactamente: `http://localhost:5000/api/auth/google/callback`
2. Sin espacios al inicio o final
3. Con `http://` (no `https://` para desarrollo local)
4. Guarda los cambios

### No Veo la Opción "Authorized redirect URIs"

**Solución**:
1. Asegúrate de estar editando un **OAuth 2.0 Client ID** (tipo "Web application")
2. No confundas con "API Key" u otros tipos de credenciales

---

## 📝 Notas Importantes

1. **Puedes usar las mismas credenciales** que Opalopy (no necesitas crear nuevas)
2. **El Redirect URI debe coincidir exactamente** con el que está en `backend/.env`
3. **Para producción**, cuando subas Opalo ATS, necesitarás agregar otro Redirect URI con la URL de producción
4. **Los cambios se aplican inmediatamente** después de guardar

---

## ✅ Checklist

- [ ] Accedí a Google Cloud Console
- [ ] Seleccioné el proyecto correcto
- [ ] Fui a APIs & Services → Credentials
- [ ] Encontré mi OAuth 2.0 Client ID
- [ ] Agregué `http://localhost:5000/api/auth/google/callback` en "Authorized redirect URIs"
- [ ] Guardé los cambios
- [ ] Verifiqué que el Redirect URI esté en la lista

---

## 🎯 Después de Configurar

Una vez que hayas agregado el Redirect URI:

1. **Inicia el backend** (si no está corriendo):
   ```bash
   cd Opalo-ATS/backend
   npm run dev
   ```

2. **Abre Opalo ATS** en `http://localhost:3001`

3. **Ve a Settings** → **Almacenamiento de Archivos**

4. **Haz clic en "Conectar con Google Drive"**

5. **Debería funcionar** correctamente

---

## 🆘 Si Aún No Funciona

1. **Verifica que el Redirect URI sea exacto** (sin espacios, con `http://`)
2. **Verifica que hayas guardado** los cambios en Google Cloud Console
3. **Espera unos segundos** después de guardar (puede tomar tiempo en propagarse)
4. **Revisa la consola del navegador** (F12) para ver errores específicos

