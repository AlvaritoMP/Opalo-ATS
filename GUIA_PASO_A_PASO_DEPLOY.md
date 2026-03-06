# 🚀 Guía Paso a Paso: Deploy desde tu Computadora a Supabase

## 🎯 Cómo Funciona el Proceso

```
Tu Computadora → Supabase CLI → Supabase Cloud
     ↓                ↓                ↓
  Tienes el      Autenticado      Código subido
  código aquí    con tu cuenta    y funcionando
```

## 📋 Paso 1: Instalar Supabase CLI en tu Computadora

### Opción A: Con winget (Recomendado)

1. Abre PowerShell como Administrador:
   - Presiona `Windows + X`
   - Selecciona "Windows PowerShell (Administrador)"

2. Ejecuta:
   ```powershell
   winget install --id=Supabase.CLI
   ```

3. Cuando te pregunte, escribe `Y` y presiona Enter

4. Cierra y abre una nueva terminal

5. Verifica:
   ```powershell
   supabase --version
   ```
   Deberías ver: `supabase version 1.x.x`

### Opción B: Descarga Manual

1. Ve a: https://github.com/supabase/cli/releases
2. Descarga: `supabase_x.x.x_windows_amd64.zip`
3. Extrae el ZIP
4. Copia `supabase.exe` a `C:\Windows\System32\`
5. Cierra y abre una nueva terminal
6. Verifica: `supabase --version`

---

## 📋 Paso 2: Login en Supabase (Autenticarte)

Ejecuta en tu terminal:

```powershell
supabase login
```

**Esto hará:**

1. Abrirá tu navegador automáticamente
2. Te pedirá que inicies sesión en Supabase (si no estás logueado)
3. Te pedirá autorizar el CLI
4. Verás un mensaje de éxito en la terminal

**Resultado esperado:**
```
✓ Logged in as: tu-email@ejemplo.com
```

**Si no se abre el navegador:**
- Copia la URL que aparece en la terminal
- Pégalo en tu navegador
- Autoriza el acceso

**✅ Ahora tu computadora está autenticada con Supabase**

---

## 📋 Paso 3: Linkear con tu Proyecto

Ejecuta:

```powershell
supabase link --project-ref afhiiplxqtodqxvmswor
```

**¿Qué hace esto?**
- Conecta tu computadora con tu proyecto de Supabase
- Te permite desplegar funciones a ese proyecto específico
- Solo necesitas hacerlo una vez

**Resultado esperado:**
```
✓ Linked to project afhiiplxqtodqxvmswor
```

**Si te pide password:**
- Ve a Supabase Dashboard → Settings → API
- Busca "Database Password"
- Úsala cuando te la pida

**✅ Ahora tu computadora está conectada a tu proyecto**

---

## 📋 Paso 4: Verificar que el Código Existe

Verifica que el archivo de la función existe:

```powershell
dir supabase\functions\tally-webhook\index.ts
```

Deberías ver el archivo. Si no existe:
- Verifica que hiciste `git pull` para obtener los cambios
- O verifica que estás en la carpeta correcta del proyecto

---

## 📋 Paso 5: Desplegar la Función (Subir a Supabase)

Ejecuta:

```powershell
supabase functions deploy tally-webhook
```

**¿Qué hace esto?**

1. Lee el archivo `supabase/functions/tally-webhook/index.ts`
2. Lo compila y prepara
3. Lo sube a Supabase Cloud
4. Supabase lo despliega en sus servidores
5. Te da la URL pública

**Resultado esperado:**
```
Deploying function tally-webhook...
✓ Function tally-webhook deployed successfully
Function URL: https://afhiiplxqtodqxvmswor.supabase.co/functions/v1/tally-webhook
```

**✅ El código ahora está en Supabase Cloud y funcionando**

---

## 📋 Paso 6: Verificar que se Subió Correctamente

### Opción A: Desde Supabase Dashboard

1. Ve a: https://supabase.com/dashboard/project/afhiiplxqtodqxvmswor
2. En el menú lateral, haz clic en **"Edge Functions"**
3. Deberías ver `tally-webhook` en la lista
4. Haz clic en ella
5. Verás detalles, logs, etc.

**✅ Si la ves aquí, está desplegada correctamente**

### Opción B: Probar la URL

Abre en tu navegador o con curl:

```
https://afhiiplxqtodqxvmswor.supabase.co/functions/v1/tally-webhook/test-id
```

Si responde (aunque sea con error), significa que está funcionando.

---

## 🔍 Cómo Saber que se Subió a Supabase

### Señales de que Funcionó:

1. **En la terminal:**
   ```
   ✓ Function tally-webhook deployed successfully
   ```

2. **En Supabase Dashboard:**
   - Ve a Edge Functions
   - Ves `tally-webhook` en la lista
   - Estado: "Active" o "Running"

3. **Probar la URL:**
   - La URL responde (aunque sea con error)
   - Significa que está funcionando

### Si NO Funcionó:

- Verás un error en la terminal
- No verás la función en Supabase Dashboard
- La URL no responderá

---

## 📊 Flujo Completo Visual

```
┌─────────────────────────────────────────┐
│  Tu Computadora                         │
│                                         │
│  1. Tienes el código aquí              │
│     supabase/functions/tally-webhook/  │
│                                         │
│  2. Ejecutas:                          │
│     supabase functions deploy           │
│                                         │
│  3. Supabase CLI:                      │
│     - Lee el código                    │
│     - Lo compila                       │
│     - Lo sube a Supabase Cloud         │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  Supabase Cloud (Internet)              │
│                                         │
│  ✓ Código recibido                     │
│  ✓ Desplegado en servidores            │
│  ✓ Disponible públicamente             │
│  ✓ URL: ...supabase.co/functions/...   │
│                                         │
│  Ahora cualquier webhook puede         │
│  llamar esta función                    │
└─────────────────────────────────────────┘
```

---

## 🎯 Resumen de Comandos

```powershell
# 1. Verificar instalación
supabase --version

# 2. Login (autenticarte)
supabase login

# 3. Linkear proyecto (conectar)
supabase link --project-ref afhiiplxqtodqxvmswor

# 4. Desplegar función (subir código)
supabase functions deploy tally-webhook

# 5. Ver logs (opcional)
supabase functions logs tally-webhook
```

---

## ✅ Checklist

- [ ] Supabase CLI instalado (`supabase --version` funciona)
- [ ] Login exitoso (`supabase login` - ves tu email)
- [ ] Proyecto linkeado (`supabase link` - ves "Linked to project")
- [ ] Función desplegada (`supabase functions deploy` - ves "deployed successfully")
- [ ] Verificada en Dashboard (ves la función en Edge Functions)
- [ ] URL funciona (la URL responde)

---

## 💡 Preguntas Frecuentes

### ¿Necesito mantener mi computadora encendida?

**NO.** Una vez desplegada, la función está en Supabase Cloud. Tu computadora puede estar apagada.

### ¿Puedo desplegar desde otra computadora?

**SÍ.** Solo necesitas:
- Instalar Supabase CLI
- Hacer login
- Linkear el proyecto
- Desplegar

### ¿Cómo actualizo la función?

Simplemente ejecuta de nuevo:
```powershell
supabase functions deploy tally-webhook
```

Sobrescribe la versión anterior.

### ¿Cómo veo los logs?

```powershell
supabase functions logs tally-webhook
```

O desde Supabase Dashboard → Edge Functions → tally-webhook → Logs

---

## 🚀 Próximos Pasos

Una vez desplegada:

1. **Obtén la URL completa** (incluye el ID del webhook)
2. **Configura en Tally** (pega la URL)
3. **Prueba** (envía un formulario)
4. **Verifica logs** (en Supabase Dashboard)

**¡Y listo! Funciona para cualquier persona que llene el formulario.**
