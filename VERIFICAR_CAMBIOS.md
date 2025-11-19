# Verificar Cambios en Local

## Pasos para ver los nuevos desarrollos

### 1. Detener el servidor actual (si está corriendo)
Presiona `Ctrl + C` en la terminal donde corre `npm run dev`

### 2. Verificar que no haya errores
```bash
npm run dev
```

### 3. Abrir el navegador
- Ve a: `http://localhost:5173` (o el puerto que muestre Vite)
- Abre la consola del navegador (F12) para ver errores

### 4. Verificar los cambios de Google Drive

**En Settings:**
1. Inicia sesión
2. Ve a **Settings** (Configuración)
3. Desplázate hasta **"Almacenamiento de Archivos"**
4. Deberías ver la nueva sección de Google Drive con:
   - Botón "Conectar con Google Drive"
   - Información sobre la conexión

**En Procesos:**
1. Ve a **Procesos**
2. Crea o edita un proceso
3. Desplázate hacia abajo
4. Deberías ver la sección **"Carpeta de Google Drive"** (solo si Google Drive está conectado)

## Si no ves los cambios

### Opción 1: Limpiar caché del navegador
1. Presiona `Ctrl + Shift + R` (o `Cmd + Shift + R` en Mac) para hard refresh
2. O abre en modo incógnito

### Opción 2: Verificar errores en consola
1. Abre la consola del navegador (F12)
2. Ve a la pestaña "Console"
3. Busca errores en rojo
4. Comparte los errores si los hay

### Opción 3: Verificar que el servidor esté corriendo
```bash
# Verifica que el puerto 5173 esté en uso
netstat -ano | findstr :5173
```

### Opción 4: Reinstalar dependencias
```bash
# Detén el servidor (Ctrl + C)
rm -rf node_modules
npm install
npm run dev
```

## Cambios implementados

✅ **Nuevo componente**: `GoogleDriveSettings` en Settings
✅ **Nuevo servicio**: `lib/googleDrive.ts` para manejar Google Drive API
✅ **Actualizado**: `ProcessEditorModal` con selector de carpetas
✅ **Actualizado**: `CandidateDetailsModal` para subir a Google Drive
✅ **Actualizado**: `types.ts` con tipos de Google Drive
✅ **Actualizado**: `App.tsx` para inicializar Google Drive

## Estructura de archivos nuevos

```
components/
  └── GoogleDriveSettings.tsx  ← NUEVO

lib/
  └── googleDrive.ts  ← NUEVO

backend/  ← NUEVO (carpeta completa)
  ├── src/
  │   ├── server.js
  │   ├── config/
  │   │   └── googleDrive.js
  │   └── routes/
  │       └── auth.js
  └── package.json
```

## Si hay errores de compilación

Comparte el mensaje de error completo y lo solucionaremos.

