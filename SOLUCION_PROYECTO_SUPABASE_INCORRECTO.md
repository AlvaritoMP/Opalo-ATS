# 🔍 Solución: Proyecto de Supabase Incorrecto

## 🎯 Posible Problema

Si la clave anon key es correcta pero sigue dando 401, puede ser que:
- Estés usando la clave de un proyecto diferente de Supabase
- El proyecto en Supabase Dashboard no sea el correcto
- Haya múltiples proyectos y estés mezclando las claves

---

## ✅ Verificación

### Paso 1: Verificar Proyecto en Supabase

1. Ve a Supabase Dashboard: https://supabase.com/dashboard
2. **Verifica qué proyecto está seleccionado**
3. Verifica que la URL del proyecto sea: `afhiiplxqtodqxvmswor.supabase.co`
4. Si hay múltiples proyectos, asegúrate de estar en el correcto

### Paso 2: Verificar Datos en el Proyecto

1. En Supabase Dashboard, ve a **Table Editor**
2. Verifica que veas las tablas: `users`, `processes`, `candidates`, etc.
3. Verifica que haya datos (al menos los de Opalopy)
4. Si no ves datos o tablas, estás en el proyecto incorrecto

### Paso 3: Verificar Clave Anon Key del Proyecto Correcto

1. En el proyecto correcto, ve a **Settings → API**
2. Copia la clave **anon** de **ESTE proyecto**
3. Compara con la que tienes en EasyPanel
4. **Deben ser exactamente iguales**

---

## 🔧 Si Estás en el Proyecto Incorrecto

1. **Selecciona el proyecto correcto** en Supabase Dashboard
2. **Copia la clave anon key** del proyecto correcto
3. **Actualiza** `VITE_SUPABASE_ANON_KEY` en EasyPanel
4. **Haz REBUILD** del frontend
5. **Prueba** de nuevo

---

## 🔍 Verificar URL del Proyecto

En Network tab, verifica que la URL del request sea:
```
https://afhiiplxqtodqxvmswor.supabase.co/rest/v1/...
```

Si la URL es diferente (por ejemplo, `xxxxx.supabase.co`), ese es el problema.

---

## 📋 Checklist

- [ ] Proyecto correcto seleccionado en Supabase Dashboard
- [ ] URL del proyecto es `afhiiplxqtodqxvmswor.supabase.co`
- [ ] Veo las tablas y datos en Table Editor
- [ ] Clave anon key copiada del proyecto correcto
- [ ] Comparada con la de EasyPanel
- [ ] Actualizada si es diferente
- [ ] Rebuild ejecutado

---

## 🎯 Resumen

**Problema posible**: Estás usando la clave anon key de un proyecto diferente de Supabase.

**Solución**: 
1. Verifica que estés en el proyecto correcto
2. Copia la clave anon key del proyecto correcto
3. Actualiza en EasyPanel
4. Rebuild

