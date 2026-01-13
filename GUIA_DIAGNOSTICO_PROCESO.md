# 🔍 Guía de Diagnóstico: Proceso No Aparece

## ⚠️ Nota Importante

El editor SQL de Supabase a veces tiene problemas ejecutando múltiples queries en un solo script. Por eso he creado scripts separados que debes ejecutar **uno por uno**.

---

## 📋 Pasos de Diagnóstico

### Paso 1: Verificar que el Proceso Existe

1. Ve a **Supabase Dashboard** > **SQL Editor**
2. Ejecuta el script: **`VERIFICAR_PROCESO_SIMPLE.sql`**

**Resultado esperado:**
- Debe mostrar el proceso con `app_name = 'Opalo ATS'`
- Si no aparece nada, el proceso no existe o tiene `app_name` incorrecto

**Si no aparece:**
- Ejecuta `VERIFICAR_PROCESOS_SIN_APP_NAME.sql` para ver todos los procesos
- Ejecuta `CORREGIR_APP_NAME_PROCESOS.sql` para corregir el `app_name`

---

### Paso 2: Verificar si Tiene Stages

1. Ejecuta el script: **`VERIFICAR_STAGES_PROCESO.sql`**

**Resultado esperado:**
- Debe mostrar el proceso con la cantidad de stages
- Si `cantidad_stages = 0`, el proceso no tiene stages

**Si no tiene stages:**
- Esto es normal, el proceso debería cargarse igual
- Puedes agregar stages editando el proceso desde la aplicación

---

### Paso 3: Verificar Políticas RLS

1. Ejecuta el script: **`VERIFICAR_RLS_PROCESSES.sql`**

**Resultado esperado:**
- Debe mostrar políticas para SELECT, INSERT, UPDATE, DELETE
- Todas deben tener `app_name = 'Opalo ATS'` en la condición

**Si no hay políticas o están incorrectas:**
- Ejecuta `CREAR_POLITICAS_SOLO_ANON_SEGURO.sql` para crear las políticas

---

### Paso 4: Probar la Query Exacta de la App

1. Ejecuta el script: **`TEST_QUERY_APP.sql`**

**Resultado esperado:**
- Debe retornar el proceso con todos sus campos
- Si esta query funciona pero la app no carga, el problema está en:
  - Las queries de stages/document_categories
  - El código de la aplicación
  - Las políticas RLS en stages/document_categories

---

## 🔍 Verificar en la Consola del Navegador

1. Abre la aplicación en el navegador
2. Abre la consola (F12 → Console)
3. Busca estos mensajes:

**Si hay errores:**
```
❌ Failed to load processes from Supabase: [error]
⚠️ Error cargando stages, continuando sin stages: [error]
⚠️ Error cargando document_categories, continuando sin categorías: [error]
```

**Si no hay errores pero no aparece:**
```
✓ Loaded processes from Supabase
```
Pero la lista está vacía.

---

## 🔧 Soluciones Comunes

### Solución 1: El Proceso No Tiene app_name Correcto

Si el proceso tiene `app_name` diferente de 'Opalo ATS':

1. Ejecuta `CORREGIR_APP_NAME_PROCESOS.sql`
2. Recarga la aplicación

### Solución 2: Faltan Políticas RLS

Si no hay políticas RLS o están incorrectas:

1. Ejecuta `CREAR_POLITICAS_SOLO_ANON_SEGURO.sql`
2. Recarga la aplicación

### Solución 3: Error en Queries de Relaciones

Si la query principal funciona pero las de stages/document_categories fallan:

1. El código actualizado debería manejar esto automáticamente
2. Verifica la consola para ver qué query está fallando
3. Verifica las políticas RLS en `stages` y `document_categories`

---

## 📋 Checklist Completo

- [ ] Ejecutar `VERIFICAR_PROCESO_SIMPLE.sql` - ¿Aparece el proceso?
- [ ] Ejecutar `VERIFICAR_STAGES_PROCESO.sql` - ¿Tiene stages?
- [ ] Ejecutar `VERIFICAR_RLS_PROCESSES.sql` - ¿Hay políticas RLS?
- [ ] Ejecutar `TEST_QUERY_APP.sql` - ¿La query funciona?
- [ ] Verificar consola del navegador - ¿Hay errores?
- [ ] Recargar aplicación (hard refresh: Ctrl+Shift+R)
- [ ] Verificar que el proceso aparece en la lista

---

## 🆘 Si Aún No Funciona

Comparte:
1. Los resultados de cada script SQL
2. Los errores de la consola del navegador
3. Si la query `TEST_QUERY_APP.sql` retorna el proceso

Con esta información podré diagnosticar el problema específico.
