# Manual de Usuario - Rol Cliente

## 📋 Introducción

Este manual está dirigido a usuarios con rol **Cliente** del sistema ATS Pro. Te guiará sobre qué puedes y no puedes hacer en la plataforma.

---

## ✅ Secciones Disponibles

Como usuario Cliente, tienes acceso a las siguientes secciones del menú lateral:

### 1. **Panel (Dashboard)**
- Ver estadísticas generales de candidatos
- Ver gráficos de fuentes de candidatos
- Ver gráficos de ubicaciones
- Ver gráficos de procesos
- **Nota:** Solo verás estadísticas de candidatos que están marcados como visibles para clientes

### 2. **Procesos**
- Ver todos los procesos de selección
- Ver el tablero Kanban con las etapas de cada proceso
- Ver candidatos en cada etapa
- **Mover candidatos entre etapas** (arrastrar y soltar)
- Ver documentos del proceso
- **NO puedes:** Crear, editar o eliminar procesos

### 3. **Candidatos**
- Ver lista de todos los candidatos
- Ver detalles de candidatos
- **IMPORTANTE:** Solo verás candidatos que estén marcados como "Visibles para clientes"

### 4. **Calendario**
- Ver eventos de entrevistas programadas
- Ver calendario de actividades

### 5. **Reportes**
- Generar y ver reportes de candidatos
- Exportar datos

### 6. **Comparador**
- Comparar candidatos lado a lado
- Analizar perfiles de candidatos

---

## ❌ Secciones NO Disponibles

Como usuario Cliente, **NO tienes acceso** a:

- ❌ **Archivados** - No puedes ver candidatos archivados
- ❌ **Formularios** - No puedes gestionar formularios de integración
- ❌ **Cartas** - No puedes generar cartas
- ❌ **Importación Masiva** - No puedes importar candidatos masivamente
- ❌ **Usuarios** - No puedes gestionar usuarios
- ❌ **Configuración** - No puedes modificar la configuración del sistema

---

## 🎯 Acciones que PUEDES Realizar

### En Procesos

✅ **Ver procesos de selección**
- Ver todos los procesos activos
- Ver detalles de cada proceso (descripción, rango salarial, nivel de experiencia, etc.)
- Ver documentos adjuntos del proceso

✅ **Mover candidatos entre etapas**
- Arrastrar y soltar candidatos de una etapa a otra
- Mover múltiples candidatos a la vez (selección múltiple)
- El sistema validará que los candidatos tengan los documentos requeridos antes de moverlos

✅ **Ver candidatos en el tablero Kanban**
- Ver todos los candidatos organizados por etapas
- Ver información básica de cada candidato (nombre, foto, etapa actual)

### En Candidatos

✅ **Ver detalles de candidatos**
- Ver información completa del candidato
- Ver historial de movimientos entre etapas
- Ver documentos adjuntos del candidato
- Ver comentarios y conversaciones
- Ver post-its (notas adhesivas)
- Ver checklist de documentos

✅ **Marcar candidatos en etapa crítica como revisados**
- Cuando un candidato llega a una etapa marcada como "crítica", verás una alerta
- Al abrir los detalles del candidato, automáticamente se marca como "revisado"
- Esto hace que la alerta desaparezca solo para ti
- **Nota:** Si un Admin o Reclutador revisa al candidato, la alerta NO desaparece. Solo desaparece cuando un Cliente lo revisa o cuando el candidato se mueve a otra etapa.

✅ **Ver documentos y archivos**
- Ver todos los documentos adjuntos del candidato
- Descargar documentos
- Ver previsualización de documentos

### En Reportes

✅ **Generar reportes**
- Crear reportes personalizados
- Filtrar por proceso, fecha, etc.
- Exportar reportes

### En Comparador

✅ **Comparar candidatos**
- Seleccionar candidatos para comparar
- Ver información lado a lado
- Analizar perfiles

---

## 🚫 Acciones que NO PUEDES Realizar

### Gestión de Procesos

❌ **NO puedes crear procesos**
- Solo Administradores y Reclutadores pueden crear nuevos procesos

❌ **NO puedes editar procesos**
- No puedes modificar información del proceso (título, descripción, etapas, etc.)
- No puedes agregar o eliminar etapas
- No puedes modificar documentos del proceso

❌ **NO puedes eliminar procesos**

### Gestión de Candidatos

❌ **NO puedes crear candidatos**
- Solo Administradores y Reclutadores pueden agregar nuevos candidatos

❌ **NO puedes editar información de candidatos**
- No puedes modificar datos personales (nombre, email, teléfono, etc.)
- No puedes cambiar información profesional (experiencia, salario, etc.)
- No puedes editar documentos adjuntos
- No puedes modificar la fecha de contratación

❌ **NO puedes eliminar candidatos**

❌ **NO puedes descartar candidatos**
- Solo Administradores y Reclutadores pueden descartar candidatos

❌ **NO puedes archivar candidatos**
- Solo Administradores y Reclutadores pueden archivar candidatos

❌ **NO puedes restaurar candidatos archivados**

❌ **NO puedes agregar o eliminar documentos**
- No puedes subir nuevos documentos
- No puedes eliminar documentos existentes

❌ **NO puedes agregar comentarios**
- No puedes agregar comentarios a los candidatos

❌ **NO puedes agregar post-its**
- No puedes agregar notas adhesivas

### Gestión de Usuarios y Configuración

❌ **NO puedes gestionar usuarios**
- No puedes crear, editar o eliminar usuarios
- No puedes cambiar roles de usuarios

❌ **NO puedes acceder a configuración**
- No puedes modificar configuraciones del sistema
- No puedes cambiar integraciones

---

## 👁️ Visibilidad de Candidatos

### Candidatos Visibles

✅ Solo verás candidatos que cumplan **AMBAS** condiciones:
1. El candidato debe estar marcado como **"Visible para clientes"** (`visibleToClients: true`)
2. El candidato NO debe estar archivado

### Candidatos NO Visibles

❌ **NO verás:**
- Candidatos que NO están marcados como "Visible para clientes"
- Candidatos archivados (incluso si antes eran visibles)
- Candidatos descartados (están archivados automáticamente)

**Nota:** Si un candidato que antes era visible se archiva o se quita la marca de "visible para clientes", dejarás de verlo en el sistema.

---

## 🔔 Alertas de Etapas Críticas

### ¿Qué son las etapas críticas?

Algunas etapas en los procesos pueden estar marcadas como **"críticas"**. Esto significa que requieren atención especial cuando un candidato llega a esa etapa.

### ¿Cómo funcionan las alertas?

1. **Cuando un candidato llega a una etapa crítica:**
   - Verás una alerta en el sistema indicando que hay candidatos nuevos en etapa crítica

2. **Al revisar un candidato:**
   - Cuando abres los detalles de un candidato en etapa crítica, automáticamente se marca como "revisado por cliente"
   - La alerta desaparece para ese candidato

3. **Importante:**
   - Si un Administrador o Reclutador revisa al candidato, la alerta **NO desaparece**
   - La alerta solo desaparece cuando:
     - Un Cliente revisa al candidato, O
     - El candidato se mueve a otra etapa (diferente a la crítica)

---

## 📱 Funcionalidades del Tablero Kanban

### Mover Candidatos

✅ **Puedes mover candidatos arrastrándolos:**
- Haz clic y mantén presionado sobre una tarjeta de candidato
- Arrástrala a otra etapa
- Suelta para mover el candidato

### Validación de Documentos

⚠️ **Antes de mover un candidato:**
- El sistema verifica que el candidato tenga todos los documentos requeridos para la nueva etapa
- Si faltan documentos, verás un mensaje de error y el movimiento se cancelará
- Debes asegurarte de que el candidato tenga todos los documentos necesarios antes de moverlo

### Selección Múltiple

✅ **Puedes mover múltiples candidatos a la vez:**
- Haz clic en las tarjetas de candidatos para seleccionarlos
- Los candidatos seleccionados se resaltarán
- Arrastra cualquier candidato seleccionado para moverlos todos a la vez

---

## 📊 Panel (Dashboard)

### Estadísticas Disponibles

En el Panel puedes ver:

1. **Total de Candidatos**
   - Número total de candidatos visibles para ti
   - Filtrado por proceso y fecha (si aplica)

2. **Contratados Filtrados**
   - Candidatos que han llegado a la última etapa del proceso
   - Filtrado por proceso y fecha

3. **Descartados**
   - Total de candidatos descartados en el sistema
   - Este número NO está filtrado (muestra todos los descartados)

4. **Total de Procesos**
   - Número total de procesos activos

### Gráficos Disponibles

- **Fuentes de Candidatos:** Gráfico circular mostrando de dónde provienen los candidatos
- **Ubicaciones:** Gráfico de barras mostrando distribución geográfica
- **Procesos:** Gráfico mostrando distribución por proceso

**Nota:** Todos los gráficos solo muestran datos de candidatos visibles para clientes.

---

## 🔍 Búsqueda y Filtros

### En Procesos

✅ Puedes filtrar candidatos por:
- Proceso específico
- Rango de fechas

### En Candidatos

✅ Puedes buscar candidatos por:
- Nombre
- Email
- Proceso
- Etapa

---

## 📞 Soporte y Ayuda

### Si tienes problemas:

1. **No puedes ver un candidato que deberías ver:**
   - Verifica que el candidato esté marcado como "Visible para clientes"
   - Contacta al Administrador o Reclutador para que active la visibilidad

2. **No puedes mover un candidato:**
   - Verifica que el candidato tenga todos los documentos requeridos
   - Revisa la pestaña "Documentos" en los detalles del candidato

3. **No puedes acceder a una sección:**
   - Algunas secciones están restringidas para clientes
   - Si necesitas acceso, contacta al Administrador

4. **La alerta de etapa crítica no desaparece:**
   - Asegúrate de abrir los detalles del candidato (hacer clic en "Ver")
   - Solo los Clientes pueden hacer desaparecer estas alertas
   - Si un Admin o Reclutador revisa al candidato, la alerta permanecerá

---

## 🔐 Seguridad y Privacidad

### Tu Información

- Tu sesión se mantiene activa mientras uses el sistema
- Puedes cerrar sesión en cualquier momento desde el menú lateral

### Datos que Ves

- Solo verás información de candidatos marcados como visibles
- No puedes acceder a información de candidatos no visibles
- No puedes ver candidatos archivados

---

## 📝 Resumen Rápido

### ✅ PUEDES:
- Ver procesos y candidatos (solo visibles)
- Mover candidatos entre etapas
- Ver detalles completos de candidatos
- Ver reportes y estadísticas
- Comparar candidatos
- Marcar candidatos en etapa crítica como revisados
- Ver calendario de entrevistas

### ❌ NO PUEDES:
- Crear, editar o eliminar procesos
- Crear, editar o eliminar candidatos
- Agregar o eliminar documentos
- Agregar comentarios o post-its
- Descartar o archivar candidatos
- Gestionar usuarios
- Acceder a configuración
- Ver candidatos no visibles o archivados
- Ver secciones: Archivados, Formularios, Cartas, Importación Masiva, Usuarios, Configuración

---

## 💡 Consejos de Uso

1. **Revisa regularmente las alertas de etapas críticas**
   - Estas indican candidatos que requieren tu atención

2. **Usa los filtros para encontrar candidatos específicos**
   - Ahorra tiempo al buscar por proceso o fecha

3. **Compara candidatos antes de tomar decisiones**
   - Usa la herramienta de comparación para analizar perfiles

4. **Mantén los documentos actualizados**
   - Asegúrate de que los candidatos tengan todos los documentos requeridos antes de moverlos

5. **Revisa el historial de movimientos**
   - En los detalles del candidato puedes ver todo su historial en el proceso

---

## 📅 Actualizaciones

Este manual refleja las funcionalidades disponibles en la versión actual del sistema. Si se agregan nuevas funcionalidades o se modifican permisos, este manual será actualizado.

---

**Última actualización:** Diciembre 2024

**Versión del Manual:** 1.0

