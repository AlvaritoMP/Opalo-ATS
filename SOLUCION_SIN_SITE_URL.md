# 🔍 Solución: No Existe Site URL en Supabase

## ❌ Problema

No encuentras el campo "Site URL" en Supabase Dashboard.

---

## ✅ Solución: Probar Deshabilitando RLS

Si no hay opción de CORS/Site URL, el problema más probable es **RLS (Row Level Security)** bloqueando las queries.

---

## 🔧 Paso 1: Deshabilitar RLS Temporalmente

1. Ve a Supabase SQL Editor
2. Ejecuta `PROBAR_DESHABILITAR_RLS_TEMPORALMENTE.sql`
3. Esto deshabilitará RLS en todas las tablas

### Paso 2: Probar la App

1. Abre la app en producción
2. Intenta iniciar sesión
3. **Si funciona** → El problema es RLS
4. **Si sigue fallando** → El problema es otro

---

## ✅ Si Funciona (Problema es RLS)

Si deshabilitar RLS soluciona el problema:

1. **Vuelve a habilitar RLS** ejecutando `REHABILITAR_RLS_DESPUES_DE_PRUEBA.sql`
2. **Crea políticas más permisivas** o verifica que las políticas existentes funcionen

---

## 🔍 Otras Ubicaciones de CORS en Supabase

Si tu versión de Supabase tiene CORS en otro lugar:

### Opción 1: Authentication Settings

1. Ve a **Settings → Authentication**
2. Busca **"Site URL"** o **"Redirect URLs"**
3. Agrega tu URL de producción

### Opción 2: Project Settings

1. Ve a **Project Settings** (icono de engranaje)
2. Busca **"API"** o **"Security"**
3. Busca opciones de CORS o URLs permitidas

### Opción 3: Database Settings

1. Ve a **Settings → Database**
2. Busca opciones de seguridad o CORS

---

## 🐛 Si Deshabilitar RLS NO Funciona

Si deshabilitar RLS no soluciona el problema, puede ser:

1. **Problema con la clave anon key**: Aunque dijiste que es igual, verifica de nuevo
2. **Problema con el proyecto**: Verifica que estés en el proyecto correcto
3. **Problema de red**: Algún firewall o proxy bloqueando

---

## 📋 Checklist

- [ ] RLS deshabilitado temporalmente
- [ ] App probada en producción
- [ ] Resultado: ¿Funciona o sigue fallando?
- [ ] Si funciona: RLS es el problema
- [ ] Si no funciona: Problema es otro

---

## 🎯 Próximo Paso

**Ejecuta el script de deshabilitar RLS** y prueba la app. Comparte el resultado:
- ✅ Funciona → Problema es RLS
- ❌ Sigue fallando → Problema es otro

Con ese resultado podré darte la solución exacta.

