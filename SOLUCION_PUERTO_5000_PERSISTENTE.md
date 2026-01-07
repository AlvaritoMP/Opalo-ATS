# 🔧 Solución: Puerto 5000 Sigue Ocupado

## 🔴 Problema

Aunque terminaste el proceso, el puerto 5000 sigue ocupado. Esto puede deberse a:

1. El proceso se reinició automáticamente
2. Hay múltiples procesos usando el puerto
3. El proceso está en un estado "zombie"

---

## ✅ Soluciones

### Solución 1: Terminar Todos los Procesos Node.js

```powershell
# Ver todos los procesos Node.js
Get-Process -Name node

# Terminar todos los procesos Node.js
Get-Process -Name node | Stop-Process -Force
```

**⚠️ CUIDADO**: Esto terminará TODOS los procesos Node.js, incluyendo otros proyectos que estés corriendo.

### Solución 2: Usar el Backend de Opalopy (Recomendado)

Si el backend de Opalopy ya está corriendo y funcionando:

1. **Verifica que funcione**: `http://localhost:5000/health`
2. **Úsalo para Opalo ATS también** (backend compartido)
3. **No necesitas iniciar otro backend**

### Solución 3: Cambiar el Puerto del Backend de Opalo ATS

Si prefieres usar un puerto diferente:

1. **Edita** `Opalo-ATS/backend/.env`:
   ```env
   PORT=5001
   ```

2. **Actualiza** `Opalo-ATS/.env.local`:
   ```env
   VITE_API_URL=http://localhost:5001
   ```

3. **Actualiza Google Cloud Console**:
   - Agrega: `http://localhost:5001/api/auth/google/callback`

4. **Inicia el backend**:
   ```bash
   npm run dev
   ```

### Solución 4: Reiniciar la Computadora

Si nada funciona, reinicia tu computadora para liberar todos los puertos.

---

## 🎯 Recomendación

**Usa el backend compartido de Opalopy**:

1. **Verifica** que `http://localhost:5000/health` funcione
2. **Si funciona**, úsalo para Opalo ATS
3. **No necesitas iniciar otro backend**

El backend compartido ya está configurado y funcionando. Solo necesitas verificar que acepte requests de `http://localhost:3001` (Opalo ATS).

---

## 🔍 Verificar Backend Compartido

1. **Abre**: `http://localhost:5000/health`
2. **Debería responder** con JSON
3. **Prueba**: `http://localhost:5000/api/auth/google/drive`
4. **Debería redirigir** a Google (no mostrar error)

Si todo funciona, **usa ese backend** para Opalo ATS.

