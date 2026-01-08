# 🔍 Verificar Variables en Sources Tab

## ✅ Método Alternativo: Buscar en el Código Compilado

### Paso 1: Abrir Sources Tab

1. Abre la app en producción
2. Abre DevTools (F12)
3. Ve a la pestaña **Sources** (o **Sources** en algunos navegadores)

### Paso 2: Buscar Archivos JavaScript

1. En el panel izquierdo, busca la carpeta del sitio web
2. Busca archivos en `assets/` o `dist/assets/`
3. Busca archivos `.js` grandes (pueden tener nombres como `index-xxxxx.js`)

### Paso 3: Buscar la URL de Supabase

1. Abre uno de los archivos `.js` más grandes
2. Presiona `Ctrl+F` (o `Cmd+F` en Mac) para buscar
3. Busca: `afhiiplxqtodqxvmswor`
4. Si encuentras esta URL → Las variables SÍ están en el build
5. Si NO la encuentras → Las variables NO están en el build

### Paso 4: Buscar la Clave Anon Key

1. En el mismo archivo, busca: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9`
2. Si encuentras esta cadena → La clave SÍ está en el build
3. Si NO la encuentras → La clave NO está en el build

---

## 🎯 Interpretación

### Si encuentras AMBOS (URL y clave):
✅ Las variables están en el build
→ El problema es otro (RLS, permisos, etc.)

### Si NO encuentras NINGUNO:
❌ Las variables NO están en el build
→ EasyPanel no está inyectando las variables
→ Necesitas verificar la configuración de EasyPanel

### Si encuentras la URL pero NO la clave:
❌ Solo `VITE_SUPABASE_URL` está en el build
→ `VITE_SUPABASE_ANON_KEY` no se está inyectando
→ Verifica esta variable específicamente en EasyPanel

---

## 📋 Resultado

Comparte qué encontraste:
- [ ] Encontré la URL de Supabase
- [ ] Encontré la clave anon key
- [ ] No encontré ninguna de las dos
- [ ] Encontré la URL pero no la clave

