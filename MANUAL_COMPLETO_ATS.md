# Manual completo — Opalo ATS

**Versión:** 2.0  
**Fecha:** Junio 2026  
**Producto:** Opalo ATS (Applicant Tracking System)

Este documento describe el funcionamiento completo del sistema: qué hace cada sección, cada botón y cada opción, según el rol del usuario. Complementa los manuales anteriores (`MANUAL_USUARIO.md`, `MANUAL_SUPER_ADMIN.md`, `MANUAL_USUARIO_CLIENTE.md`) con las funcionalidades actuales del código.

---

## Índice

1. [¿Qué es Opalo ATS?](#1-qué-es-opalo-ats)
2. [Acceso e interfaz general](#2-acceso-e-interfaz-general)
3. [Roles, permisos y secciones visibles](#3-roles-permisos-y-secciones-visibles)
4. [Panel (Dashboard)](#4-panel-dashboard)
5. [Procesos (reclutamiento Kanban)](#5-procesos-reclutamiento-kanban)
6. [Procesos masivos (tabla de alto volumen)](#6-procesos-masivos-tabla-de-alto-volumen)
7. [Candidatos](#7-candidatos)
8. [Archivados](#8-archivados)
9. [Formularios (integraciones)](#9-formularios-integraciones)
10. [Cartas](#10-cartas)
11. [Calendario](#11-calendario)
12. [Reportes](#12-reportes)
13. [Comparador](#13-comparador)
14. [Importación masiva](#14-importación-masiva)
15. [Envíos OpsFlow](#15-envíos-opsflow)
16. [Usuarios (solo administradores)](#16-usuarios-solo-administradores)
17. [Configuración (solo administradores)](#17-configuración-solo-administradores)
18. [Google Drive y archivos](#18-google-drive-y-archivos)
19. [Flujos de trabajo recomendados](#19-flujos-de-trabajo-recomendados)
20. [Preguntas frecuentes](#20-preguntas-frecuentes)

---

## 1. ¿Qué es Opalo ATS?

Opalo ATS es un sistema de seguimiento de candidatos (Applicant Tracking System) para gestionar reclutamiento de punta a punta:

| Capacidad | Descripción |
|-----------|-------------|
| **Procesos normales** | Tablero Kanban por etapas (arrastrar candidatos). |
| **Procesos masivos** | Tabla editable tipo hoja de cálculo para miles de postulantes. |
| **Candidatos** | Ficha completa, documentos, entrevistas, comentarios, historial. |
| **Integraciones** | Formularios externos (Tally, Google Forms, etc.) que crean candidatos automáticamente. |
| **Cartas y reportes** | Generación de documentos Word/PDF con datos del candidato. |
| **OpsFlow** | Envío de candidatos contratados o seleccionados hacia el sistema OpsFlow. |
| **Google Drive** | Almacenamiento de adjuntos, cartas y reportes en carpetas organizadas. |

Los datos viven en **Supabase** (base de datos). Los archivos pueden guardarse en Google Drive (recomendado) o en almacenamiento local embebido en la base de datos.

---

## 2. Acceso e interfaz general

### 2.1 Iniciar sesión

1. Abra la URL de la aplicación (proporcionada por su administrador).
2. Ingrese **correo electrónico** y **contraseña**.
3. Pulse **Iniciar sesión**.
4. Si olvidó la contraseña, contacte al administrador (no hay recuperación automática en la app).

### 2.2 Menú lateral (sidebar)

El menú izquierdo muestra solo las secciones que su usuario tiene habilitadas. Orden habitual:

| Ícono / sección | Nombre por defecto | Función |
|-----------------|-------------------|---------|
| Cuadrícula | **Panel** | Estadísticas y gráficos. |
| Maletín | **Procesos** | Procesos Kanban normales. |
| Cuadrícula 3×3 | **Procesos Masivos** | Tablas de reclutamiento masivo. |
| Archivo | **Archivados** | Candidatos archivados. |
| Personas | **Candidatos** | Listado global de candidatos. |
| Enviar | **Envíos OpsFlow** | Historial de paquetes enviados a OpsFlow. |
| Documento | **Formularios** | Integraciones con formularios web. |
| Documento | **Cartas** | Generador de cartas Word. |
| Calendario | **Calendario** | Entrevistas y eventos. |
| Gráfico | **Reportes** | Exportación y reportes. |
| Gráfico | **Comparador** | Comparación visual de candidatos. |
| Subir archivo | **Importación Masiva** | Importar candidatos desde Excel. |
| Personas | **Usuarios** | Gestión de usuarios (admin). |
| Engranaje | **Configuración** | Ajustes del sistema (admin). |

**Pie del menú:**

| Botón | Función |
|-------|---------|
| **Colapsar menú** (flechas ‹ ›) | Reduce el sidebar a solo iconos. |
| **Actualizar** (icono refrescar) | Recarga procesos y candidatos desde el servidor. Útil si otro usuario hizo cambios. |
| **Cerrar sesión** (icono salir) | Cierra la sesión actual. |
| **POWERED BY** | Logo opcional configurado en Configuración. |

En **móvil**, el botón **hamburguesa** (esquina superior izquierda) abre el menú; el overlay oscuro lo cierra al tocar fuera.

### 2.3 Nombre y textos personalizados

El administrador puede cambiar etiquetas del menú y pantallas en **Configuración → UI Labels** (por ejemplo, renombrar "Procesos" por "Vacantes").

---

## 3. Roles, permisos y secciones visibles

### 3.1 Roles predeterminados

| Rol | Descripción breve |
|-----|-------------------|
| **admin** | Acceso total: usuarios, configuración, Google Drive, todos los módulos. |
| **recruiter** (Reclutador) | Gestión operativa de procesos, candidatos, formularios, cartas, masivos y OpsFlow. Sin usuarios ni configuración global. |
| **client** (Cliente) | Ve procesos y candidatos visibles para cliente; puede mover candidatos en el tablero; no crea ni elimina. |
| **viewer** (Consulta) | Solo lectura en las secciones que tenga visibles. |

### 3.2 Secciones visibles por defecto

| Sección | admin | recruiter | client | viewer |
|---------|:-----:|:---------:|:------:|:------:|
| Panel | ✓ | ✓ | ✓ | ✓ |
| Procesos | ✓ | ✓ | ✓ | ✓ |
| Procesos Masivos | ✓ | ✓ | — | — |
| Archivados | ✓ | ✓ | — | — |
| Candidatos | ✓ | ✓ | ✓ | ✓ |
| Envíos OpsFlow | ✓ | ✓ | — | — |
| Formularios | ✓ | ✓ | — | — |
| Cartas | ✓ | ✓ | — | — |
| Calendario | ✓ | ✓ | ✓ | ✓ |
| Reportes | ✓ | ✓ | ✓ | ✓ |
| Comparador | ✓ | ✓ | ✓ | — |
| Importación Masiva | ✓ | ✓ | — | — |
| Usuarios | ✓ | — | — | — |
| Configuración | ✓ | — | — | — |

El administrador puede **personalizar** secciones y permisos por usuario al crearlo o editarlo.

### 3.3 Permisos granulares (por categoría)

Al editar un usuario se pueden activar permisos personalizados:

| Categoría | Permisos disponibles |
|-----------|---------------------|
| **Procesos** | Ver, Crear, Editar, Eliminar |
| **Candidatos** | Ver, Crear, Editar, Eliminar, Archivar, Exportar |
| **Calendario** | Ver, Crear, Editar, Eliminar |
| **Reportes** | Ver, Exportar |
| **Usuarios** | Ver, Crear, Editar, Eliminar |
| **Configuración** | Ver, Editar |
| **Cartas** | Ver, Crear, Descargar |
| **Comparador** | Ver, Exportar |
| **Formularios** | Ver, Editar |

### 3.4 Restricción por cliente

Un usuario puede limitarse a **clientes específicos** (razón social / RUC configurados en Configuración). Solo verá procesos (normales o masivos) asignados a esos clientes.

### 3.5 Visibilidad para clientes externos

En la ficha del candidato existe el interruptor **Visible para clientes**. Los usuarios con rol **client** o **viewer** solo ven candidatos con esta opción activada (en listados y tableros filtrados).

---

## 4. Panel (Dashboard)

**Menú → Panel**

Vista analítica del estado del reclutamiento. Se actualiza con los datos cargados en sesión; use **Actualizar** en el menú si necesita datos en tiempo real.

### 4.1 Tarjetas de resumen

Métricas típicas (pueden variar según configuración):

- Total de procesos activos.
- Total de candidatos.
- Candidatos activos (no archivados).
- Entrevistas próximas.
- Métricas de procesos masivos (contacto, contrataciones, etc.).

### 4.2 Gráficos

| Gráfico | Qué muestra |
|---------|-------------|
| Candidatos por proceso | Distribución en cada vacante. |
| Candidatos por fuente | LinkedIn, referido, sitio web, etc. |
| Candidatos por etapa | Embudo del pipeline. |
| Ubicación / distrito | Concentración geográfica. |
| Edad | Distribución etaria. |
| Contacto (masivos) | Intentos por canal (teléfono, email, WhatsApp), por consultor y tendencia diaria. |
| Entrevistas | Estadísticas de agendamiento. |
| Eficiencia | Tiempos entre publicación, postulación y contratación (cuando hay fechas registradas). |

Si no hay datos para los filtros activos, aparece el mensaje *"Sin datos para los filtros seleccionados"*.

### 4.3 Filtros

Permiten acotar estadísticas por período, proceso o consultor (según implementación en pantalla).

---

## 5. Procesos (reclutamiento Kanban)

**Menú → Procesos**

Gestiona **procesos normales** (no masivos): cada proceso es una vacante o proyecto de selección con etapas en columnas tipo Kanban.

### 5.1 Lista de procesos

Cada tarjeta de proceso muestra:

- Imagen de portada (flyer).
- Título y estado: **En Proceso**, **Stand By**, **Terminado**.
- Cantidad de candidatos.
- Vacantes y fechas.
- Alerta ámbar si hay candidatos en **etapas críticas** sin revisar.

**Botones en la lista:**

| Botón | Función |
|-------|---------|
| **Nuevo Proceso** | Abre el editor para crear un proceso vacío. |
| **Buscar** | Filtra procesos por nombre. |
| **Actualizar** (icono) | Recarga la lista desde el servidor. |
| **Menú ⋮** (en cada tarjeta) | Ver tablero, Editar, Duplicar, Eliminar. |

**Duplicar proceso:** copia configuración y etapas; los candidatos no se copian automáticamente.

**Eliminar proceso:** borra el proceso y **todos sus candidatos** (acción irreversible). Confirme en el diálogo.

### 5.2 Crear / editar proceso (modal)

Campos principales:

| Campo | Para qué sirve |
|-------|----------------|
| **Título** | Nombre visible del proceso (ej. "Analista contable"). |
| **Descripción** | Detalle del puesto o requisitos. |
| **Cliente** | Empresa cliente asociada (desde catálogo en Configuración). |
| **Código OS** | Orden de servicio / código interno. |
| **Rango salarial** | Referencia salarial (usa símbolo de moneda de Configuración). |
| **Nivel de experiencia** | Junior, semi-senior, senior, etc. |
| **Seniority** | Nivel jerárquico adicional. |
| **Fechas** | Inicio, fin, publicación, identificación de necesidad. |
| **Estado** | En proceso / Stand by / Terminado. |
| **Vacantes** | Número de plazas a cubrir. |
| **Flyer / imagen** | Portada de la tarjeta; se puede ajustar posición arrastrando en el editor de imagen. |
| **Etapas** | Columnas del Kanban: nombre, color, orden (arrastrar ⋮⋮), marcar como **crítica** o **requerida para avanzar**. |
| **Categorías de documentos** | Tipos de adjuntos obligatorios por etapa (CV, DNI, etc.). |
| **Carpeta Google Drive** | Carpeta donde se guardan documentos del proceso y candidatos. |
| **Adjuntos del proceso** | Documentos generales (bases, perfiles) subidos al proceso. |

**Botones del modal:** Guardar, Cancelar, Agregar etapa, Agregar categoría, Subir adjunto, Seleccionar/crear carpeta en Drive.

### 5.3 Vista tablero (board)

Al abrir un proceso ve columnas = **etapas**. Cada candidato es una tarjeta.

**Barra superior del tablero:**

| Botón | Función |
|-------|---------|
| **← Volver** | Regresa a la lista de procesos. |
| **Emitir cartas** | Solo si hay candidatos seleccionados (checkbox). Genera cartas masivas. |
| **Comunicar** | Envía comunicación a seleccionados o abre comunicación masiva del proceso. |
| **Comunicación masiva** | Mensaje/email al grupo del proceso. |
| **Cerrar proceso** / **Gestionar contratados** | Si está terminado, gestiona quiénes quedaron contratados; si no, inicia cierre marcando contratados. |
| **Ver documentos** | Adjuntos del proceso (contador entre paréntesis). |
| **Editar proceso** | Abre el modal de edición. |
| **Añadir candidato** | Formulario de alta manual. |

**Chips informativos:** OS, seniority, salario, experiencia, rango de fechas, vacantes.

**Por columna (etapa):**

| Control | Función |
|---------|---------|
| **Descargar** (icono en encabezado) | Exporta candidatos de esa etapa a Excel (.xlsx). |
| **Contador** | Número de candidatos en la etapa. |

**Mover candidatos:** arrastre la tarjeta a otra columna (requiere permiso de edición). El historial registra usuario y fecha.

### 5.4 Tarjeta de candidato en el tablero

| Elemento | Función |
|----------|---------|
| **Checkbox** | Selecciona para cartas masivas o comunicación. |
| **Clic en tarjeta** | Abre ficha completa (modal). |
| **Post-it** (nota adhesiva) | Notas rápidas de color; el borde amarillo indica que hay notas. |
| **X (descartar)** | Marca candidato como descartado con motivo. |
| **Teléfono** | Copiar, llamar, WhatsApp mensaje, WhatsApp llamada (si está configurado en el proceso). |

### 5.5 Cierre de proceso

Al **Cerrar proceso** selecciona qué candidatos fueron **contratados**. El proceso pasa a **Terminado** y se guardan los IDs de contratados. Luego puede usar **Gestionar candidatos contratados** para ajustar la lista.

---

## 6. Procesos masivos (tabla de alto volumen)

**Menú → Procesos Masivos**

Módulo para campañas con **miles de postulantes**: tabla editable, columnas personalizadas, contacto multicanal, rutas de transporte, perfil ideal, evaluación psicolaboral e integración OpsFlow.

> Los procesos marcados como masivos (`isBulkProcess`) **no** aparecen en Procesos normales; solo aquí.

### 6.1 Lista de procesos masivos

- Tarjetas con resumen del proceso masivo.
- **Crear proceso masivo** abre editor específico (columnas, etapas, cliente, flyer, etc.).
- Al entrar a un proceso se abre la **tabla principal**.

### 6.2 Barra de herramientas de la tabla

| Botón / control | Función |
|-----------------|---------|
| **← Volver** | Lista de procesos masivos. |
| **Editar proceso** | Configuración del proceso masivo. |
| **Documentos del proceso** | Adjuntos compartidos del proceso. |
| **Deshacer (Ctrl+Z)** | Revierte última edición de celdas (pila limitada). |
| **Agregar columna** | Columna personalizada (texto, número, fecha, lista, etc.). |
| **Editar columnas** | Renombrar, cambiar tipo, opciones de listas. |
| **Plantillas de tabla** | Guardar/cargar diseño de columnas (orden, ocultas, fijadas). |
| **Recuperar columnas** | Restaura layout desde respaldo local o plantilla **sin borrar candidatos**. |
| **Configurar columnas** | Mostrar/ocultar, fijar columnas a la izquierda. |
| **Añadir fila** | Nuevo candidato con campos básicos. |
| **Importar** | Restaurar columnas desde Excel original o importar datos. |
| **Exportar tabla** | Excel personalizado para el cliente. |
| **Corregir mayúsculas** | Normaliza texto (ej. "CALLE Italia" → "Calle Italia"). |
| **Calcular rutas** | Costo de transporte público (solo pendientes o forzar recálculo). |
| **Recargar** | Refresca candidatos y columnas desde servidor. |
| **Tarifas de transporte** | Edita precios de pasajes para estimación de rutas. |
| **Estadísticas** | Gráficos por columnas del proceso. |
| **Perfil ideal** | Define criterios y % de match por candidato. |
| **Inventario psicolaboral** | Definiciones y plantillas de evaluación. |
| **Evaluar masivo** | Cuadrícula de evaluación para varios candidatos. |
| **Informe psicolaboral** | Genera PDF por candidato. |
| **Filtro etapa** | Muestra solo candidatos en una etapa. |
| **Buscar** | Texto libre en la tabla. |
| **Pins de información** | Notas fijadas visibles en barra superior (comunicados internos). |

### 6.3 Columnas estándar (referencia)

| Columna | Descripción |
|---------|-------------|
| Nombre, DNI, Email, Teléfono | Datos de contacto; doble clic para editar. |
| Score IA | Puntuación automática (si viene de formulario/IA). |
| Status | Estado de contacto (semáforo). |
| Canales Email / WhatsApp / Llamada | Seguimiento de intentos de contacto. |
| Fuente, Provincia, Distrito | Origen y ubicación. |
| Fecha creación | Alta en el sistema. |
| Próxima entrevista / Agendar | Citas; doble clic para editar o agendar. |
| Etapa | Selector de etapa del pipeline masivo. |
| Match perfil | % coincidencia con perfil ideal. |
| Ruta / costo | Ruta en transporte público y costo estimado. |
| Columnas personalizadas | Definidas por el reclutador. |

### 6.4 Interacción con la tabla

| Acción | Cómo |
|--------|------|
| Editar celda | Doble clic o Enter. |
| Selección múltiple | Ctrl+clic; Shift+arrastrar rango. |
| Copiar / pegar | Ctrl+C / Ctrl+V (bloques como Excel). |
| Color / comentario en celda | Clic derecho → menú contextual. |
| Ancho de columna | Arrastrar borde del encabezado. |
| Ver detalle | Doble clic en la fila (panel lateral). |
| Aprobar / Rechazar / Eliminar | Botones en columna Acciones. |

**Hint en pantalla:** resume atajos de teclado y comportamiento de scroll horizontal.

### 6.5 Contacto (celdas de canal)

En columnas de **Email**, **WhatsApp** y **Llamada**:

- Semáforo de estado (sin contactar, en proceso, contactado, no contesta, etc.).
- Registro de intentos con resultado.
- Acceso rápido a WhatsApp o correo (según configuración).
- **Revertir** última acción o **reiniciar** seguimiento del canal.

### 6.6 Envío a OpsFlow (desde masivos)

Seleccione filas → **Enviar a OpsFlow** (también disponible en ficha). Completa datos de entrega; el sistema crea un paquete y lo entrega vía Edge Function. Vea [sección 15](#15-envíos-opsflow).

### 6.7 WhatsApp / Email masivo

Modales para enviar mensajes a selección o filtros, usando plantillas configuradas en el proceso.

---

## 7. Candidatos

**Menú → Candidatos**

Listado global de todos los candidatos a los que tiene acceso su rol (filtrado por cliente y por **visible para clientes** si aplica).

| Acción | Función |
|--------|---------|
| **Buscar** | Por nombre, email, teléfono. |
| **Abrir candidato** | Misma ficha que en el tablero (modal). |
| **Filtros** | Por proceso, etapa, etc. (según pantalla). |

### 7.1 Ficha del candidato (modal) — pestañas

#### Barra de acciones (parte superior)

| Botón | Función |
|-------|---------|
| **Exportar ZIP** | Descarga foto, datos y adjuntos en un archivo ZIP. |
| **Enviar a OpsFlow** | Envía paquete de alta a OpsFlow (requiere permisos y configuración). |
| **Archivar** / **Restaurar** | Oculta del tablero activo o revierte. |
| **Eliminar** | Borra candidato permanentemente (con confirmación). |
| **Mover / Duplicar** | Cambia de proceso o copia a otro proceso. |
| **Editar** | Modo edición de campos. |
| **Selector de etapa** | Cambia etapa sin arrastrar en el tablero. |
| **Cerrar (X)** | Cierra el modal. |

#### Pestaña **Detalles**

- Datos personales: nombre, correo, teléfonos, edad, DNI, dirección, provincia, distrito, LinkedIn.
- Fuente, expectativa salarial, salario acordado, fechas de contratación y oferta.
- **Visible para clientes** (interruptor): controla visibilidad para rol cliente.
- **Resumen** y notas.
- **Botones de contacto rápido:** copiar teléfono, llamar, WhatsApp.
- **Rutas de transporte** (si hay sedes configuradas): calcula ruta y costo desde dirección del candidato a sede de entrevista.
- **Adjuntos:** subir, previsualizar, descargar, eliminar, sincronizar desde Google Drive.
- **Foto:** clic en avatar para cambiar imagen.

#### Pestaña **Historial**

- Movimientos entre etapas con fecha y usuario.
- Envíos a OpsFlow (si aplica).

#### Pestaña **Agenda**

- Lista de entrevistas del candidato.
- **Agendar entrevista:** título, inicio, fin, entrevistador, notas, asistentes por email.
- Editar o eliminar cada evento.

#### Pestaña **Comentarios**

- Hilo de comentarios internos.
- Adjuntar imágenes en comentarios.
- Los clientes pueden comentar si tienen permiso de edición limitada.

#### Pestaña **Documentos**

- **Checklist** por categorías definidas en el proceso.
- Indica qué documentos faltan para cumplir requisitos de etapa.

---

## 8. Archivados

**Menú → Archivados**

Lista candidatos con estado archivado.

| Acción | Función |
|--------|---------|
| **Buscar** | Localizar archivados. |
| **Abrir ficha** | Ver todos los datos. |
| **Restaurar** | Devuelve al proceso activo. |
| **Eliminar** | Borrado permanente. |

Los archivados **no** aparecen en tableros Kanban ni en conteos activos del dashboard.

---

## 9. Formularios (integraciones)

**Menú → Formularios**

Conecta formularios externos para que cada envío **cree o actualice** candidatos automáticamente.

| Botón | Función |
|-------|---------|
| **Nueva integración** | Asistente de configuración. |
| **Editar** (por fila) | Modifica integración existente. |
| **Eliminar** | Quita la integración del ATS (no borra el formulario en Tally/Google). |
| **Abrir enlace** | Abre URL del formulario público. |

**Campos típicos de una integración:**

| Campo | Función |
|-------|---------|
| **Nombre** | Identificación interna. |
| **Plataforma** | Tally, Google Forms, Microsoft Forms, otro. |
| **Proceso asociado** | Proceso normal o masivo destino. |
| **URL del formulario** | Enlace público. |
| **Webhook / clave** | Conexión segura para recibir respuestas (según plataforma). |
| **Mapeo de campos** | Qué respuesta llena nombre, email, teléfono, etc. |

Tras configurar, las postulaciones aparecen en la etapa inicial del proceso asociado.

---

## 10. Cartas

**Menú → Cartas**

Genera documentos Word (.docx) desde plantillas con **campos dinámicos** (`{{Nombre}}`, `{{Email}}`, `{{Puesto}}`, etc.).

| Paso | Acción |
|------|--------|
| 1 | **Nueva carta** o desde tablero **Emitir cartas** (selección múltiple). |
| 2 | Elegir candidato(s). |
| 3 | Subir o elegir plantilla .docx. |
| 4 | Revisar campos detectados y valores autocompletados. |
| 5 | **Generar y descargar** — guarda copia en Google Drive /carpeta Cartas si Drive está activo. |

---

## 11. Calendario

**Menú → Calendario**

| Función | Descripción |
|---------|-------------|
| **Vista mes / semana / día** | Cambia granularidad. |
| **Crear evento** | Clic en franja horaria o botón nuevo. |
| **Ver / editar** | Clic en evento existente. |
| **Filtros** | Por proceso, entrevistador o candidato. |
| **Exportar .ics** | Importar a Outlook/Google Calendar. |
| **Invitación por email** | Envía convocatoria a asistentes (si está habilitado). |

Las entrevistas creadas en la ficha del candidato también aparecen aquí.

---

## 12. Reportes

**Menú → Reportes**

| Elemento | Función |
|----------|---------|
| **Tipo de reporte** | Procesos, candidatos, entrevistas, estadísticas por período. |
| **Filtros** | Fechas, procesos, estado. |
| **Generar** | Construye vista previa. |
| **Descargar PDF / Excel** | Exporta resultados (requiere permiso `reports.export`). |

---

## 13. Comparador

**Menú → Comparador**

Herramienta visual para comparar **dos o más candidatos** lado a lado.

| Botón / acción | Función |
|----------------|---------|
| **Nueva comparación** | Inicia lienzo vacío. |
| **Agregar candidatos** | Selección desde base de datos. |
| **Agregar widget** | Gráfico (barras, líneas, radar, torta, área), tabla o lista. |
| **Configurar widget** | Ejes, colores, campos a mostrar. |
| **Datos manuales** | Tabla editable para criterios no guardados en BD. |
| **Exportar PDF** | Informe con tema de Configuración (colores, portada, pie). |
| **Exportar Word** | Documento editable. |

Los PDF se guardan en Google Drive en carpeta **Reportes** si aplica.

---

## 14. Importación masiva

**Menú → Importación Masiva**

Importa candidatos a procesos **normales** desde Excel.

| Paso | Acción |
|------|--------|
| 1 | **Descargar plantilla** de ejemplo. |
| 2 | Completar columnas (mínimo: nombre, email, proceso). |
| 3 | **Seleccionar archivo** y subir. |
| 4 | **Mapear columnas** del Excel a campos del ATS. |
| 5 | **Revisar vista previa** y corregir errores. |
| 6 | **Importar** — crea candidatos en la primera etapa del proceso indicado. |

> Para procesos **masivos** use la importación dentro de **Procesos Masivos** (restaurar desde Excel / importar filas).

---

## 15. Envíos OpsFlow

**Menú → Envíos OpsFlow**

Historial de paquetes enviados al sistema **OpsFlow** (onboarding operativo).

| Estado | Significado |
|--------|-------------|
| **pending** | Guardado localmente; entrega en curso o pendiente de reintento. |
| **delivered** | OpsFlow confirmó recepción (`opsflow_package_id` guardado). |
| **failed** | Error de red o configuración; use **Reintentar**. |

| Botón | Función |
|-------|---------|
| **Actualizar** | Recarga lista de paquetes. |
| **Expandir paquete** | Ver candidatos incluidos y detalle. |
| **Reintentar** | Vuelve a invocar Edge Function `deliver-worker-handoff` (solo fallidos). |

**Desde candidato:** botón **Enviar a OpsFlow** en ficha o selección masiva → modal con datos requeridos y nota al receptor.

Configuración técnica: ver `CONFIGURAR_ENTREGA_OPSFLOW.md`.

---

## 16. Usuarios (solo administradores)

**Menú → Usuarios**

| Botón | Función |
|-------|---------|
| **Nuevo Usuario** | Alta de cuenta. |
| **Editar** | Modifica datos, rol, permisos, secciones, clientes permitidos, avatar. |
| **Eliminar** | Desactiva cuenta; el historial (comentarios, movimientos) se conserva como "usuario eliminado". |

**Campos del formulario de usuario:**

| Campo | Función |
|-------|---------|
| Nombre, email, contraseña | Credenciales de acceso. |
| Rol | admin, recruiter, client, viewer. |
| Permisos personalizados | Sobrescribe permisos del rol. |
| Secciones visibles | Sobrescribe menú lateral. |
| Restringir a clientes | Limita procesos visibles por `clientId`. |
| Foto de perfil | Avatar en la interfaz. |

---

## 17. Configuración (solo administradores)

**Menú → Configuración**

Botón global: **Save Changes / Guardar cambios** — persiste todos los ajustes en la base de datos.

### 17.1 Branding

| Opción | Función |
|--------|---------|
| **Application Name** | Título en el sidebar. |
| **Company Logo** | Logo principal. |
| **POWERED BY Logo** | Logo del pie del menú. |

### 17.2 Informe (PDF)

Colores primario/acento, título de portada, pie de página para comparador y bloque **Informe psicolaboral** (imagen de portada, texto de apertura y cierre).

### 17.3 Fuentes de candidatos

Lista de opciones del campo **Fuente** (una por línea).

### 17.4 Clientes

CRUD de clientes: **razón social** y **RUC** para asignar a procesos y restringir usuarios.

### 17.5 Sedes de entrevista

Puntos de destino para **rutas en transporte público** en fichas de candidatos (procesos normales).

### 17.6 Provincias y distritos

Listas desplegables usadas al editar candidatos.

### 17.7 UI Labels

Textos personalizados del menú, modales y dashboard.

### 17.8 Localization

**Símbolo de moneda** (S/, $, etc.).

### 17.9 Database Connection

Referencia a conexión de datos (informativo; la conexión real es Supabase vía variables de entorno).

### 17.10 Google Drive

Solo **admin**: credenciales OAuth, conectar/desconectar, carpeta raíz, actualizar listado. Ver [sección 18](#18-google-drive-y-archivos).

### 17.11 Psicolaboral y tarifas

Secciones para activar módulo psicolaboral y **tarifas de transporte** usadas en procesos masivos (también accesibles desde la tabla masiva).

---

## 18. Google Drive y archivos

### 18.1 Estructura de carpetas (recomendada)

```
[Carpeta raíz configurada]/
├── [Proceso A]/
│   ├── [Candidato 1]/  ← adjuntos del candidato
│   └── [Documentos del proceso]/
├── [Proceso B]/
│   └── ...
├── Cartas/
└── Reportes/
```

### 18.2 Comportamiento

- Al subir adjunto en candidato o proceso, el archivo se envía a la carpeta correspondiente si Drive está conectado.
- **Sincronizar desde Google Drive** en ficha trae archivos creados directamente en Drive.
- Si Drive no está conectado, los archivos se almacenan en base de datos (limitado en tamaño).

### 18.3 Botones en Configuración → Google Drive

| Botón | Función |
|-------|---------|
| Guardar credenciales | Client ID y Secret de Google Cloud. |
| Conectar Google Drive | Flujo OAuth en ventana emergente. |
| Seleccionar carpeta raíz | Define carpeta base ATS. |
| Actualizar carpetas | Refresca listado. |
| Desconectar | Deja de subir archivos nuevos a Drive (los existentes permanecen). |

---

## 19. Flujos de trabajo recomendados

### 19.1 Reclutamiento estándar (pocos candidatos)

1. Crear **proceso** con etapas y documentos requeridos.  
2. Publicar **formulario** integrado o **añadir candidatos** manualmente.  
3. Mover tarjetas en el **tablero** según avance.  
4. **Agendar entrevistas** desde ficha o calendario.  
5. Completar **checklist de documentos**.  
6. **Cerrar proceso** marcando contratados.  
7. Opcional: **Enviar a OpsFlow** y generar **carta** de oferta.

### 19.2 Campaña masiva (miles de postulantes)

1. Crear **proceso masivo** y configurar columnas/plantilla.  
2. **Importar** Excel o recibir postulaciones vía **Tally/formulario**.  
3. Trabajar la **tabla**: contacto por canal, filtros, score, perfil ideal.  
4. **Agendar** entrevistas desde columnas de fecha.  
5. **Aprobar/rechazar** filas; exportar tabla al cliente.  
6. Enviar seleccionados a **OpsFlow**.

### 19.3 Cliente externo

1. El reclutador marca candidatos como **Visible para clientes**.  
2. El cliente entra a **Procesos**, revisa tablero y **mueve** candidatos según su evaluación.  
3. Usa **Comparador** y **Reportes** para decisiones (sin crear ni eliminar).

---

## 20. Preguntas frecuentes

**¿Por qué no veo una sección del menú?**  
Su rol no incluye esa sección o el administrador la ocultó en **Secciones visibles**.

**¿Por qué el cliente no ve un candidato?**  
Active **Visible para clientes** en la ficha o verifique restricción por cliente del usuario.

**¿Cuál es la diferencia entre Procesos y Procesos Masivos?**  
Procesos = Kanban clásico. Procesos Masivos = tabla de alto volumen con columnas dinámicas y herramientas de contacto masivo.

**¿Puedo recuperar un candidato archivado?**  
Sí, en **Archivados** → abrir ficha → **Restaurar**.

**¿El envío a OpsFlow falló?**  
Vaya a **Envíos OpsFlow**, localice el paquete en estado *failed* y pulse **Reintentar**. Revise configuración en `CONFIGURAR_ENTREGA_OPSFLOW.md`.

**¿Cómo actualizo datos sin recargar el navegador?**  
Use **Actualizar** en el pie del menú lateral.

**¿Dónde están los manuales anteriores?**  
- Reclutador/general: `MANUAL_USUARIO.md`  
- Cliente: `MANUAL_USUARIO_CLIENTE.md`  
- Administrador: `MANUAL_SUPER_ADMIN.md`  
- Este documento: referencia unificada y actualizada.

---

## Soporte

Para incidencias técnicas, proporcione: rol de usuario, pantalla, pasos para reproducir, captura y mensaje de error (consola F12 si es posible). Contacte al administrador del sistema o al equipo de desarrollo de Opalo ATS.

---

*Documento generado a partir del código fuente de Opalo ATS en el repositorio Opaloats.*
