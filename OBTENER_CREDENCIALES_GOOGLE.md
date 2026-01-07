# 🔐 Cómo Obtener las Credenciales de Google OAuth

## ❓ Problema

El archivo `.env` **NO está en el repositorio** porque contiene credenciales sensibles y está en `.gitignore` por seguridad.

---

## ✅ Soluciones: Dónde Encontrar las Credenciales

### Opción 1: Obtener desde Google Cloud Console (Recomendado)

Si no tienes el archivo `.env` local, puedes obtener las credenciales directamente desde Google Cloud Console:

#### Paso 1: Acceder a Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Selecciona el proyecto donde está configurado "ATS Alfa Oro" o "ATS Pro"

#### Paso 2: Encontrar las Credenciales

1. Ve a **APIs & Services** → **Credentials**
2. Busca tu **OAuth 2.0 Client ID** (puede tener nombres como):
   - "ATS Pro Backend"
   - "ATS Alfa Oro Backend"
   - O cualquier nombre que hayas usado
3. Haz clic en el **Client ID** para ver los detalles
4. Verás:
   - **Client ID**: `123456789-abcdefg.apps.googleusercontent.com`
   - **Client Secret**: `GOCSPX-abcdefghijklmnopqrstuvwxyz` (haz clic en "Show" para verlo)

#### Paso 3: Copiar las Credenciales

Copia ambos valores y úsalos en el archivo `.env` de Opalo ATS.

---

### Opción 2: Buscar en el Servidor de Producción

Si Opalopy está desplegado en un servidor (como Easypanel, VPS, etc.), las credenciales pueden estar en:

1. **Variables de entorno del servidor**
2. **Panel de control del hosting** (Easypanel, Railway, etc.)
3. **Archivo `.env` en el servidor** (si tienes acceso SSH)

---

### Opción 3: Verificar Variables de Entorno del Sistema

Si ejecutaste Opalopy localmente antes, las credenciales pueden estar en variables de entorno del sistema:

**Windows PowerShell:**
```powershell
$env:GOOGLE_CLIENT_ID
$env:GOOGLE_CLIENT_SECRET
```

**Linux/Mac:**
```bash
echo $GOOGLE_CLIENT_ID
echo $GOOGLE_CLIENT_SECRET
```

---

### Opción 4: Crear Nuevas Credenciales (Si no encuentras las originales)

Si no puedes encontrar las credenciales originales, puedes crear nuevas en Google Cloud Console:

#### Paso 1: Crear Nuevas Credenciales OAuth 2.0

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Selecciona el proyecto (o crea uno nuevo)
3. Ve a **APIs & Services** → **Credentials**
4. Haz clic en **"+ Create Credentials"** → **"OAuth client ID"**
5. Si es la primera vez, configura la pantalla de consentimiento:
   - **App name**: "Opalo ATS" (o "ATS Alfa Oro")
   - **User support email**: Tu email
   - **Scopes**: Agrega:
     - `https://www.googleapis.com/auth/drive.file`
     - `https://www.googleapis.com/auth/drive.readonly`
     - `https://www.googleapis.com/auth/userinfo.email`
6. Tipo de aplicación: **Web application**
7. Nombre: "Opalo ATS Backend"
8. **Authorized redirect URIs**: 
   - `http://localhost:5000/api/auth/google/callback` (desarrollo)
   - Si tienes producción, agrega también: `https://tu-dominio.com/api/auth/google/callback`
9. Haz clic en **Create**
10. **Copia el Client ID y Client Secret**

#### Paso 2: Usar las Nuevas Credenciales

Usa estas credenciales en `Opalo-ATS/backend/.env`

**Nota**: Si creas nuevas credenciales, Opalo ATS y Opalopy tendrán credenciales diferentes, pero ambas funcionarán correctamente.

---

## 📝 Crear el Archivo .env para Opalo ATS

Una vez que tengas las credenciales (de cualquiera de las opciones anteriores), crea el archivo:

**Ubicación**: `Opalo-ATS/backend/.env`

**Contenido**:

```env
# Google OAuth2 Credentials
GOOGLE_CLIENT_ID=TU_CLIENT_ID_AQUI
GOOGLE_CLIENT_SECRET=TU_CLIENT_SECRET_AQUI

# Redirect URI para OAuth callback
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback

# Frontend URL (IMPORTANTE: puerto 3001 para Opalo ATS)
FRONTEND_URL=http://localhost:3001

# Puerto del servidor backend
PORT=5000

# Entorno
NODE_ENV=development
```

**Reemplaza**:
- `TU_CLIENT_ID_AQUI` con tu Client ID
- `TU_CLIENT_SECRET_AQUI` con tu Client Secret

---

## ✅ Verificar en Google Cloud Console

**IMPORTANTE**: Asegúrate de que el Redirect URI esté configurado:

1. Ve a Google Cloud Console → **APIs & Services** → **Credentials**
2. Haz clic en tu **OAuth 2.0 Client ID**
3. En **Authorized redirect URIs**, verifica que esté:
   - `http://localhost:5000/api/auth/google/callback` ✅
   - Si no está, agrégalo y guarda

---

## 🔍 Cómo Identificar el Proyecto Correcto en Google Cloud Console

Si tienes múltiples proyectos, busca el que tenga:

1. **Nombre del proyecto**: Puede ser "ATS Pro", "ATS Alfa Oro", "Opalopy", etc.
2. **OAuth Consent Screen**: 
   - Ve a **APIs & Services** → **OAuth consent screen**
   - Busca el que tenga "App name" como "ATS Pro" o "ATS Alfa Oro"
3. **APIs habilitadas**: 
   - Ve a **APIs & Services** → **Library**
   - Busca "Google Drive API" habilitada

---

## 🆘 Si No Encuentras las Credenciales

Si no puedes encontrar las credenciales originales:

1. **Opción A**: Crear nuevas credenciales (ver Opción 4 arriba)
2. **Opción B**: Si Opalopy está en producción, verifica el panel de control del hosting
3. **Opción C**: Si tienes acceso al servidor, busca el archivo `.env` en el servidor

---

## 📋 Checklist

- [ ] Accedí a Google Cloud Console
- [ ] Encontré el proyecto correcto
- [ ] Encontré las credenciales OAuth 2.0 (Client ID y Client Secret)
- [ ] Verifiqué que el Redirect URI `http://localhost:5000/api/auth/google/callback` esté configurado
- [ ] Creé el archivo `Opalo-ATS/backend/.env` con las credenciales
- [ ] Configuré `FRONTEND_URL=http://localhost:3001` (puerto 3001, no 3000)
- [ ] Reinicié el backend después de crear el `.env`

---

## 🎯 Recomendación

**La forma más fácil** es obtener las credenciales directamente desde Google Cloud Console (Opción 1), ya que:
- ✅ Siempre están disponibles
- ✅ No dependes de archivos locales
- ✅ Puedes verificar la configuración completa
- ✅ Puedes crear nuevas credenciales si es necesario

