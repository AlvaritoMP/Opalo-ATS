# 🔧 Solución: Build Path "Invalid" en Easypanel

## ✅ Verificación

El Dockerfile **SÍ EXISTE** en el repositorio remoto en `Opalo-ATS/backend/Dockerfile`.

El problema es cómo Easypanel valida el Build Path.

---

## ✅ Soluciones a Probar

### Solución 1: Build Path Relativo al Repositorio

En Easypanel, en la sección **Source**:

1. **Build Path**: `Opalo-ATS/backend`
   - ✅ Debe ser exactamente `Opalo-ATS/backend` (con mayúsculas)
   - ❌ NO debe ser `/Opalo-ATS/backend` o `./Opalo-ATS/backend`

2. **File**: `Dockerfile`
   - ✅ Solo el nombre del archivo (relativo al Build Path)
   - ❌ NO debe ser `Opalo-ATS/backend/Dockerfile`

3. **Guarda** y espera unos segundos a que Easypanel valide

### Solución 2: Refrescar Página

1. **Refrescar la página** del navegador (F5 o Ctrl+R)
2. **Ir de nuevo** a Source
3. **Configurar Build Path** como `Opalo-ATS/backend`
4. **Guardar** de nuevo

### Solución 3: Cambiar y Volver a Cambiar

1. **Cambia el Build Path** a algo diferente (ej: `backend`)
2. **Guarda** (verás error)
3. **Cambia de nuevo** a `Opalo-ATS/backend`
4. **Guarda** de nuevo

Esto puede forzar a Easypanel a revalidar el path.

### Solución 4: Verificar Branch

Asegúrate de que el **Branch** sea exactamente:
- ✅ `main`
- ❌ NO debe ser `master` o cualquier otra rama

### Solución 5: Verificar Repository URL

Asegúrate de que el **Repository URL** sea exactamente:
- ✅ `https://github.com/AlvaritoMP/Opalo-ATS.git`
- ❌ NO debe tener `.git` al final de otra manera o ser SSH

---

## 🔍 Verificación en GitHub

Verifica que el Dockerfile existe en el repositorio remoto:

1. Ve a: https://github.com/AlvaritoMP/Opalo-ATS/blob/main/Opalo-ATS/backend/Dockerfile
2. **Debe mostrar** el contenido del Dockerfile
3. Si existe, el path debería ser correcto

---

## 🎯 Configuración Correcta Esperada

En Easypanel, la configuración debería ser:

| Campo | Valor |
|-------|-------|
| **Repository URL** | `https://github.com/AlvaritoMP/Opalo-ATS.git` |
| **Branch** | `main` |
| **Build Path** | `Opalo-ATS/backend` |
| **Build** | `Dockerfile` (seleccionado) |
| **File** | `Dockerfile` |

---

## 💡 Si Sigue Sin Funcionar

Si después de probar todo sigue mostrando "Invalid":

1. **Verifica en GitHub** que el Dockerfile existe:
   - Ve a: https://github.com/AlvaritoMP/Opalo-ATS/blob/main/Opalo-ATS/backend/Dockerfile
   - Si no existe, necesitas hacer push del Dockerfile primero

2. **Prueba hacer un pequeño cambio** en el Build Path:
   - Cambia a `Opalo-ATS/backend/` (con slash final)
   - O prueba `backend` (sin `Opalo-ATS/`)

3. **Espera unos segundos** después de escribir el Build Path antes de guardar
   - Easypanel puede necesitar tiempo para validar

4. **Contacta soporte de Easypanel** si nada funciona
   - Puede ser un problema con cómo Easypanel valida paths en repositorios anidados

---

## 📋 Checklist

- [ ] Dockerfile verificado en GitHub (existe en `Opalo-ATS/backend/`)
- [ ] Repository URL correcto: `https://github.com/AlvaritoMP/Opalo-ATS.git`
- [ ] Branch correcto: `main`
- [ ] Build Path: `Opalo-ATS/backend` (exactamente así)
- [ ] File: `Dockerfile` (solo el nombre)
- [ ] Página refrescada (F5)
- [ ] Esperado unos segundos después de escribir el path
- [ ] Guardado de nuevo

---

## 🎯 Próximos Pasos

1. **Refrescar la página** en Easypanel (F5)
2. **Configurar Build Path** exactamente como `Opalo-ATS/backend`
3. **Configurar File** como `Dockerfile`
4. **Esperar unos segundos** antes de guardar
5. **Guardar** y verificar si valida correctamente

---

## 💡 Nota

Si Easypanel sigue mostrando "Invalid" aunque el Dockerfile existe en GitHub, puede ser que Easypanel tenga un problema con paths anidados (paths con múltiples directorios como `Opalo-ATS/backend`). En ese caso, podrías necesitar:

1. **Mover el Dockerfile** a la raíz del repositorio (NO recomendado, pero puede funcionar)
2. **Contactar soporte de Easypanel** para verificar si hay un problema conocido
3. **Usar un path diferente** si Easypanel tiene limitaciones

Pero primero intenta refrescar la página y configurar exactamente como se indica arriba.



