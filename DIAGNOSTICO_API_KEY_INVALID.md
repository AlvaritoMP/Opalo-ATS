# 🔍 Diagnóstico: Error "Invalid API key"

## ❌ Problema

Aunque las políticas RLS están creadas, sigue el error **"Invalid API key"**.

Este error puede tener varias causas:

---

## 🔍 Verificaciones Necesarias

### 1. Verificar Headers en Network Tab

1. Abre la app en producción
2. Presiona `F12` para abrir DevTools
3. Ve a la pestaña **Network**
4. Intenta hacer login o recargar la página
5. Busca una petición a `supabase.co/rest/v1/users`
6. Haz clic en la petición
7. Ve a la pestaña **Headers**

**Verifica:**
- ✅ Debe haber un header `apikey` con el valor de tu anon key
- ✅ Debe haber un header `Authorization` (puede estar vacío si no hay sesión)
- ✅ Debe haber un header `Origin: https://opalo-atsopalo.bouasv.easypanel.host`

**Si NO hay header `apikey`:**
- El problema es que la API key no se está enviando
- Necesitas reconstruir la app en EasyPanel

---

### 2. Verificar que la API Key Está en el Build

**En EasyPanel:**

1. Ve a tu app de Opalo ATS
2. Ve a **Environment Variables**
3. Verifica que `VITE_SUPABASE_ANON_KEY` esté configurada como **"Build-time"**
4. **NO** debe estar como "Runtime"

**Si está como "Runtime":**
- Cámbiala a "Build-time"
- Reconstruye la app

---

### 3. Verificar que la API Key No Está Deshabilitada

**En Supabase:**

1. Ve a **Settings > API**
2. Verifica que la **anon key** esté habilitada
3. Si está deshabilitada, habilítala

---

### 4. Verificar Caracteres Ocultos

**En EasyPanel:**

1. Copia la API key desde Supabase Dashboard
2. Elimina la variable `VITE_SUPABASE_ANON_KEY` en EasyPanel
3. Crea una nueva variable con el mismo nombre
4. Pega la API key (sin espacios al inicio o final)
5. Marca como **"Build-time"**
6. Reconstruye la app

---

### 5. Verificar que la API Key Es Correcta

**Compara carácter por carácter:**

1. Copia la anon key desde Supabase Dashboard
2. Copia la anon key desde EasyPanel
3. Compara ambas (deben ser idénticas)

**Si hay diferencias:**
- Actualiza en EasyPanel
- Reconstruye la app

---

## 🎯 Solución Más Probable

El problema más probable es que **la API key no se está enviando en los headers** o **no está en el build**.

### Pasos:

1. **Verifica los headers** en Network tab (Paso 1)
2. **Si no hay header `apikey`**: Reconstruye la app en EasyPanel
3. **Si hay header `apikey` pero está vacío o incorrecto**: Verifica la variable en EasyPanel

---

## 📋 Checklist

- [ ] Verificar headers en Network tab (debe haber `apikey`)
- [ ] Verificar que `VITE_SUPABASE_ANON_KEY` está como "Build-time" en EasyPanel
- [ ] Verificar que la API key no está deshabilitada en Supabase
- [ ] Verificar que no hay caracteres ocultos
- [ ] Reconstruir la app en EasyPanel después de cualquier cambio

---

## 🔧 Comando para Reconstruir

En EasyPanel:
1. Ve a tu app
2. Haz clic en **"Rebuild"** o **"Redeploy"**
3. Espera a que termine el build
4. Prueba de nuevo

