# 🔧 Cambiar Nombre de la App en Google Cloud Console

## 🎯 Problema

Cuando autorizas la app, Google muestra:
```
Go to ATS Pro (unsafe)
```

Esto es porque el nombre de la aplicación en Google Cloud Console todavía es "ATS Pro".

## ✅ Solución: Cambiar el Nombre a "Opalo ATS"

### Pasos:

1. **Ve a Google Cloud Console**
   - Abre: https://console.cloud.google.com/
   - Selecciona tu proyecto

2. **Ve a OAuth Consent Screen**
   - En el menú lateral, ve a **APIs & Services** → **OAuth consent screen**

3. **Edita el Nombre de la App**
   - En "App name", cambia de "ATS Pro" a **"Opalo ATS"**
   - Opcionalmente, puedes actualizar:
     - **User support email**: Tu email
     - **App logo**: Sube un logo si quieres
     - **Application home page**: URL de tu app
     - **Application privacy policy link**: Si tienes uno
     - **Application terms of service link**: Si tienes uno

4. **Guarda los Cambios**
   - Haz clic en **"Save and Continue"**
   - Completa los pasos siguientes (puedes hacer clic en "Back to Dashboard" si no quieres configurar más)

5. **Espera unos minutos**
   - Los cambios pueden tardar unos minutos en propagarse

---

## ⚠️ Nota sobre la Advertencia de Google

La advertencia **"Google hasn't verified this app"** es **normal y esperada** para apps en desarrollo.

### ¿Por qué aparece?

- La app está en modo **"Testing"** o **"Development"**
- Google requiere verificación para apps en producción que acceden a datos sensibles
- Para desarrollo, puedes continuar de forma segura

### ¿Es seguro continuar?

**Sí**, es completamente seguro porque:
- Es tu propia app
- Tú controlas el código
- Solo tú y los usuarios de prueba tienen acceso

### ¿Cómo quitar la advertencia?

Para producción, necesitaras:
1. **Verificar la app con Google** (proceso largo, requiere documentación)
2. O mantener la app en modo "Testing" (solo usuarios autorizados)

Para desarrollo, **no es necesario** verificar la app.

---

## 🎯 Resumen

1. **Cambiar nombre**: Google Cloud Console → OAuth consent screen → Cambiar "ATS Pro" a "Opalo ATS"
2. **Advertencia es normal**: No te preocupes, es esperado en desarrollo
3. **Puedes continuar**: Haz clic en "Continue" o "Go to Opalo ATS (unsafe)"

Después de cambiar el nombre, la próxima vez que autorices verás "Go to Opalo ATS (unsafe)" en lugar de "Go to ATS Pro (unsafe)".

