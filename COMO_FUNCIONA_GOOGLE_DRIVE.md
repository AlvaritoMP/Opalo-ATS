# 📁 Cómo Funciona Google Drive en ATS Pro

## 🎯 Resumen del Sistema

El sistema de Google Drive funciona con una estructura de carpetas jerárquica:

```
Google Drive
└── ATS Pro (Carpeta Raíz - se crea automáticamente)
    ├── Proceso 1 (Carpeta del proceso - opcional)
    │   ├── candidato1_documento1.pdf
    │   ├── candidato2_documento1.pdf
    │   └── ...
    ├── Proceso 2 (Carpeta del proceso - opcional)
    │   └── ...
    └── (Archivos sin carpeta de proceso - se suben a la raíz)
```

## 📋 Componentes del Sistema

### 1. **Carpeta Raíz "ATS Pro"**
- **Dónde se crea**: Se crea automáticamente en tu Google Drive cuando conectas por primera vez
- **Propósito**: Contiene todos los archivos y carpetas de ATS Pro
- **Configuración**: Se configura automáticamente al conectar Google Drive

### 2. **Carpetas por Proceso** (Opcional)
- **Dónde se configuran**: En la edición de cada proceso (Procesos → Editar Proceso)
- **Propósito**: Organizar los documentos de candidatos por proceso
- **Cómo funciona**: 
  - Puedes crear una carpeta nueva o seleccionar una existente
  - Todos los documentos de candidatos de ese proceso se subirán a esa carpeta
  - Si no configuras una carpeta, los archivos se suben directamente a la carpeta raíz "ATS Pro"

### 3. **Carga de Archivos**
- **Dónde se suben**: 
  - Si el proceso tiene una carpeta configurada → Se suben a esa carpeta
  - Si el proceso NO tiene carpeta → Se suben a la carpeta raíz "ATS Pro"
- **Nombre de archivos**: `{nombre_candidato}_{nombre_archivo}` (ej: `Juan_Perez_CV.pdf`)

## 🔧 Funcionalidades

### Botón "Actualizar carpetas"
- **Ubicación**: Settings → Almacenamiento de Archivos
- **Qué hace**: Lista todas las carpetas que existen dentro de la carpeta raíz "ATS Pro"
- **Cuándo usarlo**: 
  - Después de crear carpetas manualmente en Google Drive
  - Para ver las carpetas disponibles antes de asignarlas a un proceso
  - Para refrescar la lista si agregaste carpetas desde Google Drive

### Configurar Carpeta por Proceso
1. Ve a **Procesos** → Selecciona un proceso → **Editar**
2. Busca la sección **"Carpeta de Google Drive"**
3. Tienes dos opciones:
   - **Seleccionar carpeta existente**: Haz clic en "Seleccionar carpeta" y elige una de la lista
   - **Crear nueva carpeta**: Escribe un nombre y haz clic en "Crear nueva carpeta"
4. Guarda el proceso

### Ver Dónde se Subieron los Archivos
1. Ve a Google Drive en tu navegador
2. Busca la carpeta **"ATS Pro"**
3. Dentro encontrarás:
   - Las carpetas de cada proceso (si están configuradas)
   - Los archivos de candidatos (organizados por proceso o en la raíz)

## ⚠️ Notas Importantes

1. **Si no configuras una carpeta por proceso**: Los archivos se suben directamente a "ATS Pro"
2. **Los archivos se organizan automáticamente**: No necesitas crear carpetas manualmente, pero puedes hacerlo si quieres más organización
3. **Los nombres de archivos incluyen el nombre del candidato**: Esto ayuda a identificar quién subió cada archivo
4. **Puedes cambiar la carpeta de un proceso en cualquier momento**: Los archivos ya subidos no se mueven, pero los nuevos se subirán a la nueva carpeta

## 🐛 Solución de Problemas

### Los archivos no se están subiendo
1. Verifica que Google Drive esté conectado (Settings → Almacenamiento de Archivos)
2. Verifica que el proceso tenga una carpeta configurada (Procesos → Editar Proceso)
3. Revisa la consola del navegador (F12) para ver errores

### No veo las carpetas en el selector
1. Haz clic en "Actualizar carpetas" en Settings
2. Verifica que las carpetas estén dentro de "ATS Pro" en Google Drive
3. Asegúrate de que Google Drive esté conectado

### Quiero cambiar dónde se suben los archivos
1. Ve a Procesos → Editar Proceso
2. Cambia la carpeta de Google Drive
3. Guarda el proceso
4. Los nuevos archivos se subirán a la nueva carpeta

