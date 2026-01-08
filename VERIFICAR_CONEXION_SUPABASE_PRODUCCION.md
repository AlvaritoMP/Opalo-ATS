# 🔍 Verificar Conexión a Supabase en Producción

## 🎯 Pregunta Clave

¿Cómo sabemos que la app en producción se está conectando a la base de datos correcta?

---

## ✅ Verificación de la Conexión

### Paso 1: Verificar URL de Supabase en el Código

La URL de Supabase está hardcodeada en el código:

**Archivo**: `lib/supabase.ts`

```typescript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
```

**Valor esperado**: `https://afhiiplxqtodqxvmswor.supabase.co`

Esta URL es la misma para localhost y producción.

---

## 🔍 Verificar en Network Tab

### Paso 1: Verificar URL del Request

1. Abre la app en producción
2. Abre DevTools → Network
3. Recarga la página
4. Busca un request a Supabase
5. Verifica que la URL sea:
   ```
   https://afhiiplxqtodqxvmswor.supabase.co/rest/v1/...
   ```

**Si la URL es diferente** → Ese es el problema.

**Si la URL es correcta** → El problema es otro (permisos, RLS, etc.)

---

## 🔍 Verificar Headers del Request

En Network tab, en un request a Supabase:

### Headers que Debe Tener:

1. **`apikey`**: Debe tener la clave anon key
2. **`Authorization`**: Puede tener `Bearer ...` o estar vacío
3. **`Origin`**: Debe ser `https://opalo-atsopalo.bouasv.easypanel.host`
4. **`Referer`**: Debe ser tu URL de producción

### Headers de Response:

1. **`Access-Control-Allow-Origin`**: Debe tener tu URL de producción
2. Si está vacío o es `*` → Problema de CORS
3. Si tiene otro valor → Problema de configuración

---

## 🐛 Posibles Problemas

### Problema 1: URL de Supabase Incorrecta

**Síntoma**: Los requests van a una URL diferente

**Solución**: Verifica que `VITE_SUPABASE_URL` en EasyPanel sea correcta

### Problema 2: CORS Bloqueando

**Síntoma**: `Access-Control-Allow-Origin` no tiene tu URL

**Solución**: Ya configuramos URLs en Supabase, pero verifica que se hayan guardado

### Problema 3: RLS Bloqueando con Rol Anon

**Síntoma**: URL correcta, apikey correcta, pero 401

**Solución**: Puede ser que las políticas RLS no permitan al rol `anon` acceder

---

## 🔧 Verificar Permisos del Rol Anon

Ejecuta en Supabase SQL Editor:

```sql
-- Verificar permisos del rol anon
SELECT 
    grantee,
    table_schema,
    table_name,
    privilege_type
FROM information_schema.role_table_grants
WHERE grantee = 'anon'
AND table_schema = 'public'
AND table_name IN ('users', 'processes', 'candidates')
ORDER BY table_name, privilege_type;
```

**Debe mostrar** permisos como `SELECT`, `INSERT`, `UPDATE`, `DELETE` para cada tabla.

**Si no hay permisos** → Ese es el problema.

---

## 🔧 Otorgar Permisos al Rol Anon (Si Faltan)

Si el rol `anon` no tiene permisos, ejecuta:

```sql
-- Otorgar permisos al rol anon
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.processes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidates TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attachments TO anon;
GRANT SELECT, INSERT ON public.candidate_history TO anon;
GRANT SELECT, INSERT, DELETE ON public.post_its TO anon;
GRANT SELECT, INSERT, DELETE ON public.comments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.interview_events TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.form_integrations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO anon;
```

---

## 📋 Checklist de Verificación

- [ ] URL de Supabase en Network tab es correcta
- [ ] Header `apikey` tiene valor
- [ ] Header `Origin` es tu URL de producción
- [ ] Response header `Access-Control-Allow-Origin` tiene tu URL
- [ ] Permisos del rol anon verificados
- [ ] Permisos otorgados si faltaban

---

## 🎯 Resumen

**Para verificar la conexión**:
1. Revisa Network tab → Verifica que la URL sea `afhiiplxqtodqxvmswor.supabase.co`
2. Verifica headers → `apikey`, `Origin`, `Access-Control-Allow-Origin`
3. Verifica permisos del rol anon → Debe tener SELECT, INSERT, UPDATE, DELETE

**Si todo está correcto pero sigue fallando**, puede ser un problema más profundo de configuración de Supabase.

