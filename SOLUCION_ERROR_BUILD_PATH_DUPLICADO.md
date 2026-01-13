# 🔧 Solución: Error Build Path Duplicado

## ❌ Error

```
ERROR: failed to build: resolve : lstat /etc/easypanel/projects/opalo/atsopalo-backend/code/Opalo-ATS/backend/Opalo-ATS: no such file or directory
```

**Comando que está ejecutando:**
```
docker buildx build ... -f /etc/easypanel/projects/opalo/atsopalo-backend/code/Opalo-ATS/backend/Opalo-ATS/backend/Dockerfile ...
```

## 🔍 Causa

EasyPanel está **duplicando el path** del Dockerfile:

- **Build Path**: `Opalo-ATS/backend` ✅
- **File**: `Opalo-ATS/backend/Dockerfile` ❌ (INCORRECTO - path completo)

Cuando el Build Path ya es `Opalo-ATS/backend`, EasyPanel está buscando el Dockerfile en:
```
Build Path + File = Opalo-ATS/backend + Opalo-ATS/backend/Dockerfile
                  = Opalo-ATS/backend/Opalo-ATS/backend/Dockerfile ❌
```

---

## ✅ Solución: File Debe Ser Solo el Nombre

Cuando el Build Path es `Opalo-ATS/backend`, el campo "File" debe ser **solo el nombre del archivo**, no el path completo.

### Configuración Correcta:

| Campo | Valor |
|-------|-------|
| **Repository URL** | `https://github.com/AlvaritoMP/Opalo-ATS.git` |
| **Branch** | `main` |
| **Build Path** | `Opalo-ATS/backend` ✅ |
| **Build** | `Dockerfile` (seleccionado) ✅ |
| **File** | `Dockerfile` ✅ (solo el nombre, NO `Opalo-ATS/backend/Dockerfile`) |

---

## 📋 Pasos para Corregir

1. En EasyPanel, ve a `opalo/atsopalo-backend` > **Source**

2. **Verifica/Configura**:
   - **Build Path**: `Opalo-ATS/backend` ✅
   - **File**: `Dockerfile` ✅ (solo el nombre, sin path)
   - **Build**: `Dockerfile` (seleccionado) ✅

3. **Guarda** los cambios

4. **Redeploy** el servicio

---

## 🔍 Verificación Después del Fix

Después del redeploy, el comando debería ser:
```
docker buildx build ... -f /etc/easypanel/projects/opalo/atsopalo-backend/code/Opalo-ATS/backend/Dockerfile ...
```

**NO debe tener** `Opalo-ATS/backend/Opalo-ATS/backend/Dockerfile`

---

## 💡 Nota

**Regla general para EasyPanel:**
- **Build Path**: Es el directorio donde EasyPanel hace checkout del código
- **File**: Es relativo al Build Path, no a la raíz del repositorio

Por lo tanto:
- Si **Build Path** = `Opalo-ATS/backend`
- Entonces **File** = `Dockerfile` (no `Opalo-ATS/backend/Dockerfile`)

---

## 🎯 Alternativa: Build Path en Raíz

Si prefieres especificar el path completo del Dockerfile, puedes cambiar el Build Path a la raíz:

| Campo | Valor |
|-------|-------|
| **Build Path** | `.` o `/` (raíz del repo) |
| **File** | `Opalo-ATS/backend/Dockerfile` (path completo) |

Pero es más simple usar la primera opción (Build Path = `Opalo-ATS/backend`, File = `Dockerfile`).


