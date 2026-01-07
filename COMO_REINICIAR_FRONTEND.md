# 🔄 Cómo Reiniciar el Frontend

## 📋 Pasos para Reiniciar

### Opción 1: Si el Frontend Ya Está Corriendo

1. **Ve a la terminal donde corre el frontend**
   - Deberías ver algo como: `VITE v5.x.x  ready in xxx ms`
   - O: `Local:   http://localhost:3001/`

2. **Presiona `Ctrl+C`** para detener el servidor

3. **Ejecuta de nuevo**:
   ```bash
   npm run dev
   ```

### Opción 2: Desde una Nueva Terminal

1. **Abre una nueva terminal**

2. **Navega al directorio del proyecto**:
   ```bash
   cd Opalo-ATS
   ```

3. **Inicia el frontend**:
   ```bash
   npm run dev
   ```

4. **Deberías ver**:
   ```
   VITE v5.x.x  ready in xxx ms
   
   ➜  Local:   http://localhost:3001/
   ➜  Network: use --host to expose
   ```

---

## ⚠️ Importante: Ubicación del .env.local

El archivo `.env.local` debe estar en la **raíz** del proyecto, NO en `backend/`:

**✅ Correcto:**
```
Opalo-ATS/
├── .env.local          ← AQUÍ
├── backend/
│   └── .env            ← Este es para el backend
└── ...
```

**❌ Incorrecto:**
```
Opalo-ATS/
├── backend/
│   ├── .env
│   └── .env.local      ← NO aquí
└── ...
```

---

## 🔍 Verificar que el Frontend Esté Corriendo

Después de iniciar, verifica:

1. **Abre en el navegador**: `http://localhost:3001`
2. **Debería cargar la aplicación**
3. **En la consola del navegador** (F12), no debería haber errores de `VITE_API_URL`

---

## 🆘 Si No Funciona

### El frontend no inicia

```bash
# Verifica que estés en el directorio correcto
cd Opalo-ATS

# Verifica que las dependencias estén instaladas
npm install

# Intenta iniciar de nuevo
npm run dev
```

### El puerto 3001 está ocupado

```bash
# Verifica qué está usando el puerto
netstat -ano | findstr :3001

# O cambia el puerto en vite.config.ts
```

### Las variables de entorno no se cargan

1. Verifica que `.env.local` esté en la raíz (no en `backend/`)
2. Verifica que el archivo tenga el formato correcto:
   ```env
   VITE_API_URL=http://localhost:5000
   ```
3. Reinicia el frontend después de editar `.env.local`

---

## 📝 Comandos Rápidos

```bash
# Detener frontend
Ctrl+C

# Iniciar frontend
cd Opalo-ATS
npm run dev

# Verificar que esté corriendo
# Abre: http://localhost:3001
```

