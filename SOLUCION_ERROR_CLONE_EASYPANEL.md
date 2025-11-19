# 🔧 Solución: Error "Failed to clone repository" en Easypanel

## 🔴 Problema

Easypanel no puede clonar tu repositorio Git.

## ✅ Soluciones

### Solución 1: Verificar Configuración del Repositorio en Easypanel

1. **Ve a la configuración de tu app backend en Easypanel**
2. **Verifica**:
   - **Source/Repository**: Debe ser la URL completa de tu repositorio Git
     - GitHub: `https://github.com/usuario/repositorio.git`
     - GitLab: `https://gitlab.com/usuario/repositorio.git`
     - Bitbucket: `https://bitbucket.org/usuario/repositorio.git`
   - **Branch**: Debe ser `main` o `master` (según tu rama principal)
   - **Root Directory**: Debe ser `backend` (para el backend)

### Solución 2: Repositorio Privado - Configurar Acceso

Si tu repositorio es **privado**, Easypanel necesita acceso:

#### Opción A: Usar HTTPS con Token Personal

1. **Genera un Personal Access Token**:
   - **GitHub**: Settings → Developer settings → Personal access tokens → Tokens (classic)
   - **GitLab**: User Settings → Access Tokens
   - **Bitbucket**: Personal settings → App passwords

2. **En Easypanel**, cuando configures el repositorio:
   - Usa la URL: `https://TOKEN@github.com/usuario/repositorio.git`
   - O configura el token en la sección de "Secrets" o "Credentials" de Easypanel

#### Opción B: Usar SSH (Recomendado para Privados)

1. **Genera una SSH Key** (si no tienes una):
   ```bash
   ssh-keygen -t ed25519 -C "easypanel@tu-email.com"
   ```

2. **Agrega la clave pública a tu cuenta Git**:
   - **GitHub**: Settings → SSH and GPG keys → New SSH key
   - **GitLab**: User Settings → SSH Keys
   - **Bitbucket**: Personal settings → SSH keys

3. **En Easypanel**, usa la URL SSH:
   - `git@github.com:usuario/repositorio.git`
   - O configura la SSH key en Easypanel

### Solución 3: Verificar que el Repositorio Existe y es Accesible

1. **Abre tu repositorio en el navegador**
2. **Verifica que puedas acceder** sin problemas
3. **Copia la URL exacta** del repositorio

### Solución 4: Verificar la Rama (Branch)

1. **Verifica cuál es tu rama principal**:
   ```bash
   git branch
   ```
2. **En Easypanel**, asegúrate de que el **Branch** sea:
   - `main` (si tu rama principal es `main`)
   - `master` (si tu rama principal es `master`)
   - O la rama que quieras usar

### Solución 5: Verificar Root Directory

Para el **backend**, el **Root Directory** debe ser:
```
backend
```

**⚠️ IMPORTANTE**: Sin barra al final, solo `backend`

### Solución 6: Verificar que los Archivos Están en el Repositorio

1. **Verifica que el código del backend esté en Git**:
   ```bash
   git status
   git log --oneline -5
   ```

2. **Si no has hecho commit del backend**:
   ```bash
   git add backend/
   git commit -m "Add backend for Google Drive integration"
   git push
   ```

---

## 📋 Checklist de Configuración en Easypanel

- [ ] **Source/Repository**: URL completa y correcta del repositorio
- [ ] **Branch**: `main` o `master` (según tu rama)
- [ ] **Root Directory**: `backend` (para el backend)
- [ ] **Build Method**: `Nixpacks`
- [ ] **Port**: `5000` (en variables de entorno)
- [ ] Si es privado: Token o SSH key configurado

---

## 🔍 Verificar Localmente

Ejecuta estos comandos para verificar tu configuración:

```bash
# Ver remotes
git remote -v

# Ver rama actual
git branch

# Verificar que backend/ existe
ls -la backend/

# Verificar que backend/package.json existe
cat backend/package.json
```

---

## 💡 Ejemplo de Configuración Correcta

### Para Repositorio Público:
- **Source**: `https://github.com/tu-usuario/tu-repo.git`
- **Branch**: `main`
- **Root Directory**: `backend`

### Para Repositorio Privado (HTTPS):
- **Source**: `https://github.com/tu-usuario/tu-repo.git`
- **Branch**: `main`
- **Root Directory**: `backend`
- **Credentials**: Token personal configurado en Easypanel

### Para Repositorio Privado (SSH):
- **Source**: `git@github.com:tu-usuario/tu-repo.git`
- **Branch**: `main`
- **Root Directory**: `backend`
- **SSH Key**: Configurada en Easypanel

---

## 🆘 Si Nada Funciona

1. **Intenta crear una nueva app** en Easypanel desde cero
2. **Verifica los logs** de Easypanel para más detalles del error
3. **Contacta al soporte de Easypanel** con el mensaje de error completo

---

## 📝 Nota Importante

Asegúrate de que:
- ✅ El código del backend esté **commiteado y pusheado** a Git
- ✅ La carpeta `backend/` esté en la raíz del repositorio
- ✅ El archivo `backend/package.json` exista

