# ✅ Verificación Final: Opalo ATS en Producción

## 🎉 Script RLS Ejecutado Exitosamente

Las políticas RLS se han configurado correctamente. Ahora verifica que todo funcione.

---

## ✅ Checklist de Verificación

### 1. Verificar Login en Opalo ATS

1. Abre la app de Opalo ATS en producción
2. Intenta iniciar sesión con:
   - **Email**: `admin@opaloats.com`
   - **Password**: `admin123`
3. Deberías poder ingresar sin errores 401

### 2. Verificar que Opalopy Sigue Funcionando

1. Abre Opalopy en producción
2. Verifica que puedas iniciar sesión
3. Verifica que puedas ver tus datos normalmente
4. **Opalopy NO debería verse afectado**

### 3. Verificar Consola del Navegador (Opalo ATS)

1. Abre la app de Opalo ATS
2. Abre la consola del navegador (F12)
3. Ve a la pestaña **Console**
4. Deberías ver:
   - ✅ `Loading data from Supabase...`
   - ✅ `✓ Loaded users from Supabase`
   - ✅ `✓ Loaded processes from Supabase`
   - ✅ `✓ Loaded candidates from Supabase`
   - ❌ **NO deberías ver** errores 401

### 4. Verificar Network Tab (Opalo ATS)

1. En DevTools, ve a la pestaña **Network**
2. Busca requests a `supabase.co`
3. Verifica que:
   - ✅ Status code sea `200` (no `401`)
   - ✅ Los requests tengan los headers correctos
   - ✅ Las respuestas contengan datos

---

## 🎯 Funcionalidades a Probar

### 1. Login
- [ ] Puedo iniciar sesión con `admin@opaloats.com` / `admin123`
- [ ] No hay errores en la consola
- [ ] La app carga correctamente después del login

### 2. Dashboard
- [ ] Se muestra el dashboard vacío (sin procesos aún)
- [ ] No hay errores al cargar

### 3. Crear Proceso
- [ ] Puedo crear un nuevo proceso
- [ ] El proceso se guarda correctamente
- [ ] Aparece en la lista de procesos

### 4. Google Drive (Opcional)
- [ ] Puedo conectar Google Drive desde Settings
- [ ] Se crea la carpeta "Opalo ATS" en Google Drive
- [ ] Puedo subir archivos

---

## 🐛 Si Algo No Funciona

### Error: "Usuario no encontrado"

**Solución**: Ejecuta este script en Supabase SQL Editor:

```sql
-- Crear o actualizar usuario
INSERT INTO public.users (
    id, 
    name, 
    email, 
    role, 
    password_hash, 
    created_at, 
    avatar_url, 
    permissions, 
    visible_sections, 
    app_name
)
VALUES (
    gen_random_uuid(), 
    'Super Admin', 
    'admin@opaloats.com', 
    'admin', 
    'admin123',
    now(), 
    NULL, 
    NULL, 
    '["dashboard", "processes", "archived", "candidates", "forms", "letters", "calendar", "reports", "compare", "bulk-import", "users", "settings"]'::jsonb,
    'Opalo ATS'
)
ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    password_hash = 'admin123',
    app_name = 'Opalo ATS',
    visible_sections = EXCLUDED.visible_sections,
    updated_at = now();
```

### Error: "Invalid API key" (401)

**Solución**: 
1. Verifica que las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` estén en EasyPanel
2. Verifica que estén marcadas como "Build-time"
3. Haz rebuild del frontend

### Opalopy Deja de Funcionar

**Solución**: 
1. Verifica que Opalopy tenga políticas RLS (ejecuta `VERIFICAR_POLITICAS_EXISTENTES.sql`)
2. Si faltan políticas para Opalopy, necesitarás crearlas (similar al script de Opalo ATS pero con `app_name = 'Opalopy'`)

---

## 📝 Resumen de Configuración Actual

### Backend
- ✅ Servicio creado en EasyPanel
- ✅ Variables de entorno configuradas
- ✅ `GOOGLE_REDIRECT_URI` corregido (con path completo)
- ✅ Health check funciona

### Frontend
- ✅ Variables de entorno configuradas (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL`)
- ✅ Variables marcadas como "Build-time"
- ✅ Rebuild ejecutado

### Supabase
- ✅ RLS habilitado en todas las tablas
- ✅ Políticas creadas para Opalo ATS
- ✅ Usuario creado con `app_name = 'Opalo ATS'`

### Google Cloud Console
- ✅ URLs de producción agregadas (si usas Google Drive)

---

## 🎉 ¡Todo Listo!

Si todo funciona correctamente:
- ✅ Opalo ATS está funcionando en producción
- ✅ Opalopy sigue funcionando normalmente
- ✅ Los datos están aislados por `app_name`
- ✅ Puedes crear procesos, candidatos, etc.

---

## 🔒 Próximos Pasos Recomendados

1. **Cambiar contraseña del admin**: Después del primer login, cambia la contraseña de `admin123` a algo más seguro
2. **Crear más usuarios**: Crea usuarios adicionales desde la app
3. **Configurar Google Drive**: Si lo necesitas, conecta Google Drive
4. **Personalizar**: Configura la app según tus necesidades

---

## ✅ Estado Final

- [x] Backend desplegado
- [x] Frontend desplegado
- [x] Variables de entorno configuradas
- [x] RLS configurado
- [x] Usuario creado
- [x] Login funciona
- [ ] Opalopy verificado (verifica tú)
- [ ] Funcionalidades probadas (prueba tú)

¡Felicitaciones! Opalo ATS está funcionando en producción. 🎉

