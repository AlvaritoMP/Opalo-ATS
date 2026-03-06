# 📥 Instalar Supabase CLI en Windows - Guía Paso a Paso

## ✅ Opción 1: Con winget (Recomendado)

### Paso 1: Abrir PowerShell como Administrador

1. Presiona `Windows + X`
2. Selecciona **"Windows PowerShell (Administrador)"** o **"Terminal (Administrador)"**

### Paso 2: Ejecutar el Comando

```powershell
winget install --id=Supabase.CLI
```

### Paso 3: Confirmar la Instalación

Cuando te pregunte:
```
¿Está de acuerdo con todos los términos de los contratos de origen?
[Y] Sí  [N] No:
```

Escribe `Y` y presiona Enter.

### Paso 4: Verificar Instalación

Cierra y abre una **nueva terminal** (importante) y ejecuta:

```powershell
supabase --version
```

Deberías ver algo como: `supabase version 1.x.x`

---

## ✅ Opción 2: Descarga Manual (Si winget no funciona)

### Paso 1: Descargar el Ejecutable

1. Ve a: https://github.com/supabase/cli/releases
2. Busca la última versión (ej: `v1.xxx.x`)
3. Descarga el archivo para Windows:
   - `supabase_x.x.x_windows_amd64.zip` (para 64-bit)
   - O `supabase_x.x.x_windows_386.zip` (para 32-bit)

### Paso 2: Extraer el Archivo

1. Extrae el ZIP
2. Obtendrás un archivo `supabase.exe`

### Paso 3: Agregar al PATH

**Opción A: Agregar a una Carpeta que ya está en PATH**

1. Copia `supabase.exe` a `C:\Windows\System32\`
2. O a `C:\Program Files\Supabase\` (crea la carpeta si no existe)

**Opción B: Agregar una Nueva Carpeta al PATH**

1. Crea una carpeta: `C:\Supabase\`
2. Copia `supabase.exe` ahí
3. Agrega `C:\Supabase\` al PATH:
   - Presiona `Windows + R`
   - Escribe: `sysdm.cpl` y presiona Enter
   - Ve a la pestaña **"Opciones avanzadas"**
   - Haz clic en **"Variables de entorno"**
   - En "Variables del sistema", busca `Path` y haz clic en **"Editar"**
   - Haz clic en **"Nuevo"**
   - Escribe: `C:\Supabase\`
   - Haz clic en **"Aceptar"** en todas las ventanas

### Paso 4: Verificar Instalación

Cierra y abre una **nueva terminal** y ejecuta:

```powershell
supabase --version
```

---

## ✅ Opción 3: Con Chocolatey (Si lo tienes instalado)

```powershell
choco install supabase
```

---

## ✅ Opción 4: Con npm (Si tienes Node.js)

```bash
npm install -g supabase
```

---

## 🔍 Verificar que Funciona

Después de instalar, **cierra y abre una nueva terminal** (importante) y ejecuta:

```powershell
supabase --version
```

Si ves la versión, está instalado correctamente ✅

Si ves un error, verifica:
- ¿Cerraste y abriste una nueva terminal?
- ¿El archivo está en una carpeta del PATH?
- ¿Tienes permisos de administrador?

## 📋 Próximos Pasos Después de Instalar

Una vez que `supabase --version` funcione:

1. **Login:**
   ```bash
   supabase login
   ```

2. **Inicializar (si es necesario):**
   ```bash
   supabase init
   ```

3. **Linkear proyecto:**
   ```bash
   supabase link --project-ref afhiiplxqtodqxvmswor
   ```

4. **Desplegar función:**
   ```bash
   supabase functions deploy tally-webhook
   ```

## 🐛 Solución de Problemas

### "supabase: command not found" después de instalar

**Solución:**
1. Cierra TODAS las terminales abiertas
2. Abre una NUEVA terminal
3. Prueba de nuevo: `supabase --version`

Si aún no funciona:
- Verifica que el archivo esté en una carpeta del PATH
- O usa la ruta completa: `C:\Supabase\supabase.exe --version`

### Error de permisos

**Solución:**
- Ejecuta PowerShell como Administrador
- O mueve el archivo a `C:\Windows\System32\`

### winget no funciona

**Solución:**
- Usa la Opción 2 (Descarga Manual)
- O instala winget primero desde Microsoft Store
