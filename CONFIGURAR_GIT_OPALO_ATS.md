# 🔧 Configurar Git para Opalo ATS

## ⚠️ Situación Actual

El repositorio Git actual apunta a Opalopy:
```
origin	https://github.com/AlvaritoMP/Opalopy.git
```

Necesitas cambiar esto para que apunte a un nuevo repositorio de Opalo ATS.

---

## 📋 Pasos para Configurar el Nuevo Repositorio

### Paso 1: Crear Repositorio en GitHub

1. Ve a [GitHub](https://github.com)
2. Haz clic en **"+"** → **"New repository"**
3. Completa:
   - **Repository name**: `Opalo-ATS` (o el nombre que prefieras)
   - **Description**: "Opalo ATS - Applicant Tracking System"
   - **Visibility**: Private (recomendado) o Public
   - **NO marques** "Initialize this repository with a README"
4. Haz clic en **"Create repository"**
5. **Copia la URL** del repositorio (ej: `https://github.com/AlvaritoMP/Opalo-ATS.git`)

### Paso 2: Cambiar el Remoto de Git

```bash
cd Opalo-ATS

# Ver el remoto actual
git remote -v

# Eliminar el remoto de Opalopy
git remote remove origin

# Agregar el nuevo remoto de Opalo ATS
git remote add origin https://github.com/AlvaritoMP/Opalo-ATS.git

# Verificar que se cambió correctamente
git remote -v
```

**Nota**: Reemplaza `AlvaritoMP/Opalo-ATS` con tu usuario y nombre de repositorio.

### Paso 3: Verificar que .env NO se Suba

```bash
# Verificar qué archivos se van a subir
git status

# Debe mostrar archivos, pero NO debe mostrar:
# - .env
# - backend/.env
# - .env.local
# - backend/.env.local
```

Si ves algún `.env` en `git status`:

```bash
# Agregar a .gitignore (si no está)
echo ".env" >> .gitignore
echo "backend/.env" >> .gitignore
echo ".env.local" >> .gitignore
echo "backend/.env.local" >> .gitignore

# Eliminar del tracking (pero mantener el archivo local)
git rm --cached .env 2>$null
git rm --cached backend/.env 2>$null
git rm --cached .env.local 2>$null
git rm --cached backend/.env.local 2>$null
```

### Paso 4: Crear Archivos de Ejemplo (Opcional pero Recomendado)

Crea estos archivos para que otros desarrolladores sepan qué configurar:

#### `backend/.env.example`

Crea manualmente `Opalo-ATS/backend/.env.example`:

```env
# Google OAuth2 Credentials
GOOGLE_CLIENT_ID=tu_client_id_aqui
GOOGLE_CLIENT_SECRET=tu_client_secret_aqui
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback
FRONTEND_URL=http://localhost:3001
PORT=5000
NODE_ENV=development
```

#### `.env.local.example`

Crea manualmente `Opalo-ATS/.env.local.example`:

```env
# Supabase Configuration
VITE_SUPABASE_URL=tu_supabase_url_aqui
VITE_SUPABASE_ANON_KEY=tu_supabase_anon_key_aqui

# Backend API URL
VITE_API_URL=http://localhost:5000
```

**Nota**: Los archivos `.example` SÍ se suben a Git.

### Paso 5: Hacer el Primer Commit (Si No Hay Commits)

```bash
# Agregar todos los archivos
git add .

# Verificar qué se va a subir
git status

# Hacer commit
git commit -m "Initial commit: Opalo ATS - Multi-tenant ATS application"
```

### Paso 6: Subir el Código

```bash
# Cambiar a la rama main (si no estás en ella)
git branch -M main

# Subir el código
git push -u origin main
```

---

## ✅ Verificación Final

Después de subir, verifica en GitHub:

- ✅ Los archivos estén presentes
- ✅ `.env` y `backend/.env` NO estén en el repositorio
- ✅ `node_modules/` NO esté en el repositorio
- ✅ Los archivos de documentación estén presentes

---

## 🔒 Seguridad: Archivos que NO Deben Subirse

**NUNCA subas estos archivos**:

- ❌ `.env`
- ❌ `backend/.env`
- ❌ `.env.local`
- ❌ `backend/.env.local`
- ❌ Cualquier archivo con credenciales
- ❌ `node_modules/`

El `.gitignore` ya está configurado para ignorar estos archivos.

---

## 🆘 Problemas Comunes

### Error: "remote origin already exists"

```bash
# Eliminar el remoto existente
git remote remove origin

# Agregar el nuevo
git remote add origin https://github.com/TU_USUARIO/Opalo-ATS.git
```

### Error: "failed to push some refs"

Si el repositorio remoto tiene contenido:

```bash
git pull origin main --allow-unrelated-histories
# Resolver conflictos si los hay
git push -u origin main
```

### Archivo .env aparece en git status

```bash
# Verificar que esté en .gitignore
cat .gitignore | grep ".env"

# Si no está, agregarlo
echo "backend/.env" >> .gitignore
echo ".env.local" >> .gitignore

# Eliminar del tracking
git rm --cached backend/.env
git commit -m "Remove .env from tracking"
```

---

## 📝 Comandos Rápidos

```bash
# Cambiar remoto
git remote remove origin
git remote add origin https://github.com/TU_USUARIO/Opalo-ATS.git

# Verificar
git remote -v

# Subir
git push -u origin main
```

---

## ✅ Checklist

- [ ] Repositorio creado en GitHub
- [ ] Remoto cambiado de Opalopy a Opalo ATS
- [ ] `.gitignore` verificado (incluye `.env`)
- [ ] Archivos `.example` creados (opcional)
- [ ] `git status` no muestra archivos `.env`
- [ ] Primer commit hecho (si es necesario)
- [ ] Código subido a GitHub
- [ ] Verificado en GitHub que `.env` NO está

