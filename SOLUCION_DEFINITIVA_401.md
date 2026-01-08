# 🔐 Solución Definitiva: Error 401 "Invalid API key"

## ❌ Problema

Después de:
- ✅ Configurar URLs en Supabase
- ✅ Reestablecer RLS
- ✅ Verificar que la clave anon key es correcta

Sigue dando error 401 "Invalid API key".

---

## 🎯 Solución: Regenerar Clave Anon Key

La clave anon key puede estar:
- Deshabilitada
- Revocada
- Con problemas de validación

**Solución**: Regenerarla.

---

## ✅ Pasos para Regenerar

### Paso 1: Regenerar en Supabase

1. Ve a Supabase Dashboard: https://supabase.com/dashboard
2. Selecciona tu proyecto
3. Ve a **Settings → API**
4. Busca **"Project API keys"**
5. Busca la clave **"anon"** o **"anon public"**
6. Haz clic en el **menú de tres puntos** (⋮) o **"Reset"**
7. Selecciona **"Reset"** o **"Regenerate"**
8. **Copia la nueva clave completa** (es muy larga)

### Paso 2: Actualizar en EasyPanel

1. Ve a EasyPanel → Frontend Opalo ATS
2. Ve a **Environment Variables**
3. Busca `VITE_SUPABASE_ANON_KEY`
4. **Actualiza** el valor con la nueva clave que copiaste
5. **Guarda** los cambios

### Paso 3: REBUILD OBLIGATORIO

1. Ve a **Deployments**
2. Haz clic en **"Redeploy"** o **"Rebuild"**
3. **Espera** a que termine completamente
4. Esto es **obligatorio** porque las variables `VITE_*` se inyectan durante el build

### Paso 4: Verificar

1. Abre la app en producción
2. Abre DevTools → Network
3. Haz clic en un request a Supabase
4. Ve a Headers → Request Headers
5. Verifica que el header `apikey` tenga la nueva clave
6. Prueba el login

---

## 🔍 Si Aún No Funciona

### Verificar Proyecto Correcto

1. En Supabase Dashboard, verifica que estés en el proyecto correcto
2. Verifica que la URL del proyecto sea: `afhiiplxqtodqxvmswor.supabase.co`
3. Si hay múltiples proyectos, asegúrate de estar en el correcto

### Verificar URL de Supabase

En el código del frontend, verifica que `VITE_SUPABASE_URL` sea:
```
https://afhiiplxqtodqxvmswor.supabase.co
```

---

## 📋 Checklist Completo

- [ ] Clave anon key regenerada en Supabase
- [ ] Nueva clave copiada completa
- [ ] Clave actualizada en EasyPanel
- [ ] Rebuild ejecutado
- [ ] Verificado en Network tab que la nueva clave está en el header
- [ ] Probado login en producción
- [ ] Verificado que es el proyecto correcto de Supabase

---

## 🎯 Resumen

**Problema**: La clave anon key puede estar deshabilitada o tener problemas.

**Solución**: 
1. Regenera la clave anon key en Supabase
2. Actualiza en EasyPanel
3. Rebuild obligatorio

Esto debería solucionar el problema definitivamente.

