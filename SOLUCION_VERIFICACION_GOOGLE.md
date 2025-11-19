# 🔧 Solución: Google Pide Verificación de la App

## 🔴 Problema

Google está pidiendo que verifiques tu app antes de poder usarla. Esto puede pasar por varias razones.

## ✅ Soluciones

### Opción 1: Agregar Usuarios de Prueba (Más Rápido)

Si la app está en modo "Testing" o necesita verificación, puedes agregar usuarios de prueba:

1. Ve a Google Cloud Console → **"Audience"**
2. Haz clic en **"+ Add users"**
3. Agrega tu email (y los emails de otros usuarios que necesiten acceso)
4. Estos usuarios podrán usar la app sin verificación

**Ventaja**: No necesitas verificar la app, solo agregar usuarios de prueba.

### Opción 2: Verificar la App con Google (Para Producción)

Si quieres que cualquier usuario pueda usar la app sin agregarlos manualmente:

1. Ve a Google Cloud Console → **"Verification Center"** o **"OAuth consent screen"**
2. Completa el proceso de verificación:
   - Información de la app
   - Scopes que solicitas
   - Política de privacidad
   - Términos de servicio
   - Video de demostración (si es necesario)
3. Google revisará tu app (puede tardar varios días)

**Ventaja**: Cualquier usuario podrá usar la app sin restricciones.

### Opción 3: Usar Scopes Menos Sensibles (Temporal)

Podemos reducir los scopes para evitar la verificación, pero esto limitará la funcionalidad.

---

## 🎯 Recomendación

**Para empezar, usa la Opción 1** (Agregar usuarios de prueba):
- ✅ Es más rápido
- ✅ No necesitas verificar la app
- ✅ Funciona inmediatamente
- ✅ Puedes agregar hasta 100 usuarios

Luego, cuando estés listo para producción, puedes verificar la app (Opción 2).

---

## 📝 Pasos para Agregar Usuarios de Prueba

1. Ve a Google Cloud Console
2. **"APIs & Services"** → **"OAuth consent screen"** → **"Audience"**
3. Haz clic en **"+ Add users"**
4. Agrega los emails de los usuarios que necesitan acceso
5. Guarda
6. Esos usuarios podrán autorizar Google Drive sin problemas

---

## ⚠️ Nota

Si la app está publicada pero Google sigue pidiendo verificación, puede ser porque:
- Los scopes que solicitas son sensibles
- Google detectó actividad inusual
- La app necesita información adicional

En estos casos, agregar usuarios de prueba es la solución más rápida.

