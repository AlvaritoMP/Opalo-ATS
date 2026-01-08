# 🔧 Solución: Error de Conexión a Google Drive

## ❌ Error Encontrado

```
ERR_CONNECTION_REFUSED
La página localhost ha rechazado la conexión
```

## 🔍 Causa del Problema

El frontend estaba intentando conectarse al puerto **5001**, pero el backend está corriendo en el puerto **5000**.

## ✅ Solución Aplicada

1. **Corregido `lib/googleDrive.ts`**:
   - Cambiado de `http://localhost:5001` a `http://localhost:5000`

2. **Verificado `.env.local`**:
   - Debe tener: `VITE_API_URL=http://localhost:5000`

3. **Backend verificado**:
   - ✅ Backend corriendo en puerto 5000
   - ✅ Responde correctamente en `http://localhost:5000/health`

---

## 📋 Pasos para Completar la Solución

### 1. Reiniciar el Frontend

**IMPORTANTE**: El frontend debe reiniciarse para que tome los cambios.

1. Si el frontend está corriendo, presiona `Ctrl+C`
2. Reinicia el frontend:
   ```powershell
   cd C:\Users\alvar\Opaloats
   npm run dev
   ```

### 2. Verificar que el Backend Esté Corriendo

Abre en el navegador: `http://localhost:5000/health`

Deberías ver:
```json
{
  "status": "ok",
  "timestamp": "2026-01-08T...",
  "service": "Opalo ATS Backend - Google Drive API"
}
```

### 3. Probar la Conexión con Google Drive

1. Abre la app en `http://localhost:3001`
2. Ve a **Settings** → **Almacenamiento de Archivos**
3. Haz clic en **"Conectar con Google Drive"**
4. Debería abrir una ventana popup y redirigir a Google

---

## ✅ Checklist

- [x] Backend corriendo en puerto 5000
- [x] `lib/googleDrive.ts` corregido (puerto 5000)
- [x] `.env.local` tiene `VITE_API_URL=http://localhost:5000`
- [ ] Frontend reiniciado (debes hacerlo manualmente)
- [ ] Backend responde en `http://localhost:5000/health`
- [ ] Conexión con Google Drive probada

---

## 🐛 Si Aún No Funciona

### Verificar que el Backend Esté Corriendo

```powershell
# Verificar puerto 5000
Get-NetTCPConnection -LocalPort 5000

# Si no hay nada, iniciar backend:
cd Opalo-ATS\backend
npm run dev
```

### Verificar Variables de Entorno

```powershell
# Verificar .env.local
Get-Content .env.local | Select-String "VITE_API_URL"

# Debe mostrar:
# VITE_API_URL=http://localhost:5000
```

### Verificar en el Navegador

1. Abre DevTools (F12)
2. Ve a la pestaña **Network**
3. Intenta conectar con Google Drive
4. Busca requests a `localhost:5000`
5. Si ves errores, compártelos

---

## 🎯 Resumen

**Problema**: Frontend apuntaba a puerto 5001, backend en 5000
**Solución**: Corregido `lib/googleDrive.ts` y verificado `.env.local`
**Acción requerida**: Reiniciar el frontend

