import type { CustomColumn, DashboardSemanticField } from '../types';
import { assessmentColumnLabel, assessmentStatusColumnId, isAssessmentColumnId } from './assessments/columns';
import {
    IDENTITY_COLUMN_LABELS,
    canonicalIdentityMappingKeyFromCustomColumn,
    identityColumnIdFromLabel,
    isIdentityCustomColumn,
    isIdentitySystemColumnId,
} from './candidateIdentity';
import { BASE_COLUMNS, getColumnLabel, normalizeColumnNameKey } from './bulkTableColumns';

export type ColumnGuideGroupId =
    | 'identity'
    | 'candidate'
    | 'contact'
    | 'fidelization'
    | 'assessments'
    | 'process'
    | 'custom'
    | 'repeated';

export const COLUMN_GUIDE_GROUPS: {
    id: ColumnGuideGroupId;
    title: string;
    description: string;
}[] = [
    {
        id: 'identity',
        title: 'Identidad',
        description:
            'Nombres, apellidos, DNI y la ficha de datos. Existen en todos los procesos. Nombres, apellidos y DNI no se pueden ocultar ni volver a crear.',
    },
    {
        id: 'candidate',
        title: 'Datos del candidato',
        description:
            'Campos fijos de la ficha: correo real, teléfono, fuente, provincia, distrito y cómo se dio de alta. El Panel lee Fuente, distrito y provincia desde aquí cuando no hay una columna propia clasificada.',
    },
    {
        id: 'contact',
        title: 'Seguimiento de reclutamiento',
        description:
            'Registran si ya llamó, escribió por WhatsApp o envió un correo durante el reclutamiento, y quién fue el último. No guardan el número ni la dirección.',
    },
    {
        id: 'fidelization',
        title: 'Seguimiento de fidelización',
        description:
            'El mismo tipo de registro (llamada, WhatsApp, correo), en la etapa de fidelización. Por eso los nombres se parecen a los de reclutamiento. Son columnas distintas y cada una tiene su propio historial.',
    },
    {
        id: 'assessments',
        title: 'Estado de las pruebas',
        description:
            'Las pone el sistema cuando el proceso tiene batería. Cada celda pasa por Pendiente, En curso y Realizada, y muestra el puntaje cuando existe. No se crean con Agregar columna.',
    },
    {
        id: 'process',
        title: 'Proceso, agenda y documentos',
        description:
            'Etapa, estado, score, perfil ideal, fechas, agendamiento y documentos del candidato en este proceso.',
    },
    {
        id: 'custom',
        title: 'Columnas propias de este proceso',
        description:
            'Las creó alguien con Agregar columna. Solo estas se cambian en Editar columnas propias: nombre, tipo, lista de opciones, clasificación del Panel e informe psicolaboral.',
    },
    {
        id: 'repeated',
        title: 'Nombres que se repiten',
        description:
            'Una columna propia quedó con el mismo significado que una columna fija. Sigue existiendo porque puede guardar valores antiguos. La tabla oculta las que repiten Nombres, apellidos o DNI para no mostrar el dato dos veces. Puede eliminarlas en Editar columnas propias si ya no las usa.',
    },
];

const GROUP_BY_ID: Record<string, ColumnGuideGroupId> = {
    nombres: 'identity',
    apellidoPaterno: 'identity',
    apellidoMaterno: 'identity',
    dni: 'identity',
    fichaDatos: 'identity',
    email: 'candidate',
    phone: 'candidate',
    source: 'candidate',
    province: 'candidate',
    district: 'candidate',
    registrationOrigin: 'candidate',
    contactPhone: 'contact',
    contactWhatsapp: 'contact',
    contactEmail: 'contact',
    contactLastUser: 'contact',
    fidelizPhone: 'fidelization',
    fidelizWhatsapp: 'fidelization',
    fidelizEmail: 'fidelization',
    scoreIa: 'process',
    profileMatch: 'process',
    status: 'process',
    createdAt: 'process',
    nextInterview: 'process',
    schedule: 'process',
    bulkDocuments: 'process',
    stage: 'process',
    hiredStageUser: 'process',
};

export const COLUMN_ROW_HINTS: Record<string, string> = {
    nombres: 'Nombre de pila. Junto con los dos apellidos forma el nombre completo. No cree otra columna llamada Nombres.',
    apellidoPaterno: 'Primer apellido. Columna fija. El informe psicolaboral la usa para el PDF.',
    apellidoMaterno: 'Segundo apellido. Puede quedar vacío. También es columna fija.',
    dni: 'Documento de identidad. Las pruebas públicas identifican a la persona con este dato.',
    fichaDatos: 'Abre la ficha complementaria de esa fila. Puede ocultarla. No es un dato que se escriba en la celda.',
    email: 'Dirección de correo real del candidato. Sirve para escribirle. No anota si el correo ya se envió.',
    phone: 'Número de teléfono. No anota si ya lo llamó: eso está en Llamadas.',
    source: 'Origen de la postulación en la ficha (Computrabajo, referido, etc.). El gráfico de fuentes del Panel la usa si no hay una columna propia clasificada como Fuente.',
    province: 'Provincia guardada en la ficha.',
    district: 'Distrito guardado en la ficha. El gráfico de candidatos por distrito lo usa si no hay una columna propia clasificada como Distrito.',
    registrationOrigin: 'Cómo entró al sistema: formulario, importación, alta manual u otro canal de registro. No es la fuente comercial.',
    contactPhone: 'Estado de las llamadas de reclutamiento (pendiente, contactado, etc.). El número está en Teléfono.',
    contactWhatsapp: 'Estado de los WhatsApp de reclutamiento. No es el número.',
    contactEmail: 'Estado de los correos de reclutamiento. La dirección está en Email.',
    contactLastUser: 'Usuario que hizo el último intento de contacto de reclutamiento.',
    fidelizPhone: 'Estado de las llamadas de fidelización. Es independiente de Llamadas.',
    fidelizWhatsapp: 'Estado de los WhatsApp de fidelización. Es independiente de WhatsApp.',
    fidelizEmail: 'Estado de los correos de fidelización. Es independiente de Correo y de Email.',
    scoreIa: 'Puntaje calculado por las reglas de score del proceso.',
    profileMatch: 'Qué tan cerca está la fila del perfil ideal, cuando ese perfil está activo.',
    status: 'Estado operativo de la fila en el proceso masivo.',
    createdAt: 'Fecha en que se creó el candidato.',
    nextInterview: 'Próxima entrevista agendada.',
    schedule: 'Atajo para agendar una entrevista en esa fila.',
    bulkDocuments: 'Archivos del candidato (CV y otros). No es una columna de texto.',
    stage: 'Etapa del proceso en la que está la persona.',
    hiredStageUser: 'Usuario que registró el ingreso, cuando la etapa es de contratación.',
    assessmentBarsit: 'Avance de Barsit: Pendiente, En curso o Realizada, con puntaje si ya envió la prueba.',
    assessmentInteligencia: 'Avance de Raven (Figuras). Mismo ciclo: Pendiente, En curso, Realizada.',
    assessmentPersonalidad: 'Avance de Personalidad D.',
    assessmentRiesgo: 'Avance de la prueba de riesgo y recompensa.',
    assessmentAtencion: 'Avance de la prueba de atención bajo presión.',
    assessmentEsfuerzo: 'Avance de la prueba de esfuerzo y retorno.',
};

export const LOOKALIKE_PAIRS: { title: string; body: string }[] = [
    {
        title: 'Email, Correo y Fid. Correo',
        body: 'Email guarda la dirección (alguien@empresa.com). Correo anota si en reclutamiento ya se le escribió y en qué estado quedó ese intento. Fid. Correo hace lo mismo, pero en fidelización. Son tres columnas porque mezclar la dirección con el historial de envíos borraría el dato de contacto.',
    },
    {
        title: 'Teléfono, Llamadas y Fid. Llamadas',
        body: 'Teléfono es el número. Llamadas es el seguimiento de reclutamiento. Fid. Llamadas es el seguimiento de fidelización. Ocultar Llamadas no borra el número, y ocultar Teléfono no borra el historial de llamadas.',
    },
    {
        title: 'WhatsApp y Fid. WhatsApp',
        body: 'Las dos registran intentos de WhatsApp. La primera es reclutamiento y la segunda es fidelización. Ninguna reemplaza al número de Teléfono.',
    },
    {
        title: 'Fuente, Distrito o Provincia de sistema y una columna propia con el mismo nombre',
        body: 'La del sistema es el campo de la ficha. La propia es un dato extra de la tabla de este proceso. Si las dos tienen valores, el Panel usa primero la columna propia cuando su nombre coincide o cuando usted la clasificó. El campo de la ficha queda de respaldo si la columna propia está vacía. Si el gráfico sale vacío o todo cae en «Otro», edite la columna propia y elija la clasificación. Si la columna propia ya no aporta nada distinto, elimínela en Editar columnas propias.',
    },
    {
        title: 'Nombres, apellidos o DNI repetidos',
        body: 'Esas cuatro son columnas fijas. Si en el pasado se creó una columna propia con el mismo título, o se marcó en Informe psicolaboral como Nombres, Apellido paterno o Apellido materno, el sistema la trata como el mismo dato y la oculta en la grilla. Sigue en esta lista, en «Nombres que se repiten», para que pueda borrarla si ya migró los valores a las columnas fijas. Crear otra no está permitido.',
    },
    {
        title: 'Barsit (o Raven, Personalidad D, etc.) y una casilla «completada»',
        body: 'La columna de estado muestra Pendiente, En curso o Realizada y el puntaje. Una casilla sí/no creada por usted solo se marca cuando la prueba se envía. Puede tener las dos: una informa el avance y la otra es un visto bueno. Si la casilla se llama igual que la prueba, verá dos filas parecidas en esta lista. La de estado está en «Estado de las pruebas». La casilla está en «Columnas propias».',
    },
];

export interface ColumnMenuEntry {
    colId: string;
    label: string;
    group: ColumnGuideGroupId;
    hint?: string;
    repeatedNote?: string;
}

export function repeatedCustomColumnNote(col: CustomColumn): string | null {
    if (isIdentityCustomColumn(col)) {
        const target = canonicalIdentityMappingKeyFromCustomColumn(col);
        const label = target ? IDENTITY_COLUMN_LABELS[target] : col.name;
        return `Repite «${label}», que ya es una columna fija. La grilla oculta esta copia para no mostrar el dato dos veces. Sigue aquí porque la columna propia todavía existe y puede tener valores viejos. Si esos valores ya están en la columna fija, elimínela en Editar columnas propias.`;
    }

    const norm = normalizeColumnNameKey(col.name);
    const base = BASE_COLUMNS.find(item => normalizeColumnNameKey(item.label) === norm);
    if (base && !isIdentitySystemColumnId(base.id)) {
        const hint = COLUMN_ROW_HINTS[base.id];
        return `Hay otra columna llamada «${base.label}». Esa es del sistema. ${hint || 'Guarda el dato fijo de la ficha.'} Esta es propia del proceso y guarda otro valor, aunque el título sea igual.`;
    }

    if (col.tracksAssessment) {
        const statusLabel = assessmentColumnLabel(assessmentStatusColumnId(col.tracksAssessment));
        return `Esta casilla se marca sola cuando el candidato envía la prueba «${statusLabel || 'de la batería'}». La columna de estado con ese mismo nombre muestra además Pendiente, En curso o Realizada y el puntaje. La casilla y la columna de estado conviven: una es un sí/no y la otra es el avance.`;
    }

    return null;
}

export function describeColumnMenuEntry(colId: string, customColumns: CustomColumn[]): ColumnMenuEntry {
    const label = getColumnLabel(colId, customColumns);
    if (colId.startsWith('custom_')) {
        const col = customColumns.find(item => item.id === colId.slice('custom_'.length));
        if (col) {
            const repeatedNote = repeatedCustomColumnNote(col);
            if (repeatedNote) {
                return { colId, label, group: 'repeated', hint: repeatedNote, repeatedNote };
            }
            const typeHint =
                col.type === 'select'
                    ? 'Lista desplegable propia de este proceso.'
                    : col.type === 'checkbox' && col.tracksAssessment
                        ? 'Casilla propia. Se marca al completar la prueba elegida.'
                        : 'Columna creada en este proceso. Se edita en Editar columnas propias.';
            return { colId, label, group: 'custom', hint: typeHint };
        }
    }

    if (isAssessmentColumnId(colId)) {
        return {
            colId,
            label,
            group: 'assessments',
            hint: COLUMN_ROW_HINTS[colId] || 'Estado de una prueba de la batería.',
        };
    }

    const group = GROUP_BY_ID[colId] || 'process';
    return {
        colId,
        label,
        group,
        hint: COLUMN_ROW_HINTS[colId],
    };
}

export function groupColumnsForMenu(columnIds: string[], customColumns: CustomColumn[]) {
    const buckets = new Map<ColumnGuideGroupId, ColumnMenuEntry[]>();
    for (const group of COLUMN_GUIDE_GROUPS) buckets.set(group.id, []);
    for (const colId of columnIds) {
        const entry = describeColumnMenuEntry(colId, customColumns);
        buckets.get(entry.group)?.push(entry);
    }
    return COLUMN_GUIDE_GROUPS
        .map(group => ({ ...group, columns: buckets.get(group.id) || [] }))
        .filter(group => group.columns.length > 0);
}

export function columnNameClashWarning(name: string): string | null {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const identityId = identityColumnIdFromLabel(trimmed);
    if (identityId) {
        const label = IDENTITY_COLUMN_LABELS[identityId];
        return `«${label}» ya existe como columna fija en todos los procesos. Escriba ese dato ahí. El sistema no deja crear otra columna propia con este nombre, porque en Mostrar columnas aparecería repetida y la tabla la ocultaría.`;
    }
    const norm = normalizeColumnNameKey(trimmed);
    const base = BASE_COLUMNS.find(item => normalizeColumnNameKey(item.label) === norm);
    if (base) {
        const hint = COLUMN_ROW_HINTS[base.id];
        return `Ya existe la columna «${base.label}». ${hint || 'Es una columna del sistema.'} Si crea otra con el mismo título, en Mostrar columnas verá las dos: una en su grupo de sistema y otra en Columnas propias. Hágalo solo cuando el dato de la tabla sea distinto del dato fijo.`;
    }
    return null;
}

export const COLUMN_TYPE_HELP: Record<CustomColumn['type'], { title: string; body: string }> = {
    text: {
        title: 'Texto',
        body: 'Una celda libre: disponibilidad, observaciones, un comentario, un turno escrito a mano. Cada candidato guarda su propio texto. No arma un gráfico por sí sola. Si este texto en realidad es la fuente, el distrito o la provincia, elija la clasificación del Panel más abajo.',
    },
    number: {
        title: 'Número',
        body: 'Solo cantidades: edad, salario, años de experiencia, un puntaje que usted escribe. Si el número es la edad y el título no dice Edad, clasifíquela como Edad para que el Panel arme la distribución por rangos. Si el título ya es Edad, puede dejar la clasificación en Automático.',
    },
    checkbox: {
        title: 'Casilla sí/no',
        body: 'Una marca de visto: cumple un requisito, entregó un documento, confirmó algo. Puede ser manual. También puede marcarse sola cuando el candidato envía una prueba: elija la prueba en el campo de abajo. Esa casilla no reemplaza la columna de estado de la prueba (Pendiente, En curso, Realizada), que ya está en Mostrar columnas.',
    },
    date: {
        title: 'Fecha',
        body: 'Un día de calendario. Si es el día de la cita y el título no dice «fecha de cita» o «fecha de entrevista», clasifíquela como Fecha de cita para que el agendamiento la cuente. Una fecha de nacimiento o de ingreso se deja en Automático.',
    },
    select: {
        title: 'Lista desplegable',
        body: 'Usted escribe las opciones y en cada fila se elige una. Sirve para turno, resultado, sede o motivo, cuando no quiere texto libre. Las opciones se editan después en Editar columnas propias y valen para toda la tabla. Agregar una opción no borra lo que ya estaba elegido en las filas.',
    },
    route: {
        title: 'Ruta en transporte público',
        body: 'No es un texto. Usted fija la dirección de destino (sede o lugar de entrevista). En cada fila aparece un enlace con la ruta en bus o metro desde la ubicación del candidato hasta ese destino. Después puede crear una columna de costo aproximado que use esta ruta.',
    },
    route_cost: {
        title: 'Costo aproximado de ruta',
        body: 'Muestra un monto estimado del pasaje de una columna Ruta que ya exista. El monto no se calcula al crear la columna ni al abrir la tabla: alguien pulsa Calcular en la fila, o usa Costos pendientes. El resultado queda guardado. Primero tiene que existir la columna Ruta. Esta columna no entra al Panel ni al nombre del informe.',
    },
};

export const PANEL_CLASSIFICATION_INTRO = [
    'Este campo es opcional. No cambia el nombre de la columna, ni el tipo de celda, ni lo que los usuarios escriben en la tabla.',
    'Solo le dice al Panel (los gráficos de fuentes, distrito, edad y el resumen de agendamiento) qué significado tienen los valores de esta columna cuando el título no es el estándar.',
    'Déjelo en Automático si el título ya es claro: Fuente, Distrito, Provincia, Edad, Asistió, Fecha de cita, Fecha de entrevista. El sistema reconoce esos títulos.',
    'Elija una clasificación cuando el título es el de un formulario o de un Excel y el Panel no puede adivinarlo. Ejemplo: «¿Cómo se enteró?» debe ser Fuente de candidato. «Asistió a la entrevista» debe ser Asistencia a cita. «Distrito de residencia» debe ser Distrito.',
    'Elegir una clasificación no copia los valores a la columna fija Fuente, Distrito o Provincia, y no crea una segunda columna. El gráfico lee las celdas de esta columna. Si esta columna tiene un valor, el Panel lo usa primero. Si está vacía, usa el campo fijo de la ficha cuando ese campo existe (fuente, distrito, provincia, edad).',
    'Asistencia a cita y Fecha de cita solo se leen desde columnas propias. No hay una columna fija con ese nombre: si quiere verlas en el resumen de agendamiento, esta clasificación (o un título que el sistema reconozca) es lo que las conecta.',
    'Si no está seguro, deje Automático. La columna se crea igual y puede clasificarla después en Editar columnas propias, sin perder los datos ya cargados.',
];

export const PANEL_CLASSIFICATION_DETAIL: Record<
    '' | DashboardSemanticField,
    { title: string; body: string }
> = {
    '': {
        title: 'Automático, por el nombre de la columna',
        body: 'El Panel compara el título con palabras conocidas. «Fuente», «Edad», «Distrito» y «Provincia» entran solas a sus gráficos. Un título que hable de asistencia («Asistió», «Presente») entra a Asistencia a cita. Un título que hable de fecha de cita o de entrevista entra a Fecha de cita. Un título libre no entra a ningún gráfico: los valores pueden desaparecer del Panel o agruparse en «Otro». La tabla no cambia.',
    },
    source: {
        title: 'Fuente de candidato',
        body: 'Alimenta el gráfico de orígenes de postulación. Escriba en la celda de dónde llegó la persona. Úselo cuando la columna se llama distinto de Fuente, por ejemplo la pregunta de un formulario. Si además existe la columna fija Fuente, el gráfico prefiere esta columna propia cuando tiene texto.',
    },
    district: {
        title: 'Distrito',
        body: 'Alimenta el gráfico de candidatos por distrito. Úselo si el distrito está en una columna propia con otro título («Distrito de residencia», «Zona»). El mapa y el resumen dejan de mandar esos valores a «Sin distrito» o a «Otro» cuando la clasificación está puesta.',
    },
    province: {
        title: 'Provincia',
        body: 'Marca la columna como provincia para filtros y resúmenes del Panel. Igual que el distrito: hace falta cuando el título no es exactamente Provincia. No mueve el texto a la columna fija.',
    },
    age: {
        title: 'Edad',
        body: 'Alimenta la distribución por rangos de edad (menor de 20, 20-29, 30-39, etc.). La celda puede ser un número o una fecha de nacimiento: el sistema intenta leer la edad. Si la columna se llama Edad, Automático alcanza. Si se llama «Años» o «Fecha nac.», elija Edad.',
    },
    interview_attendance: {
        title: 'Asistencia a cita',
        body: 'El resumen de agendamiento cuenta cuántas citas tuvieron asistencia. Valores que cuenta como sí: Sí, Asistió, Presente, 1. Como no: No, Ausente, Faltó. No existe una columna fija de asistencia: si este dato vive en una columna propia, esta clasificación es la que lo conecta. No cambia la celda a una casilla; sigue siendo el tipo que eligió arriba.',
    },
    interview_date: {
        title: 'Fecha de cita',
        body: 'El resumen de agendamiento cuenta las agendas registradas leyendo esta fecha. Hace falta cuando el título no dice fecha de cita ni fecha de entrevista. Conviene que el tipo de columna sea Fecha, para que el día se guarde de forma uniforme. La clasificación por sí sola no convierte un texto en calendario.',
    },
};

export const REPORT_NAME_INTRO = [
    'Este campo también es opcional y tampoco cambia la columna en la tabla.',
    'El informe psicolaboral arma una línea de nombre en el PDF. Esa línea sale primero de las columnas fijas: Nombres, Apellido paterno y Apellido materno. Esas columnas ya existen. No hace falta crearlas ni marcarlas aquí.',
    'Este selector solo importa cuando una columna propia trae una parte del nombre y el título no se entiende. Ejemplo: un Excel importado con el encabezado «APE PAT» o «Primer apellido».',
    'Automático mira el título. Si dice Nombres, Apellido paterno, Apellido materno o Apellidos, el PDF usa el texto. Si el título es otra cosa (turno, sede, comentario), el PDF lo ignora para el nombre. Eso es lo correcto en casi todas las columnas.',
    'Marcar Nombres, Apellido paterno o Apellido materno tiene un efecto extra: el sistema entiende que esta columna propia es el mismo dato que la columna fija. La tabla la oculta para no duplicar la fila, y en Mostrar columnas queda en el grupo «Nombres que se repiten». También orienta a Tally y a la ficha complementaria para guardar ese valor en la identidad. Por eso, si la persona ya tiene Nombres y apellidos en las columnas fijas, deje Automático.',
    'Apellidos (un solo campo) no oculta la columna. Suma al PDF el texto completo de apellidos cuando vinieron juntos. Si además cargó apellido paterno y materno por separado, el nombre del PDF puede salir repetido. Use una sola forma.',
];

export const REPORT_NAME_DETAIL: Record<
    '' | 'given_names' | 'paternal_surname' | 'maternal_surname' | 'surnames_combined',
    { title: string; body: string }
> = {
    '': {
        title: 'Automático, por el título',
        body: 'El PDF solo toma esta columna si el título parece una parte del nombre. Disponibilidad, salario, distrito o cualquier otro dato se queda fuera del nombre. La columna sigue visible en la tabla. Esta es la opción que debe quedar en una columna que no es un nombre.',
    },
    given_names: {
        title: 'Nombres',
        body: 'El PDF trata el texto de esta columna como nombres de pila. La tabla oculta esta columna propia porque ya existe la columna fija Nombres. Úselo solo para una columna vieja cuyo título no dice Nombres y cuyos valores todavía no están en la columna fija.',
    },
    paternal_surname: {
        title: 'Apellido paterno',
        body: 'El PDF trata el texto como primer apellido y la tabla oculta la columna propia, igual que con Nombres. La columna fija Apellido paterno es el lugar normal de ese dato.',
    },
    maternal_surname: {
        title: 'Apellido materno',
        body: 'El PDF trata el texto como segundo apellido y la tabla oculta la columna propia. La columna fija Apellido materno puede ir vacía; no por eso hay que crear otra.',
    },
    surnames_combined: {
        title: 'Apellidos en un solo campo',
        body: 'El PDF añade el texto completo como apellidos. La columna sigue viéndose en la tabla. Sirve para una importación que trajo «Apellidos» juntos y no separados. Si ya usa las dos columnas fijas de apellido, no marque esta opción: el PDF concatenaría los apellidos otra vez.',
    },
};

