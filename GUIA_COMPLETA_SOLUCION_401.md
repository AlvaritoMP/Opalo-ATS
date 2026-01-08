# 🎯 Guía Completa: Solución Error 401

## 🔍 Diagnóstico

Si el **fetch manual funciona** pero la **aplicación da 401**, solo hay **dos explicaciones técnicas posibles**:

1. **Vite no está "viendo" las variables en Easypanel**: La app está enviando una `apikey` que NO es la correcta (posiblemente vacía, de localhost o de Opalopy que ya expiró).
2. **Conflicto de Sesión (JWT)**: El navegador tiene guardado un token de administrador en LocalStorage que pertenece a la app original, y Supabase lo rechaza.

---

## ✅ Soluciones (En Orden de Prioridad)

### 1. Limpiar LocalStorage y Cookies (MÁS RÁPIDO)

**Tiempo estimado**: 2 minutos

Sigue `SOLUCION_LIMPIAR_LOCALSTORAGE.md`

**Resultado esperado**: Si funciona, el problema era la sesión vieja. Si no funciona, continúa con el paso 2.

---

### 2. Corregir Build en Easypanel

**Tiempo estimado**: 5-10 minutos

Sigue `SOLUCION_CORREGIR_BUILD_EASYPANEL.md`

**Pasos clave**:
- Verificar que variables estén **sin comillas**
- Verificar que variables estén como **"Build-time"**
- Redeploy con **limpieza de caché**

---

### 3. Verificar .env en Repositorio

**Tiempo estimado**: 3-5 minutos

Sigue `SOLUCION_VERIFICAR_ENV_REPO.md`

**Pasos clave**:
- Buscar archivos `.env` en el repositorio
- Eliminar o actualizar si contienen `VITE_SUPABASE_URL` o `VITE_SUPABASE_ANON_KEY`
- Asegurar que estén en `.gitignore`

---

## 🔍 Verificación Final

Después de aplicar las soluciones:

1. Abre la app en producción
2. Presiona `F12` > **Network**
3. Busca una petición a `supabase.co/rest/v1/users`
4. Haz clic en la petición > **Headers** > **Request Headers**
5. Verifica que el header `apikey`:
   - ✅ **Existe**
   - ✅ **Tiene un valor** (no está vacío)
   - ✅ **Coincide letra por letra** con la que usaste en el fetch exitoso

---

## 📋 Checklist Completo

- [ ] LocalStorage y Cookies limpiados
- [ ] Variables verificadas en Easypanel (sin comillas, Build-time)
- [ ] Redeploy ejecutado con limpieza de caché
- [ ] Archivos `.env` verificados en repositorio
- [ ] Header `apikey` verificado en Network tab
- [ ] App probada y funcionando

---

## 🎯 Resultado Esperado

Después de aplicar todas las soluciones:

1. ✅ La app carga correctamente
2. ✅ No hay errores 401 en la consola
3. ✅ Puedes hacer login con `admin@opaloats.com` / `admin123`
4. ✅ Los datos se cargan desde Supabase

---

## ⚠️ Si Nada Funciona

Si después de aplicar todas las soluciones sigue el error:

1. Verifica que estás usando el **proyecto correcto** de Supabase
2. Verifica que la **anon key** esté habilitada en Supabase Settings > API
3. Verifica que las **políticas RLS** estén correctamente configuradas (ya las creamos)
4. Contacta soporte de Easypanel si el problema persiste con el build

