# 🔍 Verificar si las Variables Están en el Build

## 🎯 Problema

Aunque recreaste las variables y hiciste rebuild, sigue dando error 401. Necesitamos verificar si las variables realmente están en el código compilado.

---

## ✅ Verificación en el Navegador

### Paso 1: Verificar en el Código Compilado

1. Abre la app en producción
2. Abre la consola del navegador (F12)
3. Ve a la pestaña **Sources** o **Sources**
4. Busca archivos en `dist/assets/` o `assets/`
5. Abre uno de los archivos `.js` más grandes
6. Presiona `Ctrl+F` (o `Cmd+F` en Mac) y busca:
   - `afhiiplxqtodqxvmswor.supabase.co`
   - Si encuentras esta URL, las variables SÍ están en el build
   - Si NO la encuentras, las variables NO están en el build

### Paso 2: Verificar en la Consola

Abre la consola del navegador y ejecuta:

```javascript
console.log('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'EXISTS' : 'MISSING');
```

**Si muestra**:
- `VITE_SUPABASE_URL: undefined` o `VITE_SUPABASE_URL: ""` → Las variables NO están en el build
- `VITE_SUPABASE_URL: https://afhiiplxqtodqxvmswor.supabase.co` → Las variables SÍ están

---

## 🔧 Solución Alternativa: Verificar Clave Anon Key

Puede ser que la clave anon key haya cambiado o sea incorrecta. Verifica en Supabase:

1. Ve a **Supabase Dashboard**: https://supabase.com/dashboard
2. Selecciona tu proyecto
3. Ve a **Settings** → **API**
4. Busca **"Project API keys"**
5. Copia la clave **"anon"** o **"anon public"**
6. Compara con la que tienes en EasyPanel

---

## 🐛 Si las Variables NO Están en el Build

Si después de verificar, las variables NO están en el código compilado, puede ser un problema de EasyPanel. Opciones:

### Opción 1: Verificar Build Command

En EasyPanel, verifica que el **Build Command** sea:
```bash
npm ci && npm run build
```

O:
```bash
npm run build
```

### Opción 2: Verificar Root Directory

Verifica que el **Root Directory** sea la raíz del proyecto (no `Opalo-ATS/`).

### Opción 3: Usar Dockerfile

Si EasyPanel no está inyectando las variables correctamente, podemos crear un Dockerfile que las inyecte manualmente.

---

## 📋 Checklist de Verificación

- [ ] Variables recreadas en EasyPanel
- [ ] Rebuild ejecutado
- [ ] Verificado en Sources que la URL de Supabase está en el código
- [ ] Verificado en consola que `import.meta.env.VITE_SUPABASE_URL` tiene valor
- [ ] Verificado en Supabase que la clave anon key es correcta

---

## 🎯 Próximo Paso

Ejecuta la verificación en la consola del navegador y comparte el resultado. Esto nos dirá si el problema es:
1. Variables no están en el build → Problema de EasyPanel
2. Variables están pero la clave es incorrecta → Problema de configuración
3. Variables están y la clave es correcta → Problema de RLS o permisos

