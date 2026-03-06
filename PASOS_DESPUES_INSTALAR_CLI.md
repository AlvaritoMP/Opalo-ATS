# 🚀 Pasos Después de Instalar Supabase CLI

## ✅ Paso 1: Verificar Instalación

Abre una **nueva terminal** (importante, cierra y abre una nueva) y ejecuta:

```powershell
supabase --version
```

Si ves la versión (ej: `supabase version 1.x.x`), continúa ✅

Si no funciona, revisa `INSTALAR_SUPABASE_CLI_WINDOWS.md`

---

## ✅ Paso 2: Login en Supabase

Ejecuta:

```powershell
supabase login
```

**Esto hará:**
1. Abrirá tu navegador automáticamente
2. Te pedirá que inicies sesión en Supabase
3. Autorizará el CLI

**Si no se abre el navegador:**
- Copia la URL que aparece en la terminal
- Pégalo en tu navegador
- Autoriza el acceso

---

## ✅ Paso 3: Inicializar Supabase (Solo la Primera Vez)

En la raíz de tu proyecto (donde está `package.json`), ejecuta:

```powershell
cd C:\Users\alvar\Opaloats
supabase init
```

**Esto creará:**
- Carpeta `supabase/` (si no existe)
- Archivos de configuración necesarios

**Si ya existe la carpeta `supabase/`**, puedes saltar este paso.

---

## ✅ Paso 4: Linkear con tu Proyecto

Ejecuta:

```powershell
supabase link --project-ref afhiiplxqtodqxvmswor
```

**Tu project-ref es:** `afhiiplxqtodqxvmswor`

**Si te pide password:**
- Ve a Supabase Dashboard → Settings → API
- Busca "Database Password" o "Project Password"
- Úsala cuando te la pida

**Resultado esperado:**
```
Linked to project afhiiplxqtodqxvmswor
```

---

## ✅ Paso 5: Verificar que la Función Existe

Verifica que el archivo existe:

```powershell
dir supabase\functions\tally-webhook\index.ts
```

Deberías ver el archivo. Si no existe, verifica que hiciste `git pull` para obtener los cambios.

---

## ✅ Paso 6: Desplegar la Edge Function

Ejecuta:

```powershell
supabase functions deploy tally-webhook
```

**Esto puede tardar 1-2 minutos** la primera vez.

**Resultado esperado:**
```
Deploying function tally-webhook...
Function tally-webhook deployed successfully
Function URL: https://afhiiplxqtodqxvmswor.supabase.co/functions/v1/tally-webhook
```

**⚠️ IMPORTANTE**: Anota la URL que aparece. La necesitarás.

---

## ✅ Paso 7: Verificar en Supabase Dashboard

1. Ve a: https://supabase.com/dashboard/project/afhiiplxqtodqxvmswor
2. En el menú lateral, haz clic en **"Edge Functions"**
3. Deberías ver `tally-webhook` en la lista
4. Haz clic en ella para ver detalles

---

## ✅ Paso 8: Actualizar Integraciones

### Opción A: Crear Nueva Integración

1. Ve al frontend de tu app
2. Crea una nueva integración de formulario
3. Ahora generará automáticamente la URL de Edge Function
4. Copia la URL completa (incluye el ID del webhook al final)

### Opción B: Actualizar Integración Existente

Ejecuta esta consulta en Supabase SQL Editor:

```sql
-- Ver integraciones actuales
SELECT id, form_name, webhook_url 
FROM form_integrations;

-- Actualizar a Edge Function (reemplaza TU_INTEGRATION_ID)
UPDATE form_integrations
SET webhook_url = 'https://afhiiplxqtodqxvmswor.supabase.co/functions/v1/tally-webhook/TU_WEBHOOK_ID'
WHERE id = 'TU_INTEGRATION_ID';
```

**⚠️ IMPORTANTE**: Reemplaza `TU_WEBHOOK_ID` con el ID real del webhook (el UUID que aparece en la URL actual).

---

## ✅ Paso 9: Configurar en Tally

1. Obtén la URL completa de la integración:
   ```
   https://afhiiplxqtodqxvmswor.supabase.co/functions/v1/tally-webhook/[id-del-webhook]
   ```

2. Ve a Tally → Settings → Integrations → Webhook

3. Pega la URL completa

4. Configura el evento: **"Form submission"**

5. Guarda los cambios

---

## ✅ Paso 10: Probar

1. Completa y envía un formulario desde Tally

2. Ve a Supabase Dashboard → Edge Functions → tally-webhook → **Logs**

3. Deberías ver logs como:
   ```
   📥 Webhook recibido de Tally - ID: ...
   ✅ Integración encontrada: ...
   ✅ Candidato creado: ...
   ```

4. Verifica en Supabase que se creó el candidato:
   ```sql
   SELECT * FROM candidates 
   WHERE created_at >= NOW() - INTERVAL '10 minutes'
   ORDER BY created_at DESC;
   ```

---

## 🎯 Resumen de Comandos

```powershell
# 1. Verificar instalación
supabase --version

# 2. Login
supabase login

# 3. Inicializar (solo primera vez)
supabase init

# 4. Linkear proyecto
supabase link --project-ref afhiiplxqtodqxvmswor

# 5. Desplegar función
supabase functions deploy tally-webhook

# 6. Ver logs
supabase functions logs tally-webhook
```

---

## 🐛 Si Hay Problemas

### "command not found"
- Cierra y abre una nueva terminal
- Verifica que esté en el PATH

### "Project not linked"
- Ejecuta: `supabase link --project-ref afhiiplxqtodqxvmswor`

### "Function not found"
- Verifica que el archivo existe: `dir supabase\functions\tally-webhook\index.ts`
- Si no existe, haz `git pull` para obtener los cambios

### Error al desplegar
- Verifica que estás logueado: `supabase login`
- Verifica que el proyecto está linkeado: `supabase link --project-ref afhiiplxqtodqxvmswor`
