# 🔍 Cómo Ver Logs de Edge Function en Supabase

## 📋 Ver Logs desde el Dashboard

### Paso 1: Ir a Edge Functions

1. Ve a: https://supabase.com/dashboard/project/afhiiplxqtodqxvmswor
2. En el menú lateral izquierdo, haz clic en **"Edge Functions"**
3. Haz clic en **"tally-webhook"**

### Paso 2: Ver Logs

1. Haz clic en la pestaña **"Logs"** (o **"Invocation Logs"**)
2. Verás una lista de todas las invocaciones
3. Haz clic en una invocación para ver los logs detallados

### Paso 3: Ver Detalles de una Invocación

Cuando hagas clic en una invocación, verás:
- **Status**: Success, Error, etc.
- **Duration**: Cuánto tardó
- **Logs**: Todos los `console.log` que ejecutó la función
- **Request**: Los datos que recibió
- **Response**: La respuesta que envió

## 🔍 Qué Buscar en los Logs

### ✅ Si Funcionó Correctamente

Deberías ver logs como:
```
📥 Webhook recibido de Tally - ID: cdcb452f-...
📋 Datos recibidos: { ... }
🔍 Buscando integración con webhook_url: ...
✅ Integración encontrada: ...
✅ Proceso encontrado con X etapas
👤 Datos del candidato mapeados: ...
✅ Candidato creado: [id] - [nombre]
✅ Historial creado para candidato [id]
🎉 Webhook procesado exitosamente
```

### ❌ Si Hay Errores

Busca logs que empiecen con:
- `❌ Error buscando integración`
- `❌ Integración no encontrada`
- `❌ Error creando candidato`
- `❌ Proceso no encontrado`

## 📊 Ver Invocations

En la pestaña de **Invocations** verás:
- **Total invocations**: Cuántas veces se llamó
- **Success rate**: Porcentaje de éxito
- **Average duration**: Tiempo promedio
- **Lista de invocations**: Cada vez que se llamó

## 🔍 Si No Ves Logs

### Opción 1: Ver desde la Terminal

Ejecuta en tu terminal:

```powershell
supabase functions logs tally-webhook
```

Esto mostrará los logs en tiempo real.

### Opción 2: Ver Logs Recientes

```powershell
supabase functions logs tally-webhook --limit 50
```

## 🎯 Verificar Candidato Creado

Ejecuta esta consulta en Supabase SQL Editor:

```sql
-- Ver candidatos creados en las últimas 2 horas
SELECT 
    id,
    name,
    email,
    phone,
    process_id,
    source,
    created_at
FROM candidates
WHERE created_at >= NOW() - INTERVAL '2 hours'
ORDER BY created_at DESC;
```

Si ves candidatos con `source` = nombre de tu formulario o "Tally", se crearon correctamente.

## 🐛 Si Hay Invocations Pero No Se Crea el Candidato

1. **Haz clic en la invocación** para ver los logs detallados
2. **Busca errores** (líneas que empiezan con `❌`)
3. **Comparte los logs** para diagnosticar el problema

## 💡 Tip

Si ves muchas invocations pero no se crean candidatos:
- Revisa los logs de cada invocación
- Busca errores específicos
- Verifica que la integración exista en la base de datos
