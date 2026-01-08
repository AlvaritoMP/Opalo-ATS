# 🔧 Solución: Carpeta "ATS Pro" en lugar de "Opalo ATS"

## ❌ Problema

Después de conectar Google Drive, la app muestra:
- Carpeta raíz: **"ATS Pro"** (de Opalopy)
- Debería mostrar: **"Opalo ATS"**

## 🔍 Causa

La función `getOrCreateRootFolder` estaba encontrando la carpeta "ATS Pro" que ya existía de Opalopy, en lugar de buscar específicamente "Opalo ATS".

**Problema en la búsqueda**:
- La búsqueda no era case-sensitive
- No verificaba el nombre exacto
- Encontraba "ATS Pro" y la devolvía

## ✅ Solución Aplicada

He modificado `Opalo-ATS/backend/src/config/googleDrive.js` para que:

1. **Busque EXACTAMENTE "Opalo ATS"** (case-sensitive)
2. **Verifique que el nombre coincida exactamente** antes de devolver la carpeta
3. **Si no encuentra "Opalo ATS"**, cree una nueva carpeta con ese nombre
4. **Ignore "ATS Pro"** si existe

### Cambios Realizados

**Antes**:
```javascript
// Encontraba cualquier carpeta que coincidiera parcialmente
if (searchResponse.data.files && searchResponse.data.files.length > 0) {
    return searchResponse.data.files[0].id; // Podía devolver "ATS Pro"
}
```

**Después**:
```javascript
// Verifica que el nombre coincida EXACTAMENTE
const exactMatch = searchResponse.data.files.find(f => f.name === folderName);
if (exactMatch) {
    return exactMatch.id; // Solo devuelve si es "Opalo ATS"
}
// Si no encuentra "Opalo ATS", crea una nueva
```

---

## 📋 Pasos para Aplicar la Solución

### 1. Reiniciar el Backend ⚠️ CRÍTICO

1. Ve a la terminal donde está corriendo el backend
2. Presiona `Ctrl+C` para detenerlo
3. Reinicia:
   ```powershell
   cd Opalo-ATS\backend
   npm run dev
   ```

### 2. Desconectar y Reconectar Google Drive

1. En la app, ve a **Settings** → **Almacenamiento de Archivos**
2. Haz clic en **"Desconectar"**
3. Espera a que se desconecte
4. Haz clic en **"Conectar con Google Drive"** nuevamente
5. Autoriza en Google
6. Ahora debería crear/usar la carpeta **"Opalo ATS"** en lugar de "ATS Pro"

### 3. Verificar

Después de reconectar, deberías ver:
- ✅ Carpeta raíz: **"Opalo ATS"**
- ✅ NO debería mostrar "ATS Pro"

---

## 🎯 Resultado Esperado

Después de aplicar la solución:

1. **Primera conexión**: Crea la carpeta "Opalo ATS" en Google Drive
2. **Conexiones siguientes**: Encuentra y usa la carpeta "Opalo ATS"
3. **"ATS Pro"**: Se ignora completamente (sigue existiendo pero no se usa)

---

## 🔍 Verificación Manual

Si quieres verificar en Google Drive:

1. Ve a tu Google Drive
2. Busca la carpeta **"Opalo ATS"** (debería existir)
3. La carpeta **"ATS Pro"** también existe, pero la app no la usará

---

## ⚠️ Nota sobre Carpetas Existentes

- **"ATS Pro"**: Sigue existiendo en Google Drive (de Opalopy), pero Opalo ATS no la usará
- **"Opalo ATS"**: Nueva carpeta creada específicamente para Opalo ATS
- **Ambas pueden coexistir** sin problemas

---

## 🐛 Si Aún Muestra "ATS Pro"

### Opción 1: Renombrar Manualmente en Google Drive

1. Ve a Google Drive
2. Busca la carpeta "ATS Pro"
3. Renómbrala a "Opalo ATS" (si quieres reutilizarla)
4. O créala manualmente como "Opalo ATS"

### Opción 2: Usar el Selector de Carpetas

1. En Settings → Almacenamiento de Archivos
2. Haz clic en **"Cambiar"** junto a "Carpeta raíz"
3. Selecciona "Opalo ATS" de la lista
4. O crea una nueva carpeta

---

## ✅ Checklist

- [x] Código corregido en `googleDrive.js`
- [ ] Backend reiniciado (debes hacerlo manualmente)
- [ ] Google Drive desconectado y reconectado
- [ ] Carpeta raíz muestra "Opalo ATS" (no "ATS Pro")
- [ ] Carpetas se crean dentro de "Opalo ATS"

---

## 🎯 Resumen

**Problema**: Encontraba "ATS Pro" en lugar de "Opalo ATS"
**Solución**: Búsqueda exacta y case-sensitive de "Opalo ATS"
**Acción requerida**: Reiniciar backend y reconectar Google Drive

