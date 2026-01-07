# 📁 Cómo Mover el Repositorio Git a C:\Users\alvar\Opaloats

## 🎯 Objetivo

Mover el repositorio Git desde `C:\Users\alvar\Opaloats\Opalo-ATS` a `C:\Users\alvar\Opaloats` para que puedas hacer comandos Git directamente desde el directorio padre.

---

## ⚠️ ADVERTENCIA IMPORTANTE

**Esto moverá todos los archivos del proyecto.** Asegúrate de:
- ✅ Hacer backup del proyecto antes
- ✅ Comprobar que todos los cambios están commiteados
- ✅ Verificar que no hay cambios sin guardar

---

## 📋 Pasos para Mover el Repositorio

### Opción 1: Método Recomendado (Renombrar y Mover)

Este método es más seguro porque renombramos el directorio padre primero.

#### Paso 1: Commit y Push de Cambios Pendientes

```powershell
# Cambiar al directorio del proyecto
cd C:\Users\alvar\Opaloats\Opalo-ATS

# Verificar que todo está commiteado
git status

# Si hay cambios, hacer commit
git add .
git commit -m "Preparando migración del repositorio"
git push
```

#### Paso 2: Crear Backup Temporal del Directorio Padre

```powershell
# Renombrar Opaloats a Opaloats_backup (temporal)
cd C:\Users\alvar
Rename-Item -Path "Opaloats" -NewName "Opaloats_backup"
```

#### Paso 3: Renombrar Opalo-ATS a Opaloats

```powershell
# Renombrar Opalo-ATS a Opaloats
cd C:\Users\alvar
Rename-Item -Path "Opaloats_backup\Opalo-ATS" -NewName "Opaloats"
```

#### Paso 4: Mover Archivos de Opaloats_backup a Opaloats (si es necesario)

Si había archivos en `Opaloats` que no están en `Opalo-ATS`, muévelos manualmente.

#### Paso 5: Eliminar Opaloats_backup

```powershell
# Eliminar el directorio de backup (si está vacío)
Remove-Item -Path "C:\Users\alvar\Opaloats_backup" -Recurse -Force
```

#### Paso 6: Verificar que el Repositorio Funciona

```powershell
# Cambiar al nuevo directorio
cd C:\Users\alvar\Opaloats

# Verificar que Git funciona
git status

# Verificar remoto
git remote -v
```

---

### Opción 2: Método Directo (Mover .git)

Este método es más rápido pero requiere más cuidado.

#### Paso 1: Commit y Push de Cambios Pendientes

```powershell
cd C:\Users\alvar\Opaloats\Opalo-ATS
git status
git add .
git commit -m "Preparando migración del repositorio"
git push
```

#### Paso 2: Mover la Carpeta .git

```powershell
# Mover .git desde Opalo-ATS a Opaloats
Move-Item -Path "C:\Users\alvar\Opaloats\Opalo-ATS\.git" -Destination "C:\Users\alvar\Opaloats\.git"
```

#### Paso 3: Mover Todos los Archivos del Proyecto

```powershell
# Mover todos los archivos de Opalo-ATS a Opaloats
Get-ChildItem -Path "C:\Users\alvar\Opaloats\Opalo-ATS" -Exclude ".",".." | Move-Item -Destination "C:\Users\alvar\Opaloats" -Force
```

#### Paso 4: Eliminar el Directorio Opalo-ATS Vacío

```powershell
# Eliminar Opalo-ATS (ahora vacío)
Remove-Item -Path "C:\Users\alvar\Opaloats\Opalo-ATS" -Recurse -Force
```

#### Paso 5: Verificar que el Repositorio Funciona

```powershell
cd C:\Users\alvar\Opaloats
git status
git remote -v
```

---

### Opción 3: Método con Inicialización Nueva (Si Nada Funciona)

Si los métodos anteriores fallan, puedes inicializar un nuevo repositorio:

#### Paso 1: Inicializar Nuevo Repositorio en Opaloats

```powershell
cd C:\Users\alvar\Opaloats
git init
```

#### Paso 2: Agregar el Remoto

```powershell
git remote add origin https://github.com/AlvaritoMP/Opalo-ATS.git
```

#### Paso 3: Mover Archivos Manualmente

```powershell
# Mover todos los archivos de Opalo-ATS a Opaloats (excepto .git)
Get-ChildItem -Path "C:\Users\alvar\Opaloats\Opalo-ATS" -Exclude ".git" | Move-Item -Destination "C:\Users\alvar\Opaloats" -Force
```

#### Paso 4: Hacer Commit y Push

```powershell
cd C:\Users\alvar\Opaloats
git add .
git commit -m "Migración del repositorio a directorio padre"
git push -u origin main
```

---

## ✅ Verificación Final

Después de mover el repositorio, verifica:

```powershell
# 1. Cambiar al directorio correcto
cd C:\Users\alvar\Opaloats

# 2. Verificar que Git funciona
git status

# 3. Verificar remoto
git remote -v

# 4. Verificar que puedes hacer commit
git log --oneline -5

# 5. Verificar archivos del proyecto
ls
```

Deberías ver:
- ✅ `git status` funciona sin errores
- ✅ El remoto apunta a `https://github.com/AlvaritoMP/Opalo-ATS.git`
- ✅ Todos los archivos del proyecto están presentes

---

## 🔧 Actualizar EasyPanel (Importante)

Después de mover el repositorio, **NO necesitas cambiar nada en EasyPanel** porque:

1. El repositorio remoto en GitHub sigue siendo el mismo
2. EasyPanel clona desde GitHub, no desde tu máquina local
3. Solo necesitas hacer `git push` después de los cambios

**PERO**, si EasyPanel está configurado para clonar desde un path específico, verifica que el path sea correcto.

---

## 📝 Resumen de Comandos Rápidos

**Método más simple (Opción 1):**

```powershell
# 1. Commit cambios pendientes
cd C:\Users\alvar\Opaloats\Opalo-ATS
git add .
git commit -m "Preparando migración"
git push

# 2. Renombrar directorios
cd C:\Users\alvar
Rename-Item "Opaloats" "Opaloats_backup"
Rename-Item "Opaloats_backup\Opalo-ATS" "Opaloats"

# 3. Eliminar backup (si está vacío)
Remove-Item "Opaloats_backup" -Recurse -Force

# 4. Verificar
cd C:\Users\alvar\Opaloats
git status
```

---

## ⚠️ Si Algo Sale Mal

Si algo sale mal durante la migración:

1. **No entres en pánico**
2. Los archivos originales deberían seguir en `Opalo-ATS` o en `Opaloats_backup`
3. Si perdiste `.git`, puedes clonar nuevamente desde GitHub:
   ```powershell
   cd C:\Users\alvar\Opaloats
   git clone https://github.com/AlvaritoMP/Opalo-ATS.git .
   ```

---

## 💡 Recomendación

**Te recomiendo usar la Opción 1** (renombrar) porque:
- ✅ Es más segura
- ✅ Permite verificar antes de eliminar
- ✅ Es más fácil revertir si algo sale mal

