# 🚀 Cómo Iniciar el Frontend

## ❌ Error Común

Si ves este error:
```
npm error enoent Could not read package.json
```

Significa que estás en el directorio incorrecto.

---

## ✅ Solución

### Paso 1: Cambiar al Directorio Correcto

```bash
cd Opalo-ATS
```

**Verifica** que estés en el directorio correcto:
```bash
# Deberías ver: C:\Users\alvar\Opaloats\Opalo-ATS
pwd
# O en PowerShell:
Get-Location
```

### Paso 2: Iniciar el Frontend

```bash
npm run dev
```

---

## 📋 Comandos Completos

```bash
# 1. Ir al directorio del proyecto
cd Opalo-ATS

# 2. Iniciar el frontend
npm run dev
```

---

## ✅ Verificación

Después de ejecutar `npm run dev`, deberías ver:

```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:3001/
➜  Network: use --host to expose
```

Luego abre en el navegador: `http://localhost:3001`

---

## 🆘 Si Aún No Funciona

### Error: "npm: command not found"

**Solución**: Node.js no está instalado o no está en el PATH.

1. Verifica que Node.js esté instalado:
   ```bash
   node --version
   npm --version
   ```

2. Si no está instalado, descárgalo de [nodejs.org](https://nodejs.org/)

### Error: "Could not read package.json"

**Solución**: Estás en el directorio incorrecto.

1. Verifica que estés en `Opalo-ATS`:
   ```bash
   cd Opalo-ATS
   ```

2. Verifica que exista `package.json`:
   ```bash
   ls package.json
   # O en PowerShell:
   Test-Path package.json
   ```

### Error: "dependencies not installed"

**Solución**: Instala las dependencias primero.

```bash
cd Opalo-ATS
npm install
npm run dev
```

---

## 📝 Estructura de Directorios

```
Opaloats/
├── Opalo-ATS/          ← AQUÍ debes estar
│   ├── package.json    ← Este archivo debe existir
│   ├── .env.local      ← Variables del frontend
│   └── ...
└── Opalopy/
    └── ...
```

---

## 🎯 Resumen

1. **Cambia al directorio**: `cd Opalo-ATS`
2. **Inicia el frontend**: `npm run dev`
3. **Abre en el navegador**: `http://localhost:3001`

