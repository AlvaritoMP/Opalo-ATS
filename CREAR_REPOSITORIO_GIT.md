# 📦 Crear Repositorio Git para Opalo ATS

## 🎯 Objetivo

Crear un nuevo repositorio Git para Opalo ATS, separado del repositorio de Opalopy.

---

## 📋 Pasos para Crear el Repositorio

### Paso 1: Crear Repositorio en GitHub

1. Ve a [GitHub](https://github.com)
2. Haz clic en **"+"** → **"New repository"**
3. Completa el formulario:
   - **Repository name**: `Opalo-ATS` (o el nombre que prefieras)
   - **Description**: "Opalo ATS - Applicant Tracking System"
   - **Visibility**: Private (recomendado) o Public
   - **NO marques** "Initialize this repository with a README" (ya tenemos archivos)
4. Haz clic en **"Create repository"**

### Paso 2: Inicializar Git en Opalo ATS (Si No Está Inicializado)

```bash
cd Opalo-ATS
git init
```

### Paso 3: Verificar .gitignore

Asegúrate de que `.gitignore` incluya:

```
# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/

# Production
build/
dist/

# Environment variables (IMPORTANTE - no subir credenciales)
.env
.env.local
.env.production.local
.env.development.local
backend/.env
backend/.env.local

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
lerna-debug.log*

# Editor
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Misc
*.log
.cache/
```

### Paso 4: Agregar Archivos al Repositorio

```bash
cd Opalo-ATS

# Agregar todos los archivos (excepto los que están en .gitignore)
git add .

# Verificar qué se va a subir (debe mostrar archivos, NO .env)
git status
```

**⚠️ IMPORTANTE**: Verifica que `.env` y `backend/.env` NO aparezcan en `git status`. Si aparecen, agrégalos a `.gitignore`.

### Paso 5: Hacer el Primer Commit

```bash
git commit -m "Initial commit: Opalo ATS - Multi-tenant ATS application"
```

### Paso 6: Conectar con el Repositorio Remoto

```bash
# Reemplaza TU_USUARIO con tu usuario de GitHub
git remote add origin https://github.com/TU_USUARIO/Opalo-ATS.git

# O si prefieres SSH:
# git remote add origin git@github.com:TU_USUARIO/Opalo-ATS.git
```

### Paso 7: Subir el Código

```bash
# Cambiar a la rama main (si no estás en ella)
git branch -M main

# Subir el código
git push -u origin main
```

---

## ✅ Verificación

Después de subir, verifica en GitHub que:

- ✅ Los archivos estén presentes
- ✅ `.env` y `backend/.env` NO estén en el repositorio
- ✅ `node_modules/` NO esté en el repositorio
- ✅ Los archivos de documentación estén presentes

---

## 🔒 Seguridad: Archivos que NO Deben Subirse

**NUNCA subas estos archivos a Git**:

- ❌ `.env`
- ❌ `backend/.env`
- ❌ `.env.local`
- ❌ `backend/.env.local`
- ❌ Cualquier archivo con credenciales
- ❌ `node_modules/`

**Si accidentalmente subiste un `.env` con credenciales**:

1. **Elimínalo del historial de Git** (requiere force push)
2. **Rota las credenciales** (cambia las contraseñas/keys)
3. **Verifica que esté en `.gitignore`**

---

## 📝 Archivos de Ejemplo para el Repositorio

Puedes crear archivos de ejemplo para que otros desarrolladores sepan qué configurar:

### `backend/.env.example`

```env
# Google OAuth2 Credentials
# Obtén estas credenciales desde Google Cloud Console
GOOGLE_CLIENT_ID=tu_client_id_aqui
GOOGLE_CLIENT_SECRET=tu_client_secret_aqui

# Redirect URI para OAuth callback
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback

# Frontend URL (para CORS y redirecciones)
FRONTEND_URL=http://localhost:3001

# Puerto del servidor backend
PORT=5000

# Entorno
NODE_ENV=development
```

### `.env.local.example` (en la raíz)

```env
# Supabase Configuration
VITE_SUPABASE_URL=tu_supabase_url_aqui
VITE_SUPABASE_ANON_KEY=tu_supabase_anon_key_aqui

# Backend API URL
VITE_API_URL=http://localhost:5000
```

**Nota**: Los archivos `.example` SÍ se suben a Git, pero los `.env` reales NO.

---

## 🔄 Flujo de Trabajo Futuro

Después de crear el repositorio:

```bash
# Hacer cambios
git add .
git commit -m "Descripción de los cambios"
git push
```

---

## 📚 Documentación para el README

Crea o actualiza `README.md` con:

- Descripción del proyecto
- Instrucciones de instalación
- Configuración de variables de entorno
- Cómo ejecutar en desarrollo
- Enlaces a documentación importante

---

## 🆘 Problemas Comunes

### Error: "remote origin already exists"

```bash
# Ver remotos actuales
git remote -v

# Eliminar el remoto existente
git remote remove origin

# Agregar el nuevo remoto
git remote add origin https://github.com/TU_USUARIO/Opalo-ATS.git
```

### Error: "failed to push some refs"

```bash
# Si el repositorio remoto tiene contenido (README, etc.)
git pull origin main --allow-unrelated-histories

# Resolver conflictos si los hay, luego:
git push -u origin main
```

### Archivo .env aparece en git status

```bash
# Agregar a .gitignore
echo ".env" >> .gitignore
echo "backend/.env" >> .gitignore

# Eliminar del tracking de Git (pero mantener el archivo local)
git rm --cached .env
git rm --cached backend/.env

# Hacer commit
git commit -m "Remove .env files from tracking"
```

---

## ✅ Checklist Final

- [ ] Repositorio creado en GitHub
- [ ] Git inicializado en Opalo-ATS
- [ ] `.gitignore` configurado correctamente
- [ ] `.env` y `backend/.env` en `.gitignore`
- [ ] Archivos `.example` creados (opcional pero recomendado)
- [ ] Primer commit hecho
- [ ] Repositorio remoto conectado
- [ ] Código subido a GitHub
- [ ] Verificado que `.env` NO está en GitHub
- [ ] README.md actualizado

---

## 🎯 Siguiente Paso

Después de crear el repositorio:

1. **Comparte el repositorio** con tu equipo
2. **Configura GitHub Actions** (si usas CI/CD)
3. **Protege la rama main** (requiere reviews para merge)
4. **Documenta el proceso de deploy**

