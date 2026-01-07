# 🔧 Liberar Puerto 3001

## 🎯 Objetivo

Liberar el puerto 3001 para que Opalo ATS pueda correr en ese puerto (necesario para Google Drive).

---

## 📋 Métodos para Liberar el Puerto

### Método 1: PowerShell (Recomendado)

```powershell
# Ver qué proceso usa el puerto 3001
Get-NetTCPConnection -LocalPort 3001 | Select-Object OwningProcess

# Terminar el proceso (reemplaza PID con el número que veas)
Stop-Process -Id PID -Force
```

### Método 2: Desde el Administrador de Tareas

1. Presiona `Ctrl+Shift+Esc` para abrir el Administrador de Tareas
2. Ve a la pestaña "Detalles"
3. Busca procesos que puedan estar usando el puerto (Node.js, Vite, etc.)
4. Haz clic derecho → "Finalizar tarea"

### Método 3: Comando netstat

```powershell
# Ver qué proceso usa el puerto
netstat -ano | findstr :3001

# Terminar el proceso (reemplaza PID con el número que veas)
taskkill /PID PID /F
```

---

## ✅ Después de Liberar el Puerto

1. **Reinicia el frontend**:
   ```bash
   cd Opalo-ATS
   npm run dev
   ```

2. **Debería iniciar en puerto 3001**:
   ```
   VITE v6.x.x  ready in xxx ms
   
   ➜  Local:   http://localhost:3001/
   ```

---

## 🔍 Verificar que el Puerto Está Libre

```powershell
Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
```

Si no devuelve nada, el puerto está libre.

---

## ⚠️ Si el Puerto Sigue Ocupado

1. **Verifica que no haya otra instancia de Vite corriendo**
2. **Cierra todas las terminales** que puedan tener procesos corriendo
3. **Reinicia tu editor** (a veces procesos quedan en background)
4. **Reinicia tu computadora** (último recurso)

---

## 📝 Nota

He configurado `vite.config.ts` con `strictPort: true` para que falle si el puerto está ocupado en lugar de usar otro puerto. Esto te ayudará a identificar si hay un problema.

