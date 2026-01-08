# 🔐 Solución: Clave Anon Key Incorrecta

## ✅ Diagnóstico

La `apikey` está en el build, pero sigue dando error 401. Esto significa que:
- ✅ Las variables SÍ están en el build
- ❌ La clave anon key es incorrecta o ha cambiado

---

## 🔍 Verificar Clave Anon Key en Supabase

### Paso 1: Ir a Supabase Dashboard

1. Abre: https://supabase.com/dashboard
2. Inicia sesión
3. Selecciona tu proyecto

### Paso 2: Obtener la Clave Correcta

1. Ve a **Settings** (⚙️) en el menú lateral
2. Haz clic en **"API"**
3. Busca la sección **"Project API keys"**
4. Busca la clave **"anon"** o **"anon public"**
5. Haz clic en el icono de **ojo** 👁️ para revelarla
6. **Copia la clave completa** (es muy larga)

### Paso 3: Comparar con EasyPanel

1. Ve a EasyPanel
2. Ve a las variables de entorno del frontend
3. Abre `VITE_SUPABASE_ANON_KEY`
4. **Compara** el valor con la clave que copiaste de Supabase
5. **Deben ser exactamente iguales** (sin espacios, sin saltos de línea)

---

## 🔧 Si la Clave es Diferente

Si la clave en Supabase es diferente a la que tienes en EasyPanel:

1. **Actualiza** `VITE_SUPABASE_ANON_KEY` en EasyPanel con la clave correcta
2. **Guarda** los cambios
3. **Haz REBUILD** del frontend (obligatorio)
4. **Espera** a que termine el build
5. **Prueba** de nuevo

---

## 🔍 Verificar en Network Tab

Después de actualizar y hacer rebuild:

1. Abre la app en producción
2. Abre DevTools → Network
3. Recarga la página
4. Haz clic en un request a Supabase
5. Ve a Headers
6. Compara el valor de `apikey` con la clave que copiaste de Supabase
7. **Deben ser exactamente iguales**

---

## 🐛 Si la Clave es Correcta pero Sigue Fallando

Si la clave es correcta pero sigue dando 401, puede ser:

### Opción 1: Problema con RLS

Aunque ejecutamos el script, puede haber un problema. Verifica:

```sql
-- Verificar políticas de users
SELECT * FROM pg_policies WHERE tablename = 'users' AND policyname LIKE '%Opalo ATS%';
```

### Opción 2: Clave Anon Key Deshabilitada

Verifica en Supabase que la clave anon key esté habilitada:
1. Ve a Settings → API
2. Verifica que la clave anon key esté activa

### Opción 3: Problema de CORS

Aunque es menos probable, verifica en Supabase:
1. Ve a Settings → API
2. Verifica que tu dominio esté en la lista de orígenes permitidos

---

## 📋 Checklist

- [ ] Clave anon key copiada de Supabase Dashboard
- [ ] Comparada con la de EasyPanel
- [ ] Actualizada en EasyPanel si es diferente
- [ ] Rebuild ejecutado después de actualizar
- [ ] Verificado en Network tab que la clave coincide
- [ ] Probado de nuevo

---

## 🎯 Resumen

**Problema**: La clave anon key en EasyPanel no coincide con la de Supabase

**Solución**: 
1. Copiar la clave correcta de Supabase
2. Actualizar en EasyPanel
3. Rebuild obligatorio

---

## 💡 Nota

La clave anon key puede cambiar si:
- Se regeneró en Supabase
- Se creó un nuevo proyecto
- Se cambió la configuración

Siempre verifica en Supabase Dashboard que tengas la clave más reciente.

