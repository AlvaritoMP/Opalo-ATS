# ✅ Solo Agregar VITE_API_URL

## 🎯 Situación

Tu app **ya está funcionando** con Supabase, lo que significa que ya tienes `.env.local` configurado. Solo necesitas **agregar una línea** para Google Drive.

---

## 📝 Qué Hacer

### Opción 1: Si Ya Tienes `.env.local`

1. **Abre el archivo**: `Opalo-ATS/.env.local`
2. **Agrega esta línea** al final del archivo:
   ```env
   VITE_API_URL=http://localhost:5000
   ```
3. **Guarda el archivo**
4. **Reinicia el frontend** (Ctrl+C y luego `npm run dev`)

### Opción 2: Si No Tienes `.env.local` (Poco Probable)

Si por alguna razón no tienes `.env.local` pero la app funciona, créalo con:

```env
# Supabase (las credenciales que ya estás usando)
VITE_SUPABASE_URL=tu_supabase_url_actual
VITE_SUPABASE_ANON_KEY=tu_supabase_anon_key_actual

# Backend API URL (NUEVO - solo para Google Drive)
VITE_API_URL=http://localhost:5000
```

---

## ✅ Verificación

Después de agregar `VITE_API_URL`:

1. **Reinicia el frontend**
2. **Abre la consola del navegador** (F12)
3. **Ve a Settings** → **Almacenamiento de Archivos**
4. **Haz clic en "Conectar con Google Drive"**
5. **En la consola**, deberías ver que intenta conectarse a `http://localhost:5000/api/auth/google/drive`

---

## 📋 Resumen

**Solo necesitas agregar**:
```env
VITE_API_URL=http://localhost:5000
```

**No necesitas cambiar nada más** si la app ya funciona con Supabase.

---

## 🆘 Si No Funciona

1. **Verifica que el backend esté corriendo**: `http://localhost:5000/health`
2. **Verifica que agregaste la línea correctamente** en `.env.local`
3. **Reinicia el frontend** después de editar `.env.local`
4. **Revisa la consola del navegador** (F12) para ver errores

