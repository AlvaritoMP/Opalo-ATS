# 🔍 Verificar Headers en Network Tab

## Paso 1: Abrir DevTools

1. Abre la app en producción: `https://opalo-atsopalo.bouasv.easypanel.host`
2. Presiona `F12` para abrir DevTools
3. Ve a la pestaña **Network**

## Paso 2: Filtrar Peticiones

1. En el campo de búsqueda de Network, escribe: `supabase`
2. Esto filtrará solo las peticiones a Supabase

## Paso 3: Hacer una Petición

1. Intenta hacer login o simplemente recarga la página
2. Verás varias peticiones a `supabase.co/rest/v1/...`

## Paso 4: Inspeccionar Headers

1. Haz clic en una petición (por ejemplo, `users?select=*&app_name=eq.Opalo+ATS`)
2. Ve a la pestaña **Headers**
3. Busca la sección **Request Headers**

## Paso 5: Verificar Headers Importantes

Debes ver estos headers:

### ✅ Header `apikey` (CRÍTICO)
```
apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
- **Debe existir**
- **Debe tener un valor** (no vacío)
- **Debe ser tu anon key completa**

### ✅ Header `Authorization` (Opcional)
```
Authorization: Bearer [token] o vacío
```
- Puede estar vacío si no hay sesión
- No es crítico para queries básicas

### ✅ Header `Origin`
```
Origin: https://opalo-atsopalo.bouasv.easypanel.host
```
- Debe coincidir con tu URL de producción

### ✅ Header `Content-Type`
```
Content-Type: application/json
```
- Debe estar presente

---

## ❌ Problemas Comunes

### Problema 1: No hay header `apikey`
**Causa**: La API key no está en el build
**Solución**: 
1. Verifica que `VITE_SUPABASE_ANON_KEY` esté como "Build-time" en EasyPanel
2. Reconstruye la app

### Problema 2: Header `apikey` está vacío
**Causa**: La variable de entorno está vacía o incorrecta
**Solución**:
1. Verifica la variable en EasyPanel
2. Copia la anon key desde Supabase Dashboard
3. Pégala en EasyPanel (sin espacios)
4. Reconstruye la app

### Problema 3: Header `apikey` tiene valor incorrecto
**Causa**: La API key en EasyPanel no coincide con Supabase
**Solución**:
1. Compara carácter por carácter
2. Actualiza en EasyPanel
3. Reconstruye la app

---

## 📸 Captura de Pantalla

Toma una captura de pantalla de los **Request Headers** y compártela para diagnosticar mejor.

