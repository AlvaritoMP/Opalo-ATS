# 🌐 Configurar URL en Supabase Authentication

## ✅ Ubicación Encontrada

Has encontrado **Authentication → URL Configuration** en Supabase.

---

## 📋 Dónde Colocar la URL

### Opción 1: Site URL (Recomendado)

1. En la sección **"Site URL"**
2. Actualiza el campo que actualmente tiene `http://localhost:3000`
3. Cambia a tu URL de producción:
   ```
   https://opalo-atsopalo.bouasv.easypanel.host
   ```
4. Haz clic en **"Save changes"** (botón verde)

### Opción 2: Redirect URLs (También Agregar)

1. En la sección **"Redirect URLs"**
2. Haz clic en **"Add URL"** (botón verde)
3. Agrega tu URL de producción:
   ```
   https://opalo-atsopalo.bouasv.easypanel.host
   ```
4. Haz clic en **"Save"** o **"Add"**

---

## ✅ Configuración Completa

**Site URL:**
```
https://opalo-atsopalo.bouasv.easypanel.host
```

**Redirect URLs:**
```
https://opalo-atsopalo.bouasv.easypanel.host
```

También puedes agregar con wildcard si quieres permitir subdominios:
```
https://*.bouasv.easypanel.host
```

---

## ⚠️ Nota Importante

- **NO agregues** `/` al final de la URL
- **SÍ agrega** `https://` al inicio
- Si tienes `www`, agrega ambas versiones (con y sin www)

---

## 🔄 Después de Configurar

1. **Guarda los cambios**
2. **Espera 2-3 minutos** para que se propaguen
3. **Recarga la app** en producción
4. **Prueba de nuevo**

---

## 📋 Checklist

- [ ] Site URL actualizado con URL de producción
- [ ] Redirect URLs tiene la URL de producción agregada
- [ ] Cambios guardados
- [ ] Esperado 2-3 minutos
- [ ] Probado de nuevo en producción

---

## 🎯 Resumen

**Site URL**: Actualiza `http://localhost:3000` a `https://opalo-atsopalo.bouasv.easypanel.host`

**Redirect URLs**: Agrega `https://opalo-atsopalo.bouasv.easypanel.host`

Después de guardar y esperar unos minutos, debería funcionar.

