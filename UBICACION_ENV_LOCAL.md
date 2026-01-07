# 📍 Ubicación Correcta del .env.local

## ⚠️ Importante

El archivo `.env.local` debe estar en la **raíz** del proyecto, NO en `backend/`.

---

## ✅ Ubicación Correcta

```
Opalo-ATS/
├── .env.local          ← AQUÍ (raíz del proyecto)
├── backend/
│   └── .env            ← Este es para el backend (diferente)
├── package.json
├── vite.config.ts
└── ...
```

---

## ❌ Ubicación Incorrecta

```
Opalo-ATS/
├── backend/
│   ├── .env            ← Para el backend (correcto)
│   └── .env.local      ← NO aquí (el frontend no lo lee)
└── ...
```

---

## 🔧 Cómo Corregirlo

### Si Tienes `.env.local` en `backend/`:

1. **Copia el contenido** de `Opalo-ATS/backend/.env.local`
2. **Crea el archivo** `Opalo-ATS/.env.local` (en la raíz)
3. **Pega el contenido** ahí
4. **Opcional**: Elimina `Opalo-ATS/backend/.env.local` (no es necesario)

### Contenido de `.env.local` en la Raíz:

```env
# Supabase (si ya lo tienes configurado)
VITE_SUPABASE_URL=tu_supabase_url
VITE_SUPABASE_ANON_KEY=tu_supabase_anon_key

# Backend API URL (para Google Drive)
VITE_API_URL=http://localhost:5000
```

---

## 🔄 Después de Mover el Archivo

1. **Reinicia el frontend**:
   - Presiona `Ctrl+C` en la terminal donde corre
   - Ejecuta: `npm run dev`

2. **Verifica** que el frontend pueda leer las variables

---

## 📝 Diferencia Entre Archivos

| Archivo | Ubicación | Para Qué |
|---------|-----------|----------|
| `.env.local` | `Opalo-ATS/.env.local` | Variables del **frontend** (VITE_*) |
| `.env` | `Opalo-ATS/backend/.env` | Variables del **backend** (GOOGLE_CLIENT_ID, etc.) |

**El frontend NO lee** variables desde `backend/.env.local`.

