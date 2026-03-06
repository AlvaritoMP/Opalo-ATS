# 🚀 Guía Completa: Desplegar Edge Function en Supabase - Paso a Paso

## 📋 Paso 1: Instalar Supabase CLI

### Opción A: Con winget (Windows - Recomendado)

Abre PowerShell como Administrador y ejecuta:

```powershell
winget install --id=Supabase.CLI
```

### Opción B: Con npm (Si tienes Node.js)

```bash
npm install -g supabase
```

### Opción C: Descarga Manual

1. Ve a: https://github.com/supabase/cli/releases
2. Descarga la versión para Windows (`.exe`)
3. Colócala en una carpeta que esté en tu PATH

### Verificar Instalación

Abre una nueva terminal y ejecuta:

```bash
supabase --version
```

Deberías ver algo como: `supabase version 1.x.x`

## 📋 Paso 2: Login en Supabase

Ejecuta:

```bash
supabase login
```

Esto:
1. Abrirá tu navegador
2. Te pedirá que inicies sesión en Supabase
3. Autorizará el CLI para acceder a tus proyectos

**Si no se abre el navegador automáticamente:**
- Copia la URL que aparece en la terminal
- Pégalo en tu navegador
- Autoriza el acceso

## 📋 Paso 3: Inicializar Supabase en tu Proyecto

En la raíz de tu proyecto (donde está `package.json`), ejecuta:

```bash
supabase init
```

Esto creará una carpeta `supabase/` con la estructura necesaria.

**Si ya existe la carpeta `supabase/`**, puedes saltar este paso.

## 📋 Paso 4: Linkear con tu Proyecto de Supabase

Ejecuta:

```bash
supabase link --project-ref afhiiplxqtodqxvmswor
```

**¿Dónde encontrar el project-ref?**
- Ve a tu proyecto en Supabase Dashboard
- La URL será: `https://supabase.com/dashboard/project/afhiiplxqtodqxvmswor`
- El `afhiiplxqtodqxvmswor` es tu project-ref

**Si te pide un password:**
- Ve a Supabase Dashboard → Settings → API
- Busca "Database Password" o "Project Password"
- Úsala cuando te la pida

## 📋 Paso 5: Verificar que la Edge Function Existe

Verifica que el archivo existe:

```bash
# Windows PowerShell
dir supabase\functions\tally-webhook\index.ts

# O en Git Bash
ls supabase/functions/tally-webhook/index.ts
```

Deberías ver el archivo `index.ts`.

## 📋 Paso 6: Desplegar la Edge Function

Ejecuta:

```bash
supabase functions deploy tally-webhook
```

**Esto puede tardar unos minutos** la primera vez.

**Resultado esperado:**
```
Deploying function tally-webhook...
Function tally-webhook deployed successfully
Function URL: https://afhiiplxqtodqxvmswor.supabase.co/functions/v1/tally-webhook
```

**⚠️ IMPORTANTE**: Anota la URL que aparece. La necesitarás para configurar en Tally.

## 📋 Paso 7: Verificar que Funciona

### Opción A: Desde el Dashboard de Supabase

1. Ve a Supabase Dashboard: https://supabase.com/dashboard/project/afhiiplxqtodqxvmswor
2. En el menú lateral, haz clic en **"Edge Functions"**
3. Deberías ver `tally-webhook` en la lista
4. Haz clic en ella para ver detalles

### Opción B: Probar con curl

```bash
curl -X POST https://afhiiplxqtodqxvmswor.supabase.co/functions/v1/tally-webhook/test-id \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

Deberías recibir una respuesta (aunque sea un error 404, significa que la función está funcionando).

## 📋 Paso 8: Actualizar Integraciones Existentes

Si ya tienes integraciones creadas, necesitas actualizar sus URLs.

### Opción A: Actualizar desde SQL

Ejecuta esta consulta en Supabase SQL Editor:

```sql
-- Ver integraciones actuales
SELECT id, form_name, webhook_url 
FROM form_integrations;

-- Actualizar todas a Edge Function
UPDATE form_integrations
SET webhook_url = REPLACE(webhook_url, 
    'opalo-atsopalo-backend.bouasv.easypanel.host/api/webhooks/tally',
    'afhiiplxqtodqxvmswor.supabase.co/functions/v1/tally-webhook'
)
WHERE webhook_url LIKE '%opalo-atsopalo-backend%';
```

### Opción B: Crear Nueva Integración

1. Ve al frontend de tu app
2. Crea una nueva integración de formulario
3. Ahora generará automáticamente la URL de Edge Function
4. Copia la URL y úsala en Tally

## 📋 Paso 9: Configurar en Tally

1. Obtén la URL completa de la integración (debe incluir el ID del webhook al final):
   ```
   https://afhiiplxqtodqxvmswor.supabase.co/functions/v1/tally-webhook/[id-del-webhook]
   ```

2. Ve a Tally → Settings → Integrations → Webhook

3. Pega la URL completa

4. Configura el evento: **"Form submission"**

5. Guarda los cambios

## 📋 Paso 10: Probar

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

## 🐛 Solución de Problemas

### Error: "supabase: command not found"

**Solución**: 
- Verifica que Supabase CLI esté instalado: `supabase --version`
- Si no está instalado, instálalo con `winget install --id=Supabase.CLI`
- Cierra y abre una nueva terminal después de instalar

### Error: "Project not linked"

**Solución**:
```bash
supabase link --project-ref afhiiplxqtodqxvmswor
```

### Error: "Function not found"

**Solución**:
- Verifica que el archivo existe: `ls supabase/functions/tally-webhook/index.ts`
- Si no existe, verifica que hiciste `git pull` para obtener los cambios

### Error: "Permission denied"

**Solución**:
- Asegúrate de estar logueado: `supabase login`
- Verifica que tienes permisos en el proyecto de Supabase

### Error al desplegar

**Solución**:
- Verifica que estás en la raíz del proyecto (donde está `package.json`)
- Verifica que la carpeta `supabase/functions/tally-webhook/` existe
- Verifica que el archivo `index.ts` existe dentro de esa carpeta

## 📝 Comandos Rápidos de Referencia

```bash
# Instalar CLI
winget install --id=Supabase.CLI

# Login
supabase login

# Inicializar (solo la primera vez)
supabase init

# Linkear proyecto
supabase link --project-ref afhiiplxqtodqxvmswor

# Desplegar función
supabase functions deploy tally-webhook

# Ver logs
supabase functions logs tally-webhook

# Ver funciones desplegadas
supabase functions list
```

## ✅ Checklist Final

- [ ] Supabase CLI instalado (`supabase --version` funciona)
- [ ] Login exitoso (`supabase login`)
- [ ] Proyecto linkeado (`supabase link`)
- [ ] Edge Function desplegada (`supabase functions deploy`)
- [ ] URL de la función anotada
- [ ] Integraciones actualizadas (o nueva integración creada)
- [ ] Webhook configurado en Tally
- [ ] Formulario de prueba enviado
- [ ] Candidato creado en Supabase

## 🎯 Próximos Pasos

Una vez que todo esté funcionando:

1. **Elimina el código del backend de Easypanel** (opcional, ya no lo necesitas para webhooks)
2. **Mantén el backend solo para Google Drive OAuth** (si lo usas)
3. **Monitorea los logs** en Supabase Dashboard para ver que todo funciona
