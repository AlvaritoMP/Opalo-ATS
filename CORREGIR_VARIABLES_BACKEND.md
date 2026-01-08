# 🔧 Corregir Variables de Entorno del Backend

## ❌ Problema Detectado

Tu `GOOGLE_REDIRECT_URI` está **incompleto**. Le falta el path del callback.

---

## ✅ Corrección

### Variable Actual (Incorrecta)

```env
GOOGLE_REDIRECT_URI=https://opalo-atsopalo-backend.bouasv.easypanel.host
```

### Variable Correcta

```env
GOOGLE_REDIRECT_URI=https://opalo-atsopalo-backend.bouasv.easypanel.host/api/auth/google/callback
```

---

## 📋 Pasos para Corregir

### 1. Ir a EasyPanel

1. Abre EasyPanel
2. Ve al servicio **`opalo-ats-backend`** (o como lo hayas nombrado)

### 2. Actualizar Variable

1. Ve a **"Environment Variables"** o **"Variables de Entorno"**
2. Busca `GOOGLE_REDIRECT_URI`
3. Cambia el valor a:
   ```
   https://opalo-atsopalo-backend.bouasv.easypanel.host/api/auth/google/callback
   ```
4. Haz clic en **"Save"** o **"Guardar"**

### 3. Redeploy

1. Ve a **"Deployments"** o **"Despliegues"**
2. Haz clic en **"Redeploy"** o **"Rebuild"**
3. Espera a que termine

---

## ✅ Verificación

Después del redeploy:

1. Abre: `https://opalo-atsopalo-backend.bouasv.easypanel.host/health`
2. Deberías ver: `{"status":"ok",...}`

---

## 📝 Variables Completas del Backend

Después de corregir, tus variables deberían ser:

```env
PORT=5000
NODE_ENV=production
GOOGLE_CLIENT_ID=tu_google_client_id
GOOGLE_CLIENT_SECRET=tu_google_client_secret
GOOGLE_REDIRECT_URI=https://opalo-atsopalo-backend.bouasv.easypanel.host/api/auth/google/callback
FRONTEND_URL=https://opalo-atsopalo.bouasv.easypanel.host/
```

**Nota**: También puedes quitar el `/` final de `FRONTEND_URL` si quieres:
```
FRONTEND_URL=https://opalo-atsopalo.bouasv.easypanel.host
```

---

## 🔐 También Actualizar Google Cloud Console

Después de corregir `GOOGLE_REDIRECT_URI`, actualiza Google Cloud Console:

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. **APIs & Services** → **Credentials**
3. Tu **OAuth 2.0 Client ID**
4. En **"Authorized redirect URIs"**, asegúrate de tener:
   ```
   https://opalo-atsopalo-backend.bouasv.easypanel.host/api/auth/google/callback
   ```
5. Haz clic en **"Save"**

---

## ✅ Checklist

- [ ] `GOOGLE_REDIRECT_URI` corregido con path completo
- [ ] Variable guardada en EasyPanel
- [ ] Backend redeploy ejecutado
- [ ] Health check funciona
- [ ] Google Cloud Console actualizado

