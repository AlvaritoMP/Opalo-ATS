# Optimización de Compute Hours en Supabase

## 🔴 Problema Identificado

La aplicación estaba consumiendo compute hours de Supabase incluso cuando no había usuarios activos debido a:

1. **Sincronización automática en App.tsx**: Cada 2 minutos se ejecutaban llamadas a `reloadProcesses()` y `reloadCandidates()`
2. **Recarga automática en ProcessList.tsx**: Cada 30 segundos se recargaban los procesos
3. **Múltiples pestañas abiertas**: Cada pestaña ejecutaba sus propios intervalos

### Impacto en Compute Hours

- **Con sincronización cada 2 minutos**: ~720 llamadas/día por pestaña abierta
- **Con recarga cada 30 segundos en ProcessList**: ~2,880 llamadas/día adicionales
- **Total**: Miles de llamadas innecesarias cuando no hay actividad del usuario

## ✅ Solución Implementada

### 1. Sincronización Automática Deshabilitada

**Archivo**: `App.tsx` (líneas ~1536-1591)

- ❌ **ANTES**: Sincronización automática cada 2 minutos
- ✅ **AHORA**: Sincronización manual mediante botón "Actualizar"

**Beneficio**: Elimina ~720 llamadas/día por pestaña abierta

### 2. Recarga Automática Deshabilitada

**Archivo**: `components/ProcessList.tsx` (líneas ~186-195)

- ❌ **ANTES**: Recarga automática cada 30 segundos
- ✅ **AHORA**: Recarga manual mediante botón "Actualizar"

**Beneficio**: Elimina ~2,880 llamadas/día adicionales

## 📊 Reducción Estimada de Compute Hours

### Escenario Típico

**Antes**:
- 1 pestaña abierta 8 horas/día = ~3,600 llamadas/día
- 2 pestañas abiertas = ~7,200 llamadas/día
- Con múltiples usuarios = Miles de llamadas innecesarias

**Después**:
- Solo llamadas cuando el usuario interactúa activamente
- Reducción estimada: **80-95%** en consumo de compute hours

## 🔄 Cómo Funciona Ahora

### Sincronización Manual

Los usuarios pueden actualizar los datos manualmente usando:

1. **Botón "Actualizar" en el Sidebar**: Recarga procesos y candidatos
2. **Botón de recarga en ProcessList**: Recarga solo procesos
3. **Recarga automática al iniciar sesión**: Una vez al cargar la app

### Cuándo se Hacen Llamadas a Supabase

✅ **Sí se hacen llamadas cuando**:
- El usuario inicia sesión (carga inicial)
- El usuario hace clic en "Actualizar"
- El usuario crea/edita/elimina datos
- El usuario navega y necesita datos específicos

❌ **No se hacen llamadas cuando**:
- La pestaña está abierta pero inactiva
- No hay usuarios interactuando
- La app está en background
- Múltiples pestañas están abiertas sin actividad

## 🚀 Opciones Futuras (Si Necesitas Sincronización Automática)

Si en el futuro necesitas sincronización automática, considera estas opciones:

### Opción 1: Sincronización Solo con Actividad del Usuario

```typescript
// Solo sincronizar si el usuario ha interactuado en los últimos 5 minutos
let lastUserActivity = Date.now();

document.addEventListener('click', () => {
    lastUserActivity = Date.now();
});

setInterval(() => {
    const timeSinceActivity = Date.now() - lastUserActivity;
    if (timeSinceActivity < 5 * 60 * 1000) { // 5 minutos
        // Sincronizar
    }
}, 600000); // Cada 10 minutos
```

### Opción 2: Intervalo Muy Largo

```typescript
// Sincronizar cada 15-30 minutos (no cada 2 minutos)
setInterval(() => {
    if (document.visibilityState === 'visible') {
        // Sincronizar
    }
}, 900000); // 15 minutos
```

### Opción 3: Sincronización por Eventos

Usar Supabase Realtime para recibir actualizaciones solo cuando hay cambios reales:

```typescript
const channel = supabase
    .channel('candidates')
    .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'candidates' },
        (payload) => {
            // Actualizar solo cuando hay cambios reales
        }
    )
    .subscribe();
```

## 📝 Verificación

Para verificar que los cambios están funcionando:

1. **Abre las Developer Tools** (F12)
2. **Ve a la pestaña Network**
3. **Filtra por "supabase.co"**
4. **Observa las llamadas**:
   - ✅ Deberías ver llamadas solo cuando interactúas
   - ❌ No deberías ver llamadas cada 2 minutos automáticamente

## ⚠️ Notas Importantes

1. **Los usuarios necesitan hacer clic en "Actualizar"** para ver los últimos cambios
2. **La carga inicial sigue funcionando** al iniciar sesión
3. **Las operaciones CRUD siguen funcionando** normalmente
4. **Si necesitas datos en tiempo real**, considera usar Supabase Realtime (más eficiente que polling)

## 🎯 Resultado Esperado

- ✅ Reducción significativa en compute hours
- ✅ Menor consumo de recursos en Supabase
- ✅ Mejor experiencia cuando hay límites de quota
- ✅ Los usuarios tienen control sobre cuándo actualizar

## 📚 Referencias

- [Supabase Compute Hours Documentation](https://supabase.com/docs/guides/platform/compute-hours)
- [Supabase Realtime Documentation](https://supabase.com/docs/guides/realtime)
- [Optimización de Egress en Supabase](https://supabase.com/docs/guides/platform/egress)

