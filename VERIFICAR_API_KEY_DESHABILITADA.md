# 🔍 Verificar si la API Key Está Deshabilitada

## Posible Causa

Aunque la API key se está enviando correctamente, puede estar **deshabilitada** en Supabase.

---

## ✅ Verificación en Supabase

### Paso 1: Ir a Settings

1. Ve a tu proyecto en Supabase Dashboard
2. Ve a **Settings** (Configuración)
3. Haz clic en **API**

### Paso 2: Verificar Anon Key

1. Busca la sección **"Project API keys"**
2. Verifica el estado de la **anon key** (anon/public)
3. Debe estar **habilitada** (no deshabilitada)

### Paso 3: Si Está Deshabilitada

1. Haz clic en el botón para **habilitarla**
2. Guarda los cambios
3. Prueba la app de nuevo

---

## 🔍 Otra Verificación: Probar Query Directa

Ejecuta `PROBAR_POLITICAS_DIRECTAMENTE.sql` en Supabase SQL Editor para:

1. Ver las políticas creadas
2. Probar si funcionan como rol anon
3. Verificar si hay problemas con el formato de `app_name`

---

## 🎯 Si Nada Funciona

Si después de verificar todo sigue el error, puede ser un problema con:

1. **Caché del navegador**: Limpia caché y prueba en modo incógnito
2. **CORS**: Aunque las URLs están configuradas, puede haber un problema
3. **Proyecto incorrecto**: Verifica que estás usando el proyecto correcto de Supabase

---

## 📋 Checklist Final

- [ ] API key está habilitada en Supabase Settings > API
- [ ] Ejecutar `PROBAR_POLITICAS_DIRECTAMENTE.sql` para verificar políticas
- [ ] Verificar formato de `app_name` (sin espacios extra)
- [ ] Limpiar caché del navegador
- [ ] Probar en modo incógnito

