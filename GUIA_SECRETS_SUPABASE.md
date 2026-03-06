# 🔐 Guía: Guardar Variables de Entorno (Secrets) en Supabase

## 📍 Dónde se Guardan

Los secrets de las Edge Functions se guardan en **Supabase Cloud** usando el **Supabase CLI**. NO se guardan en archivos locales.

## ✅ Método 1: Usando Supabase CLI (Recomendado)

### Paso 1: Asegúrate de estar vinculado

```bash
supabase link --project-ref afhiiplxqtodqxvmswor
```

### Paso 2: Guardar el Secret

```bash
supabase secrets set TALLY_WEBHOOK_SECRET=tu-signing-secret-aqui
```

**Ejemplo:**
```bash
supabase secrets set TALLY_WEBHOOK_SECRET=whsec_1234567890abcdef
```

### Paso 3: Verificar que se Guardó

```bash
supabase secrets list
```

Esto mostrará todos los secrets guardados (sin mostrar los valores por seguridad).

## ✅ Método 2: Desde el Dashboard (Alternativa)

1. Ve a **Supabase Dashboard** → Tu Proyecto
2. Ve a **Settings** → **Edge Functions**
3. Busca la sección de **"Secrets"** o **"Environment Variables"**
4. Agrega el secret:
   - **Name**: `TALLY_WEBHOOK_SECRET`
   - **Value**: Tu signing secret de Tally

**Nota**: No todos los dashboards de Supabase tienen esta opción. El método del CLI es más confiable.

## 🔍 Cómo Usar el Secret en la Edge Function

Una vez guardado, puedes acceder al secret en tu Edge Function usando:

```typescript
const tallySecret = Deno.env.get('TALLY_WEBHOOK_SECRET')
```

## 📋 Secrets Importantes para esta Integración

Para la integración de Tally, necesitas estos secrets:

1. **TALLY_WEBHOOK_SECRET** (opcional, para verificar firma):
   ```bash
   supabase secrets set TALLY_WEBHOOK_SECRET=tu-signing-secret-de-tally
   ```

2. **SUPABASE_URL** y **SUPABASE_SERVICE_ROLE_KEY** (ya están configurados automáticamente por Supabase)

## ⚠️ Importante

- Los secrets **NO** se guardan en archivos locales
- Los secrets **SÍ** se guardan en Supabase Cloud
- Los secrets son **seguros** y solo accesibles desde las Edge Functions
- Los valores de los secrets **NO** se muestran cuando haces `supabase secrets list` (por seguridad)

## 🔧 Comandos Útiles

```bash
# Listar todos los secrets (sin mostrar valores)
supabase secrets list

# Guardar un secret
supabase secrets set NOMBRE_SECRET=valor

# Eliminar un secret
supabase secrets unset NOMBRE_SECRET
```

## 📝 Ejemplo Completo

```bash
# 1. Vincular proyecto (si no lo has hecho)
supabase link --project-ref afhiiplxqtodqxvmswor

# 2. Guardar el signing secret de Tally
supabase secrets set TALLY_WEBHOOK_SECRET=whsec_1234567890abcdef

# 3. Verificar
supabase secrets list
```

¿Quieres que te ayude a guardar el signing secret de Tally?
