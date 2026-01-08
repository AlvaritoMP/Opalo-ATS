# 🔍 Verificar Variables en Network Tab

## ✅ Método Correcto: Verificar Headers de Requests

### Paso 1: Abrir Network Tab

1. Abre la app en producción
2. Abre DevTools (F12)
3. Ve a la pestaña **Network**
4. Si hay requests, haz clic en **"Clear"** para limpiarlos

### Paso 2: Recargar la Página

1. Recarga la página (F5 o Ctrl+R)
2. Observa los requests que aparecen

### Paso 3: Buscar Request a Supabase

1. Busca un request a `supabase.co` (debería aparecer varios)
2. Haz clic en uno de ellos (por ejemplo, el que dice `users` o `processes`)
3. Ve a la pestaña **Headers**

### Paso 4: Verificar Headers

Busca en **"Request Headers"**:

1. **`apikey`**: Debe tener el valor de `VITE_SUPABASE_ANON_KEY`
   - Si está vacío o es `undefined` → Las variables NO están en el build
   - Si tiene un valor → Las variables SÍ están

2. **`Authorization`**: Puede tener `Bearer ...` o estar vacío

### Paso 5: Verificar Response

Ve a la pestaña **Response** o **Preview**:
- Si muestra datos JSON → Funciona correctamente
- Si muestra `{"message":"Invalid API key"}` → La clave es incorrecta o está vacía

---

## 🔍 Qué Buscar

### ✅ Si Funciona Correctamente

**Headers**:
```
apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmaGlpcGx4cXRvZHF4dm1zd29yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4Njg4MTYsImV4cCI6MjA3ODQ0NDgxNn0.r9YmrHHajLsd5YHUkPnmD7UazpvmsW0TfqC5jy0_3ZU
```

**Response**: Datos JSON (usuarios, procesos, etc.)

### ❌ Si NO Funciona

**Headers**:
```
apikey: (vacío o undefined)
```

O

**Response**:
```json
{"message":"Invalid API key","hint":"Double check your Supabase `anon` or `service_role` API key."}
```

---

## 🎯 Interpretación de Resultados

### Caso 1: `apikey` está vacío o es `undefined`

**Problema**: Las variables NO están en el build

**Solución**: 
- Verifica que las variables estén en EasyPanel
- Verifica que estén marcadas como "Build-time"
- Haz rebuild del frontend

### Caso 2: `apikey` tiene un valor pero es diferente al correcto

**Problema**: La clave anon key es incorrecta

**Solución**:
- Ve a Supabase Dashboard → Settings → API
- Copia la clave anon key correcta
- Actualiza `VITE_SUPABASE_ANON_KEY` en EasyPanel
- Haz rebuild

### Caso 3: `apikey` tiene el valor correcto pero sigue dando 401

**Problema**: RLS está bloqueando o hay un problema de permisos

**Solución**:
- Verifica que las políticas RLS estén creadas
- Verifica que el usuario tenga `app_name = 'Opalo ATS'`

---

## 📋 Checklist

- [ ] Network tab abierto
- [ ] Página recargada
- [ ] Request a Supabase encontrado
- [ ] Headers revisados
- [ ] Valor de `apikey` verificado
- [ ] Response revisado

---

## 🎯 Comparte el Resultado

Después de verificar, comparte:
1. ¿Qué valor tiene el header `apikey`? (puedes ocultar parte de la clave si quieres)
2. ¿Está vacío o tiene un valor?
3. ¿Qué muestra el Response?

Con esa información podré darte la solución exacta.

