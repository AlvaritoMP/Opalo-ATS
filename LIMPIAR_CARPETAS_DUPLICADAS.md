# 🧹 Limpiar Carpetas Duplicadas de Google Drive

## ✅ Estructura Correcta

**Es CORRECTO** que "Opalo ATS" esté fuera de "ATS Pro". Cada app debe tener su propia carpeta raíz independiente:

```
Google Drive (raíz)
├── ATS Pro (carpeta de Opalopy)
│   ├── Proceso 1
│   ├── Proceso 2
│   └── ...
└── Opalo ATS (carpeta de Opalo ATS) ✅
    ├── Proceso 1
    ├── Proceso 2
    └── ...
```

**NO deben estar anidadas**:
```
❌ Google Drive
   └── ATS Pro
       └── Opalo ATS  (INCORRECTO)
```

---

## 🔍 Verificar Carpetas Duplicadas

### Opción 1: Verificar en Google Drive

1. Ve a tu Google Drive: https://drive.google.com
2. Busca carpetas llamadas "Opalo ATS"
3. Verifica cuántas hay y cuándo se crearon

### Opción 2: Usar la App

1. En la app, ve a **Settings** → **Almacenamiento de Archivos**
2. Haz clic en **"Cambiar"** junto a "Carpeta raíz"
3. Verás todas las carpetas disponibles
4. Si hay múltiples "Opalo ATS", puedes seleccionar la correcta

---

## 🧹 Limpiar Carpetas Duplicadas

### Opción 1: Eliminar Manualmente en Google Drive

1. Ve a Google Drive
2. Busca las carpetas "Opalo ATS" duplicadas
3. Verifica cuál tiene contenido (si alguna)
4. Elimina las carpetas vacías o duplicadas
5. Mantén solo UNA carpeta "Opalo ATS" (preferiblemente la más reciente o la que tiene contenido)

### Opción 2: Usar la App para Seleccionar la Correcta

1. En la app, ve a **Settings** → **Almacenamiento de Archivos**
2. Haz clic en **"Cambiar"** junto a "Carpeta raíz"
3. Selecciona la carpeta "Opalo ATS" correcta (la que quieres usar)
4. La app usará esa carpeta de ahora en adelante

---

## 🎯 ¿Por Qué Se Crearon Múltiples Carpetas?

**Causa**: Durante los intentos fallidos cuando el popup no funcionaba correctamente:

1. **Primer intento**: Se creó carpeta "Opalo ATS" → Popup falló → No se guardó la configuración
2. **Segundo intento**: Se creó otra carpeta "Opalo ATS" (porque no encontró la primera) → Popup falló → No se guardó
3. **Tercer intento**: Se creó otra carpeta "Opalo ATS" → Popup funcionó → Se guardó la configuración

**Resultado**: Múltiples carpetas "Opalo ATS" creadas a las 11:29 (durante los intentos fallidos).

---

## ✅ Solución Recomendada

1. **Identifica la carpeta correcta**:
   - La que tiene la configuración guardada en la app
   - O la más reciente si todas están vacías

2. **Elimina las duplicadas**:
   - Ve a Google Drive
   - Elimina las carpetas "Opalo ATS" que no necesitas
   - Mantén solo UNA

3. **Verifica en la app**:
   - Settings → Almacenamiento de Archivos
   - Debería mostrar la carpeta correcta
   - Si no, usa "Cambiar" para seleccionarla

---

## 🔒 Prevención Futura

Con la corrección del popup, esto **NO debería volver a pasar** porque:

1. El popup ahora funciona correctamente
2. La configuración se guarda después de la primera conexión exitosa
3. La función `getOrCreateRootFolder` encuentra la carpeta existente en lugar de crear una nueva

---

## 📝 Notas

- **Las carpetas duplicadas no afectan el funcionamiento** de la app
- **Solo se usa la carpeta configurada** en Settings
- **Puedes eliminar las duplicadas** sin problemas (si están vacías)
- **Si una carpeta duplicada tiene contenido**, muévelo a la carpeta correcta antes de eliminarla

---

## ✅ Checklist

- [ ] Verificar cuántas carpetas "Opalo ATS" existen
- [ ] Identificar cuál es la correcta (la que usa la app)
- [ ] Eliminar las duplicadas en Google Drive
- [ ] Verificar en la app que muestra la carpeta correcta
- [ ] Confirmar que todo funciona correctamente

