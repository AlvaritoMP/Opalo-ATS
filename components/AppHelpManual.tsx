import React, { useMemo, useState } from 'react';
import { CircleHelp, Search, X } from 'lucide-react';
import { ASSESSMENT_GUIDE_SECTIONS, type GuideSection } from './AssessmentConsultantGuide';

interface HelpSection extends GuideSection {
    keywords: string;
}

interface HelpGroup {
    id: string;
    label: string;
    sections: HelpSection[];
}

function H3({ children }: { children: React.ReactNode }) {
    return <h3 className="text-sm font-semibold text-slate-900 mt-4 mb-1">{children}</h3>;
}

function P({ children }: { children: React.ReactNode }) {
    return <p className="text-sm text-slate-700 leading-relaxed">{children}</p>;
}

function Ul({ items }: { items: string[] }) {
    return (
        <ul className="mt-1 space-y-1 text-sm text-slate-700 list-disc pl-5">
            {items.map((item) => <li key={item}>{item}</li>)}
        </ul>
    );
}

function Ol({ items }: { items: string[] }) {
    return (
        <ol className="mt-1 space-y-1.5 text-sm text-slate-700 list-decimal pl-5">
            {items.map((item) => <li key={item}>{item}</li>)}
        </ol>
    );
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
    return (
        <div className="mt-2 overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-600">
                    <tr>
                        {headers.map((header) => (
                            <th key={header} className="px-3 py-2 font-medium whitespace-nowrap">{header}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => (
                        <tr key={row.join('|')} className="border-t border-slate-100">
                            {row.map((cell) => (
                                <td key={cell} className="px-3 py-2 text-slate-800 align-top">{cell}</td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

const FLOW_SECTIONS: HelpSection[] = [
    {
        id: 'mapa',
        title: 'Recorrido completo',
        keywords: 'flujo mapa inicio proceso candidato etapa formulario prueba informe',
        body: (
            <>
                <P>
                    Opalo ATS sigue a una persona desde que postula hasta que se decide. Hay dos entradas distintas que no se mezclan: el formulario de postulación (Tally) crea o actualiza la ficha, y el enlace de pruebas es otra pantalla donde la persona rinde la batería del proceso.
                </P>
                <H3>Orden de trabajo</H3>
                <Ol items={[
                    'Cree el proceso y ordene las etapas. La primera etapa, la de arriba en la lista, es donde cae cada postulación nueva de Tally.',
                    'Si las postulaciones llegan por formulario, abra Formularios, cree la integración, copie el webhook y péguelo en Tally. El detalle está en Integración con Tally.',
                    'Si el puesto lleva pruebas, edite el proceso masivo y elija la jerarquía: mandos medios y superiores, u operativos y básicos. Ahí también se activan las pruebas de conducta. Sin esa elección el enlace público no tiene batería.',
                    'Si va a emitir informe psicolaboral, arme el set de competencias en el Inventario y asígnelo al proceso. Esas notas las pone el consultor: las pruebas no las calculan.',
                    'Comparta la URL pública de Tally para postular, y por separado Link pruebas o Invitar a pruebas para rendir.',
                    'En la tabla o el tablero revise la ficha, lea Resultados pruebas, califique competencias, genere el informe y mueva la etapa, archive o envíe a OpsFlow.',
                ]} />
                <H3>Qué escribe cada pieza</H3>
                <Table
                    headers={['Pieza', 'Qué deja guardado', 'Dónde se consulta']}
                    rows={[
                        ['Tally', 'Ficha y columnas cuyo label coincidió. La persona queda en la primera etapa. El origen queda como formulario.', 'Proceso vinculado'],
                        ['Alta manual o importación', 'La misma ficha, con origen manual o masivo. El reclutador elige la etapa.', 'Proceso o Procesos masivos'],
                        ['Figuras, terminada, en operativos', 'Puntaje llevado a escala 0-60 y el nivel intelectual del inventario.', 'Informe psicolaboral'],
                        ['Personalidad D, terminada, en operativos', 'Nivel alto, promedio o bajo de cada rasgo cuyo nombre corresponde a un factor D, I, S o C.', 'Informe psicolaboral'],
                        ['Barsit', 'Puntaje bruto de 0 a 60, ítem por ítem.', 'Resultados pruebas. El nivel intelectual del informe sigue saliendo de Figuras.'],
                        ['Riesgo, Atención y Esfuerzo', 'Puntaje, perfil y lectura de la tarea.', 'Resultados pruebas. El consultor puede copiar el dictamen a las conclusiones.'],
                        ['Competencias del set', 'Nota obtenida que carga el consultor, porcentaje sobre lo esperado, destacadas y áreas de mejora.', 'Informe y plantilla de conclusión'],
                        ['Idoneidad y conclusiones', 'El consultor elige apto, apto con reservas o no apto. La plantilla arma un borrador con los datos ya cargados.', 'Informe psicolaboral'],
                    ]}
                />
                <P>
                    El menú lateral cambia según el rol y las secciones habilitadas para ese usuario. Cada pantalla tiene un botón Ayuda junto al título. Abre este manual en el capítulo de esa pantalla: qué hace, cómo se usa y cómo lo hace el sistema. El botón Ayuda del menú abre el capítulo de la pantalla en la que está.
                </P>
            </>
        ),
    },
    {
        id: 'procesos',
        title: 'Procesos y etapas',
        keywords: 'proceso kanban etapa masivo tablero orden primera etapa drive',
        body: (
            <>
                <P>
                    Un proceso es una vacante o una convocatoria, con un cliente, un título y una lista ordenada de etapas. El orden de las etapas es operativo: Tally siempre deposita la postulación en la primera.
                </P>
                <H3>Dos formas de trabajar el mismo proceso</H3>
                <Table
                    headers={['Vista', 'Para qué sirve']}
                    rows={[
                        ['Procesos', 'Tablero por etapas. Sirve para mover pocas personas de una columna a otra y abrir la ficha.'],
                        ['Procesos masivos', 'Tabla de alta densidad. Ahí viven columnas propias, contacto, documentos, pruebas, perfil ideal e informe psicolaboral.'],
                    ]}
                />
                <H3>Al crear o editar</H3>
                <Ul items={[
                    'Defina título, cliente y etapas antes de conectar Tally. Si el proceso no tiene etapas, el webhook rechaza la postulación.',
                    'Reordene las etapas con cuidado: la que quede primera pasa a ser la bandeja de entrada del formulario.',
                    'Al crear el proceso, el sistema intenta abrir una carpeta en Google Drive para los archivos de esa vacante, si Drive está configurado.',
                    'Un proceso cerrado deja de aceptar la gestión operativa hasta que vuelva a En proceso.',
                    'Las pruebas y el informe psicolaboral se configuran al editar el proceso masivo, en las secciones Pruebas para candidatos e Informes psicolaborales.',
                ]} />
            </>
        ),
    },
    {
        id: 'candidatos',
        title: 'Cómo entra una persona',
        keywords: 'candidato alta manual masivo formulario dni email telefono etapa origen',
        body: (
            <>
                <P>
                    Cada persona pertenece a un proceso y a una etapa. El origen queda registrado para el panel: formulario (llegó por Tally), manual (fila o ficha creada en el ATS) o masivo (Excel u otra carga por lote).
                </P>
                <H3>Tres puertas de entrada</H3>
                <Ul items={[
                    'Formulario: la persona llena Tally. El webhook crea o actualiza la ficha y la deja en la primera etapa.',
                    'Manual: Nueva fila en la tabla, o agregar candidato en el proceso. El reclutador elige la etapa.',
                    'Masivo: importación de archivo. Rellena filas y columnas. Las celdas que ya tenían un valor se conservan.',
                ]} />
                <H3>Si la misma persona vuelve a postular</H3>
                <P>
                    Dentro del mismo proceso, y solo entre fichas que no están archivadas, el sistema busca una coincidencia en este orden: DNI, correo real, teléfono. Si encuentra la ficha, suma una postulación y completa solo los campos y columnas que estaban vacíos. Lo que el equipo ya escribió se mantiene. Una ficha archivada no se reabre por un webhook: llega como registro nuevo.
                </P>
                <P>
                    Si Tally no trae correo, el sistema guarda un correo interno de respaldo para que la ficha pueda existir. Ese correo no se usa para reconocer a la persona en una postulación posterior; el reconocimiento sigue siendo DNI, correo real o teléfono.
                </P>
                <H3>Después del alta</H3>
                <Ul items={[
                    'Mover de etapa registra el avance. En el tablero se arrastra la tarjeta. En la tabla se cambia la etapa de la fila.',
                    'Archivar la saca del trabajo activo. Restaurar la devuelve. Descartar la archiva con un motivo.',
                    'La ficha guarda comentarios, documentos, historial y, si el proceso lo tiene, resultados de pruebas e informe.',
                ]} />
            </>
        ),
    },
    {
        id: 'masivos',
        title: 'Mesa de procesos masivos',
        keywords: 'tabla columnas contacto whatsapp correo documentos perfil ideal guion fidelización',
        body: (
            <>
                <P>
                    La tabla es la mesa de trabajo de un volumen alto. Cada fila es una persona. Cada columna es un dato del proceso: identidad, etapa, o una columna que usted creó.
                </P>
                <H3>Qué se configura en el proceso</H3>
                <Ul items={[
                    'Columnas propias: texto, fechas, sí/no y listas. Esas columnas también pueden recibir respuestas de Tally si se mapean.',
                    'Jerarquía de pruebas y pruebas de conducta.',
                    'Informes psicolaborales: puesto por defecto, set de competencias y plantilla de conclusión.',
                    'Plantillas de documentos Word y el mapeo de cada campo al dato de la fila.',
                    'Mensajes de contacto para correo y WhatsApp.',
                    'Ficha complementaria: un enlace público aparte, con sus propios campos obligatorios, para completar datos que el formulario inicial no trajo.',
                ]} />
                <H3>Qué se hace desde la tabla</H3>
                <Table
                    headers={['Acción', 'Efecto']}
                    rows={[
                        ['Agregar columna', 'Crea un dato extra del proceso. Clasificación para el Panel e Informe psicolaboral son opcionales: no crean otra columna. Dicen a los gráficos y al PDF cómo leer el valor. En Automático, el sistema usa el título.'],
                        ['Editar columnas propias', 'Cambia nombre, tipo y opciones de las columnas creadas en el proceso. No muestra ni oculta columnas. Las columnas fijas (Nombres, Teléfono, Llamadas, pruebas) no están en esta lista.'],
                        ['Mostrar columnas', 'Enciende, apaga o fija columnas de la tabla, del sistema y propias. Agrupa las que se parecen (Email y Correo, Teléfono y Llamadas, estado de una prueba y una casilla) y explica por qué conviven.'],
                        ['Link pruebas', 'Copia el enlace público del ATS (?pruebas=1). La persona escribe su DNI ahí. Es distinto de la URL de Tally.'],
                        ['Invitar a pruebas', 'Abre el correo de las filas seleccionadas que tienen email, con los pasos y el enlace. Si el proceso aún no tiene batería, el sistema lo avisa.'],
                        ['Resultados pruebas', 'Abre la batería de la fila seleccionada: puntaje, ítems, clave y opción de reevaluación.'],
                        ['Guía de pruebas', 'Abre este manual en el capítulo de ejecución de las pruebas.'],
                        ['Informe psico. y Eval. masiva', 'Califican competencias y arman el PDF. Aparecen cuando el proceso tiene informes habilitados.'],
                        ['Inventario', 'Edita niveles, rasgos, sets de competencias y plantillas de todo el sistema.'],
                        ['Perfil ideal', 'Define reglas sobre columnas y marca qué tan cerca está cada fila.'],
                        ['Documentación', 'Genera Word por persona y permite bajar un ZIP de las filas seleccionadas.'],
                        ['Estructura del guion', 'Arma las preguntas del guion de llamada. La consola se abre desde la ficha, durante el contacto.'],
                        ['Mensajes contacto, Tarifas, Estadísticas, Performance, Historial', 'Plantillas de salida, costos de ruta, gráficos del proceso, cobertura y bitácora de cambios.'],
                    ]}
                />
                <P>
                    Actualizar, en la barra de la tabla, vuelve a leer candidatos y columnas desde la base. El botón Actualizar del menú lateral recarga procesos y candidatos de toda la sesión.
                </P>
            </>
        ),
    },
];

const TALLY_SECTION: HelpSection = {
    id: 'tally',
    title: 'Integración con Tally',
    keywords: 'tally webhook formulario mapeo label nombres dni apellido etapa integración google forms',
    body: (
        <>
            <P>
                Tally es el formulario que ve quien postula. Opalo no aloja esas preguntas: recibe una copia de cada envío y la convierte en ficha. Hay dos direcciones y cumplen trabajos distintos.
            </P>
            <Table
                headers={['Dirección', 'Quién la usa', 'Para qué']}
                rows={[
                    ['URL pública de Tally (tally.so/r/…)', 'La persona que postula', 'Abrir y enviar el formulario.'],
                    ['URL de webhook que entrega Opalo', 'La configuración de Tally, en Integrations', 'Avisar a Opalo, en silencio, cada vez que alguien envía.'],
                ]}
            />
            <H3>1. Deje listo el proceso</H3>
            <Ul items={[
                'El proceso ya tiene que existir y tener al menos una etapa. La postulación entra en la primera etapa según el orden guardado.',
                'Si la tabla usa columnas propias (distrito, turno, experiencia, etc.), créelas antes de mapear. El mapeo lista las columnas que el proceso tiene en ese momento.',
            ]} />
            <H3>2. Cree la integración</H3>
            <Ol items={[
                'Menú Formularios → Nueva integración.',
                'Plataforma: Tally. Nombre interno, para reconocerla en la lista.',
                'URL del formulario: pegue la dirección pública, la que empieza por tally.so. Esa URL no recibe datos; solo queda guardada como referencia.',
                'Vincular a proceso: elija el proceso normal o masivo que debe recibir a estas personas.',
                'Abra Mapeo de campos personalizado si los títulos de las preguntas de Tally no coinciden con los nombres de Opalo.',
                'Guarde. Opalo muestra una URL de webhook, única para esta integración. Cópiela.',
            ]} />
            <H3>3. Conecte el webhook en Tally</H3>
            <Ol items={[
                'En el formulario de Tally abra Settings → Integrations.',
                'Elija Webhook.',
                'Pegue la URL que copió de Opalo. Tiene la forma …/functions/v1/tally-webhook/…',
                'Guarde en Tally. Desde ese momento, cada envío hace una llamada a esa URL.',
            ]} />
            <P>
                Si más adelante edita la integración, la plataforma no cambia y el webhook sigue siendo el mismo. Puede corregir el proceso vinculado y los labels. Borrar la integración en Opalo no borra el formulario en Tally; deja de crear fichas porque esa URL ya no encuentra a quién entregar el envío.
            </P>
            <H3>4. Cómo se reconoce cada respuesta</H3>
            <P>
                Opalo compara el título de la pregunta en Tally con el campo de la ficha. La comparación ignora mayúsculas y espacios de más, pero el texto tiene que ser el de esa pregunta. Si el título ya es el nombre del campo, puede dejar el mapeo en blanco y se asigna solo.
            </P>
            <Table
                headers={['Campo en Opalo', 'Si el título en Tally es este, puede ir en blanco']}
                rows={[
                    ['Nombres', 'Nombres'],
                    ['Apellido Paterno', 'Apellido Paterno'],
                    ['Apellido Materno', 'Apellido Materno'],
                    ['DNI', 'DNI'],
                    ['Email', 'Email'],
                    ['Teléfono / Teléfono 2', 'Teléfono / Teléfono 2'],
                    ['Fuente, Provincia, Distrito, Dirección, Edad', 'El mismo nombre'],
                    ['Expectativa salarial, LinkedIn, Descripción', 'El mismo nombre'],
                    ['Columna propia del proceso', 'El nombre de esa columna'],
                ]}
            />
            <Ul items={[
                'Si la pregunta se llama distinto, escriba en el mapeo el label exacto de Tally, con sus mayúsculas y espacios. Ejemplo: la pregunta «Número de documento» se escribe así en la casilla del campo DNI.',
                'El nombre que se ve en tarjetas y listados se arma con Nombres + Apellido Paterno + Apellido Materno. Esos tres campos son la identidad, en el tablero y en la tabla.',
                'Nombre completo (legado) se usa solo cuando el formulario antiguo tenía una sola pregunta de nombre y no las tres partes. Si ya mapeó Nombres y apellidos, deje el legado vacío.',
                'Las columnas de la tabla, distintas de la identidad, aparecen en «Solo modo tabla». Pulse Actualizar campos del proceso si acaba de crear una columna y aún no sale en la lista.',
                'Un campo sin mapear y cuyo título no coincide queda vacío en la ficha. El aviso ámbar cuenta cuántos campos del proceso siguen sin label.',
                'Hace falta al menos nombre o correo para aceptar el envío. Sin ninguno de los dos, la postulación no crea ficha.',
            ]} />
            <H3>5. Qué ocurre en el segundo del envío</H3>
            <Ol items={[
                'Tally llama al webhook con las respuestas.',
                'Opalo busca la integración cuya URL de webhook es exactamente esa.',
                'Carga el proceso vinculado y toma la primera etapa.',
                'Traduce cada respuesta al campo mapeado y normaliza mayúsculas de nombres y direcciones.',
                'Busca en ese proceso una ficha activa con el mismo DNI, luego el mismo correo real, luego el mismo teléfono.',
                'Si no hay coincidencia, crea la ficha en la primera etapa, marca el origen como formulario y avisa por el canal de nuevos candidatos, si está configurado.',
                'Si hay coincidencia, no duplica: suma el número de postulación y rellena solo celdas vacías. La etapa en la que ya estaba la persona no se pisa.',
            ]} />
            <H3>Google Forms y Microsoft Forms</H3>
            <P>
                El selector de plataforma también lista Google Forms y Microsoft Forms para guardar el enlace del formulario. La creación automática de la ficha, el mapeo de labels y la re-postulación descritos aquí son el camino de Tally: dependen del webhook que Opalo genera al guardar la integración.
            </P>
        </>
    ),
};

const TESTS_FLOW_SECTION: HelpSection = {
    id: 'pruebas',
    title: 'Ejecución de las pruebas',
    keywords: 'prueba enlace dni batería mandos operativos conducta reevaluación columna invitar implementación',
    body: (
        <>
            <P>
                Las pruebas viven en el proceso masivo. La persona las rinde en un enlace público del propio ATS, identificándose con su documento. El consultor configura la batería, invita, sigue el estado en la tabla y lee el detalle en Resultados pruebas. Los capítulos siguientes (Cómo se aplica, Barsit, Figuras, Personalidad D y las tres de conducta) explican ítems, tiempo, puntaje e interpretación de cada una.
            </P>
            <H3>Implementarlas en un proceso</H3>
            <Ol items={[
                'Abra el proceso masivo y entre a editarlo.',
                'En Pruebas para candidatos elija la jerarquía. «Sin pruebas» deja el enlace vacío de batería clásica.',
                'Mandos medios y superiores asigna Barsit y Personalidad D. Operativos y básicos asigna Figuras (Raven) y Personalidad D.',
                'Marque Incluir pruebas de conducta si además deben rendir Riesgo y recompensa, Atención bajo presión, y Esfuerzo y retorno. Se suman a la jerarquía, en mandos y en operativos.',
                'Guarde el proceso. Hasta ese guardado, Link pruebas e Invitar a pruebas no tienen una batería que mostrar.',
                'En la tabla, abra Mostrar columnas y active, en Estado de las pruebas, Barsit, Raven, Personalidad D, Riesgo, Atención o Esfuerzo. Cada celda pasa por Pendiente, En curso y Realizada. Una casilla propia marcada al completar la prueba es otro dato: un sí/no, no el avance.',
            ]} />
            <H3>Llevar a la persona al enlace</H3>
            <Ul items={[
                    'Link pruebas copia la dirección del ATS con el parámetro pruebas=1, sin documento. Quien la abre escribe su DNI en la pantalla.',
                    'Invitar a pruebas exige filas seleccionadas con un correo real. Abre el redactor con el asunto, los pasos y el mismo enlace. El documento no va en el enlace: la persona lo escribe. Las filas sin correo real se omiten. Un correo interno de respaldo, de los que el sistema crea cuando Tally no trajo email, no sirve para esta invitación.',
                'Este enlace no es el formulario de Tally. Tally crea la ficha. Este enlace busca una ficha que ya exista y le cuelga los resultados.',
            ]} />
            <H3>Lo que hace la persona</H3>
            <Ol items={[
                'Abre el enlace e ingresa un documento de al menos 8 dígitos.',
                'Si ese documento está en más de un proceso con pruebas, elige en cuál rinde.',
                'Ve solo las pruebas de la batería de ese proceso, con un nombre neutro: Barsit y Figuras se presentan como Prueba de aptitud, Personalidad D como Cuestionario. Riesgo, Atención y Esfuerzo conservan su nombre porque no revelan un diagnóstico.',
                'Entra a una prueba, lee las instrucciones y el ejemplo. El reloj todavía no corre.',
                'Confirma que desea comenzar. Ahí parte el tiempo de esa prueba.',
                'Responde y envía. Si el tiempo se acaba, se envía lo que alcanzó a responder y se califica eso.',
                'Cada prueba admite un solo envío. Si cierra la página a mitad, puede volver con el mismo enlace: una prueba ya iniciada conserva el mismo reloj y no se reinicia.',
            ]} />
            <H3>Lo que hace el consultor al terminar</H3>
            <Ul items={[
                'La columna de la tabla pasa a Realizada y muestra el puntaje cuando la prueba lo tiene.',
                'Resultados pruebas, con una fila seleccionada, abre el detalle: respuestas, clave al lado de cada ítem, factores y la lectura de conducta.',
                'Una reevaluación se habilita ahí. El puntaje anterior se conserva hasta que la persona inicia el nuevo intento.',
                'En operativos, al enviar Figuras o Personalidad D el informe psicolaboral se actualiza solo en nivel intelectual y rasgos. En mandos los resultados se consultan en Resultados pruebas y el informe no se reescribe.',
                'Las pruebas de conducta dejan el dictamen en Resultados pruebas. Pueden copiarse a las conclusiones. No sustituyen el nivel intelectual ni los rasgos.',
                'Las competencias, la idoneidad y el texto final de conclusiones siguen a cargo del consultor. Ninguna prueba los rellena.',
            ]} />
        </>
    ),
};

const COMPETENCY_SECTION: HelpSection = {
    id: 'competencias',
    title: 'Competencias y qué alimentan',
    keywords: 'competencia inventario set puntaje esperado porcentaje informe plantilla rasgo intelectual conclusión apto',
    body: (
        <>
            <P>
                El inventario es la biblioteca del sistema, compartida por todos los procesos. El proceso elige qué set de esa biblioteca usa su informe y guarda una copia, para que un cambio posterior del inventario no reescriba informes ya armados.
            </P>
            <H3>Dónde se edita el inventario</H3>
            <Ul items={[
                'Al editar el proceso masivo: Informes psicolaborales → Inventario.',
                'En la tabla, si los informes están habilitados: Herramientas → Inventario.',
            ]} />
            <P>El inventario tiene cuatro pestañas. Cada una alimenta una parte distinta del informe.</P>
            <Table
                headers={['Pestaña', 'Qué define', 'Qué alimenta']}
                rows={[
                    ['Niveles intelectuales', 'Nombre, rango de puntaje 0-60 e interpretación de cada nivel.', 'El nivel que escribe Figuras al terminar, en operativos. Si cambia los rangos, esos rangos reemplazan la tabla estándar de la guía de Figuras.'],
                    ['Rasgos de personalidad', 'Nombre y definición de cada rasgo. El inventario de origen trae Estabilidad emocional, Autoconcepto y Sociabilidad.', 'En operativos, Personalidad D escribe el nivel (bajo, promedio, alto) del rasgo cuyo nombre o id corresponde a un factor. Estabilidad y emoción leen S. Autoconcepto, seguridad o dominancia leen D. Sociabilidad o influencia leen I. Norma, detalle o cumplimiento leen C. Un rasgo cuyo nombre no coincide con ningún factor conserva el nivel que ya tenía.'],
                    ['Competencias', 'Sets. Cada set tiene nombre y una lista de competencias con definición y puntaje esperado.', 'La grilla que el consultor califica en el informe y en la evaluación masiva. El porcentaje de la conclusión sale de esas notas.'],
                    ['Conclusiones', 'Plantillas con variables.', 'El borrador de texto al elegir una plantilla dentro del informe.'],
                ]}
            />
            <H3>Cómo dejar las competencias en un proceso</H3>
            <Ol items={[
                'En el inventario, pestaña Competencias, cree o edite un set. Cada competencia necesita nombre, definición y puntaje esperado. El set de ventas que trae el sistema usa 7 en todas.',
                'En el proceso, active Habilitar informes psicolaborales.',
                'Escriba el puesto por defecto. Ese texto entra a la variable {{puesto}} cuando el informe no trae otro cargo.',
                'Elija el set. Al guardar el proceso, las competencias de ese set se copian dentro de la configuración del proceso.',
                'Elija la plantilla de conclusión por defecto, o déjela en blanco para escogerla al evaluar.',
            ]} />
            <H3>Qué hace el consultor al evaluar</H3>
            <P>
                Informe psico. abre un candidato. Eval. masiva abre la misma grilla para varias filas. En ambos casos el consultor asigna, por competencia, la nota obtenida y una observación. También elige el nivel intelectual si Figuras aún no lo escribió, el nivel de cada rasgo si Personalidad D aún no lo escribió, la idoneidad (apto, apto con reservas, no apto) y las conclusiones.
            </P>
            <P>
                Una evaluación nueva arranca cada nota obtenida en el puntaje esperado. El porcentaje sale en 100 hasta que el consultor baje o suba cada nota. Eso es un valor inicial de la grilla, no un cálculo de las pruebas.
            </P>
            <H3>Cómo se convierten las notas en el informe</H3>
            <Table
                headers={['Cálculo', 'Regla']}
                rows={[
                    ['Porcentaje', 'Suma de notas obtenidas dividida entre la suma de puntajes esperados, en porcentaje entero. Es la variable {{porcentaje_competencias}}.'],
                    ['Lectura de una nota', 'Hasta 3: Bajo. De 4 a 6: Promedio. De 7 en adelante: Alto.'],
                    ['Competencias destacadas', 'Las que quedaron en 7 o más. Entran a {{competencias_destacadas}}. Si ninguna llega a 7, el texto usa «competencias evaluadas».'],
                    ['Áreas de mejora', 'Las notas mayores que 0 y de hasta 4. Entran a {{areas_mejora}}.'],
                    ['Resumen de personalidad', 'Cada rasgo con su nivel, en {{personalidad_resumen}}.'],
                    ['Nivel intelectual', 'El nombre del nivel elegido o cargado por Figuras, en {{nivel_intelectual}}.'],
                ]}
            />
            <H3>Variables de la plantilla de conclusión</H3>
            <P>
                Al aplicar una plantilla, estas marcas se reemplazan con los datos de esa evaluación: {'{{nombre}}'}, {'{{puesto}}'}, {'{{estado}}'}, {'{{nivel_intelectual}}'}, {'{{personalidad_resumen}}'}, {'{{porcentaje_competencias}}'}, {'{{competencias_destacadas}}'}, {'{{areas_mejora}}'} y {'{{recomendaciones}}'}. El estado sale de la idoneidad: APTO, APTO CON RESERVAS o NO APTO. El consultor puede editar el texto después de generarlo.
            </P>
            <H3>Qué no alimentan las competencias</H3>
            <Ul items={[
                'No cambian el puntaje de Barsit, Figuras, Personalidad D ni las pruebas de conducta.',
                'No deciden solas la idoneidad. Esa elección es del consultor.',
                'No mueven la etapa del proceso ni el envío a OpsFlow.',
                'En mandos, las pruebas no rellenan el informe: nivel, rasgos y competencias se cargan en la grilla.',
            ]} />
        </>
    ),
};

const SCREEN_SECTIONS: HelpSection[] = [
    {
        id: 'panel',
        title: 'Panel',
        keywords: 'panel dashboard indicadores contactología registros citas contratados filtros actualizar',
        body: (
            <>
                <H3>Qué hace</H3>
                <P>
                    Resume la operación sin editar fichas. Arriba están los volúmenes (procesos activos, candidatos en alcance, descartados y contratados). Después vienen contactología, canales de atención, generación de registros, agendamiento de citas, ingresos a contratación y el perfil promedio de quien fue contratado.
                </P>
                <H3>Cómo se usa</H3>
                <Ol items={[
                    'Recorra cada bloque de arriba hacia abajo. El título del bloque dice qué pregunta responde.',
                    'Cuando un bloque ofrece semana, mes o año, ese periodo acota las tarjetas y los gráficos de ese bloque.',
                    'Pase el cursor por el signo de ayuda de una tarjeta para leer la definición exacta de ese número.',
                    'Actualizar vuelve a leer el panel. «Datos al…» es la hora de esa lectura.',
                    'Los filtros que deje puestos se recuerdan en este navegador.',
                ]} />
                <H3>Cómo lo hace</H3>
                <Ul items={[
                    'Lee candidatos, etapas, intentos de contacto (llamada, WhatsApp, correo) y agendas que ya están guardados. No tiene una base aparte.',
                    'Formulario cuenta postulaciones Tally por la hora de la primera postulación. Manual (ATS) cuenta altas hechas por el equipo.',
                    'El tiempo al primer contacto mide desde el alta hasta el primer intento hecho con el botón de contacto. Cambiar el estado a mano no cuenta como intento.',
                    'Contratados salen de la etapa de contratación o de la lista de contratados del proceso.',
                ]} />
            </>
        ),
    },
    {
        id: 'inteligencia',
        title: 'Inteligencia',
        keywords: 'inteligencia flujo postulantes desempeño cartera procesos llamadas contrataciones periodo',
        body: (
            <>
                <H3>Qué hace</H3>
                <P>
                    Es la lectura ejecutiva para administración y supervisión. Cruza el flujo de postulantes, el desempeño de quien contacta y la salud de la cartera de procesos. No mueve etapas ni edita fichas.
                </P>
                <H3>Cómo se usa</H3>
                <Ol items={[
                    'Elija últimos 7 días, último mes o último año. Ese periodo acota ingresos, llamadas y contrataciones.',
                    'Lea las tarjetas de arriba y después el flujo diario, el desempeño por usuario y el resumen de procesos.',
                    'En el resumen filtre por estado del proceso y ordene columnas para ver qué vacante pide atención.',
                    'Actualizar vuelve a pedir flujo, traspasos e intentos de contacto.',
                ]} />
                <H3>Cómo lo hace</H3>
                <Ul items={[
                    'El flujo diario cuenta altas por día. Compara hasta ocho procesos con más ingreso y, al lado, el total de todos.',
                    'Desempeño por usuario suma llamadas, llamadas que terminaron en interesado, interés, desistimiento y contrataciones del periodo.',
                    'La cartera cuenta procesos en proceso, en stand by y terminados.',
                    'Solo quien tiene la sección Inteligencia la ve. El administrador la tiene siempre.',
                ]} />
            </>
        ),
    },
    {
        id: 'tablero',
        title: 'Tablero de un proceso',
        keywords: 'tablero kanban arrastrar etapa ficha comunicar cartas importar performance modo tabla finalizar',
        body: (
            <>
                <H3>Qué hace</H3>
                <P>
                    Es el tablero de una vacante: una columna por etapa y una tarjeta por persona. Sirve para mover pocas personas, abrir la ficha y lanzar acciones de ese proceso.
                </P>
                <H3>Cómo se usa</H3>
                <Ol items={[
                    'Arrastre una tarjeta de una columna a otra para cambiarle la etapa.',
                    'Abra la tarjeta para ver ficha, comentarios, documentos e historial.',
                    'Marque varias tarjetas para emitir cartas o comunicar solo a esa selección. Comunicación masiva escribe a todo el proceso.',
                    'Performance abre cobertura y desempeño. Ver documentos abre los archivos del proceso. Editar proceso cambia título, cliente y etapas.',
                    'Importar candidatos carga un archivo. Importar CV lee un currículum hacia la ficha.',
                    'Modo tabla, cuando el proceso lo admite, pasa a la mesa de alta densidad. Finalizar cierra la operación. Si ya no está En proceso, Reactivar lo devuelve.',
                ]} />
                <H3>Cómo lo hace</H3>
                <Ul items={[
                    'Mover una tarjeta guarda la etapa nueva y deja el movimiento en el historial de la persona.',
                    'La primera etapa, según el orden guardado al editar el proceso, es la bandeja donde cae cada postulación de Tally.',
                    'Un proceso que no está En proceso deja de aceptar la gestión habitual hasta reactivarlo. Al reactivarlo vuelven las alertas de esa vacante.',
                ]} />
            </>
        ),
    },
    {
        id: 'archivados',
        title: 'Archivados',
        keywords: 'archivados restaurar historial sacar del tablero',
        body: (
            <>
                <H3>Qué hace</H3>
                <P>
                    Lista a las personas que se sacaron del trabajo activo, de cualquier proceso. Desde aquí se lee el historial y se puede devolverlas al proceso.
                </P>
                <H3>Cómo se usa</H3>
                <Ol items={[
                    'Busque a la persona en la lista.',
                    'Ábrala para leer la ficha y el historial.',
                    'Restaure si debe volver al trabajo activo.',
                ]} />
                <H3>Cómo lo hace</H3>
                <Ul items={[
                    'Archivar marca la ficha y la quita de tableros y tablas activas. No la borra.',
                    'Restaurar la devuelve a su proceso y a la etapa en la que estaba.',
                    'Una postulación nueva por Tally no reabre una ficha archivada: entra como registro nuevo.',
                ]} />
            </>
        ),
    },
    {
        id: 'listado',
        title: 'Candidatos',
        keywords: 'candidatos listado buscar filtro opsflow ficha transversal',
        body: (
            <>
                <H3>Qué hace</H3>
                <P>
                    Muestra a todas las personas fuera de un solo tablero. Sirve para encontrar a alguien sin saber en qué proceso está y para armar un envío al área operativa.
                </P>
                <H3>Cómo se usa</H3>
                <Ol items={[
                    'Escriba nombre, correo, teléfono, DNI o proceso.',
                    'Filtre por proceso y, si eligió uno, por etapa.',
                    'Abra la fila para ver la ficha.',
                    'Marque filas y use Enviar a OpsFlow. El historial de ese envío queda en Envíos OpsFlow.',
                ]} />
                <H3>Cómo lo hace</H3>
                <Ul items={[
                    'La lista lee las fichas que la sesión ya cargó. No crea personas nuevas.',
                    'Enviar a OpsFlow arma un paquete con los datos de las filas marcadas y lo entrega a operación.',
                    'El envío no cambia la etapa por sí solo.',
                ]} />
            </>
        ),
    },
    {
        id: 'opsflow',
        title: 'Envíos a OpsFlow',
        keywords: 'opsflow paquete entrega reintentar operación historial',
        body: (
            <>
                <H3>Qué hace</H3>
                <P>
                    Guarda el historial de paquetes enviados a OpsFlow desde Candidatos o desde la tabla de un proceso masivo. Aquí se consulta si operación recibió el paquete.
                </P>
                <H3>Cómo se usa</H3>
                <Ol items={[
                    'Actualizar vuelve a leer el historial.',
                    'Abra un paquete para ver a quién incluía, quién lo envió y el estado de entrega.',
                    'Si la entrega falló, Reintentar vuelve a enviarlo.',
                ]} />
                <H3>Cómo lo hace</H3>
                <Ul items={[
                    'Cada envío guarda un paquete: personas, fecha, autor y si OpsFlow lo recibió.',
                    'Reintentar entrega ese mismo paquete. No crea fichas nuevas en el ATS ni duplica el envío en el historial como si fuera otro lote.',
                ]} />
            </>
        ),
    },
    {
        id: 'cartas',
        title: 'Cartas',
        keywords: 'cartas word plantilla marcadores docx salario fecha nombre dni',
        body: (
            <>
                <H3>Qué hace</H3>
                <P>
                    Arma una carta de Word con los datos de una persona. Usted escribe la plantilla. El sistema solo rellena los marcadores.
                </P>
                <H3>Cómo se usa</H3>
                <Ol items={[
                    'En Word escriba el texto y deje marcadores con doble llave, por ejemplo {{Nombre}} o {{DNI}}.',
                    'Suba el archivo .docx, elija a la persona y revise los avisos de campos vacíos.',
                    'Descargue la carta. Puede guardar la plantilla para usarla otra vez.',
                    'Ver guía de plantillas, en esta misma pantalla, lista cada marcador y las variaciones de nombre que el sistema reconoce.',
                ]} />
                <H3>Cómo lo hace</H3>
                <Ul items={[
                    'Lee el Word y detecta cada {{campo}}, aunque Word lo haya partido en varios trozos internos.',
                    'Sustituye el marcador con la ficha: nombre, correo, teléfono, DNI, dirección, puesto, empresa, fechas y salario.',
                    'El salario en letras se genera al guardar el salario acordado en la ficha. La fecha de emisión se arma al generar la carta, en formato «26 de noviembre de 2025».',
                ]} />
            </>
        ),
    },
    {
        id: 'calendario',
        title: 'Calendario',
        keywords: 'calendario entrevista agendar cita entrevistador hueco',
        body: (
            <>
                <H3>Qué hace</H3>
                <P>
                    Muestra las entrevistas en un calendario. Cada evento es una cita con una persona. No es el acuerdo de equipo de Planeamiento.
                </P>
                <H3>Cómo se usa</H3>
                <Ol items={[
                    'Agendar entrevista abre el formulario de una cita nueva.',
                    'Pulse un hueco del calendario para agendar en ese horario.',
                    'Pulse un evento ya puesto para abrirlo o cambiarlo.',
                ]} />
                <H3>Cómo lo hace</H3>
                <Ul items={[
                    'Cada evento guarda candidato, entrevistador, inicio y fin.',
                    'Las citas se crean desde esta pantalla, desde la ficha o desde la selección en la tabla masiva.',
                    'El calendario las dibuja. Abrir un evento vuelve a esa misma cita, no crea otra.',
                ]} />
            </>
        ),
    },
    {
        id: 'planeamiento',
        title: 'Planeamiento',
        keywords: 'planeamiento asignación consultores reunión horario color proceso semana',
        body: (
            <>
                <H3>Qué hace</H3>
                <P>
                    Es el acuerdo de la reunión de equipo: qué proceso trabaja cada consultor y en qué horario. No mueve candidatos ni agenda entrevistas.
                </P>
                <H3>Cómo se usa</H3>
                <Ol items={[
                    'Nueva asignación elige proceso, color, consultores y el rango de fecha y hora.',
                    'Cambie de semana o de mes para ver la carga.',
                    'Abra una asignación ya puesta para corregirla o quitarla.',
                ]} />
                <H3>Cómo lo hace</H3>
                <Ul items={[
                    'Guarda proceso, personas, inicio y fin. El color pertenece al proceso.',
                    'Los consultores se muestran como etiquetas debajo del nombre del proceso.',
                    'No cambia etapas y no aparece como entrevista en el Calendario.',
                ]} />
            </>
        ),
    },
    {
        id: 'reportes',
        title: 'Reportes',
        keywords: 'reportes exportar json columnas candidatos procesos descarga',
        body: (
            <>
                <H3>Qué hace</H3>
                <P>
                    Ofrece dos tablas de consulta: todos los candidatos y todos los procesos. Sirve para llevarse una copia de lo que hay en el sistema.
                </P>
                <H3>Cómo se usa</H3>
                <Ol items={[
                    'En cada tabla abra Seleccionar columnas y deje marcadas las que necesita.',
                    'Exporte. El archivo descargado es JSON con esas columnas.',
                ]} />
                <H3>Cómo lo hace</H3>
                <P>
                    Arma las filas con las fichas y los procesos ya cargados en la sesión. Exportar no modifica nada en el ATS: solo descarga lo que está en la tabla.
                </P>
            </>
        ),
    },
    {
        id: 'comparador',
        title: 'Comparador',
        keywords: 'comparador widgets gráficos radar informe pdf datos manuales candidatos',
        body: (
            <>
                <H3>Qué hace</H3>
                <P>
                    Contrasta varias personas con gráficos, tablas y un texto para el informe. También puede comparar cifras escritas a mano, sin tomarlas de una ficha.
                </P>
                <H3>Cómo se usa</H3>
                <Ol items={[
                    'Busque y marque a las personas que quiere contrastar.',
                    'Agregue un widget (barras, línea, radar, torta, área, tabla, resumen o lista) y elija qué campos entran.',
                    'Si el widget debe usar cifras sueltas, active datos manuales y escriba las filas.',
                    'Exporte el informe cuando el contraste esté listo.',
                ]} />
                <H3>Cómo lo hace</H3>
                <Ul items={[
                    'Lee de cada ficha los campos elegidos: edad, salario, etapa, días en el proceso, documentos y el resto de la lista del widget.',
                    'Los gráficos salen de esos valores. No recalcula pruebas ni competencias.',
                    'Un widget con datos manuales ignora la base y dibuja solo lo que usted escribió.',
                    'Si adjunta el PDF generado a la ficha, ese archivo queda entre los documentos de esa persona.',
                ]} />
            </>
        ),
    },
    {
        id: 'actividad',
        title: 'Actividad',
        keywords: 'actividad usuarios ingresos bitácora administrador sesión',
        body: (
            <>
                <H3>Qué hace</H3>
                <P>
                    Muestra quién entró y qué hizo en el sistema. Solo la ve un administrador.
                </P>
                <H3>Cómo se usa</H3>
                <Ol items={[
                    'Elija Hoy, 7 días o 30 días.',
                    'Busque por nombre y filtre por categoría: sesión, navegación o cambios.',
                    'Lea el resumen de cada fila. La hora es la del hecho, no la de abrir esta pantalla.',
                ]} />
                <H3>Cómo lo hace</H3>
                <Ul items={[
                    'Cada ingreso, el cierre por inactividad y las acciones relevantes se guardan con usuario, categoría, resumen y hora.',
                    'Esta pantalla solo consulta ese registro. No deshace lo que la persona hizo.',
                ]} />
            </>
        ),
    },
    {
        id: 'usuarios',
        title: 'Usuarios',
        keywords: 'usuarios rol admin reclutador cliente visor mattermost secciones permisos',
        body: (
            <>
                <H3>Qué hace</H3>
                <P>
                    Da de alta a quien puede entrar, le asigna un rol y decide qué secciones del menú ve.
                </P>
                <H3>Cómo se usa</H3>
                <Ol items={[
                    'Añadir usuario con el mismo correo que esa persona tiene en Mattermost.',
                    'No escriba su clave. Al primer ingreso con Mattermost el ATS la vincula.',
                    'Edite el rol y, si hace falta, la lista de secciones visibles.',
                    'Un usuario no puede borrarse a sí mismo.',
                ]} />
                <H3>Cómo lo hace</H3>
                <Ul items={[
                    'Administrador ve todo, incluidas Inteligencia, Actividad, Usuarios y Configuración.',
                    'Reclutador trabaja procesos, masivos, formularios, cartas, calendario, planeamiento, reportes y OpsFlow.',
                    'Cliente consulta panel, procesos, candidatos, calendario, reportes y comparador.',
                    'Visor consulta panel, procesos, candidatos, calendario, planeamiento y reportes, sin gestionar altas.',
                    'Si alguien tiene una lista propia de secciones, esa lista manda sobre el rol. Actividad sigue siendo solo de administrador. Planeamiento se conserva para administrador y reclutador.',
                ]} />
            </>
        ),
    },
    {
        id: 'configuracion',
        title: 'Configuración',
        keywords: 'configuración branding logo drive alertas clientes sedes etiquetas guardar',
        body: (
            <>
                <H3>Qué hace</H3>
                <P>
                    Guarda los ajustes de toda la instalación: aspecto, listas compartidas, Drive y alertas. No configura una sola vacante.
                </P>
                <H3>Cómo se usa</H3>
                <Ol items={[
                    'Cambie el bloque que necesite.',
                    'Pulse Save Changes. Hasta guardar, el resto del sistema sigue con los valores anteriores.',
                ]} />
                <H3>Cómo lo hace</H3>
                <Ul items={[
                    'Branding cambia el nombre y los logos del menú, incluido «Powered by».',
                    'Informe (PDF) define el membrete de los documentos que se exportan.',
                    'Fuentes, clientes, sedes, provincias y distritos son las listas que aparecen al crear procesos, fichas y entrevistas.',
                    'Las etiquetas de la interfaz renombran entradas del menú.',
                    'Si Google Drive está conectado, al crear un proceso el sistema abre una carpeta para los archivos de esa vacante.',
                    'Las alertas arman la campana junto al nombre: candidatos nuevos, sin contacto y el resto de reglas guardadas.',
                ]} />
            </>
        ),
    },
    {
        id: 'shortlists',
        title: 'Shortlists',
        keywords: 'shortlist sala cliente dni presentación entrevista finalista enlace rechazo',
        body: (
            <>
                <H3>Qué hace</H3>
                <P>
                    Arma una sala temporal para que un cliente revise finalistas sin entrar al ATS. La sala tiene tres pasos: Presentación, Entrevista y Finalista. Presentar a alguien no cambia su etapa ni su historial en el proceso de origen.
                </P>
                <H3>Cómo se usa</H3>
                <Ol items={[
                    'En Shortlists cree la sala: nombre y el DNI de quien va a entrar. El cliente del catálogo es opcional. Copie el enlace o envíelo por WhatsApp junto con el DNI. El buscador filtra por nombre, cliente o DNI.',
                    'Abra la ficha de un candidato, en un proceso o en un proceso masivo, y use Presentar en shortlist. Puede venir de cualquier estado del proceso.',
                    'El cliente abre el enlace, ingresa su DNI, comenta, avanza de paso o rechaza con sustento. En Agenda marca su disponibilidad una vez, para toda la sala.',
                    'Cerrar sala apaga el enlace. El historial queda en la sala para que el equipo actualice el proceso cuando lo decida. Editar cambia nombre, DNI o lo que ve el cliente, y conserva el enlace. Eliminar borra la sala y su historial.',
                ]} />
                <H3>Cómo lo hace</H3>
                <Ul items={[
                    'Cada persona en la sala es una referencia a su ficha. La columna, el comentario y el rechazo se guardan en la sala.',
                    'El cliente ve documentos, pruebas y la ficha que se marcaron al crear la sala. No ve notas internas del equipo.',
                    'Reabrir vuelve a habilitar el mismo enlace.',
                ]} />
            </>
        ),
    },
    {
        id: 'importacion',
        title: 'Importación de candidatos',
        keywords: 'importar excel archivo masivo etapa celdas vacías origen',
        body: (
            <>
                <H3>Qué hace</H3>
                <P>
                    Carga varias personas desde un archivo hacia un proceso. Esta entrada suelta ya no está en el menú: la importación se abre dentro del proceso.
                </P>
                <H3>Cómo se usa</H3>
                <Ol items={[
                    'Abra el proceso en Procesos y use Importar candidatos.',
                    'En un proceso masivo, use la importación de filas de la tabla.',
                    'Revise el proceso y la etapa de destino antes de confirmar.',
                ]} />
                <H3>Cómo lo hace</H3>
                <Ul items={[
                    'Crea fichas nuevas o completa las que ya existen en ese proceso.',
                    'Si la ficha ya tenía un valor en una celda, ese valor se conserva. El archivo solo rellena lo vacío.',
                    'El origen de esas altas queda como masivo, distinto de una postulación por formulario y de una fila escrita a mano.',
                ]} />
            </>
        ),
    },
];

const VIEW_HELP_SECTION: Record<string, string> = {
    dashboard: 'panel',
    intelligence: 'inteligencia',
    processes: 'procesos',
    'process-view': 'tablero',
    'bulk-processes': 'masivos',
    archived: 'archivados',
    candidates: 'listado',
    'opsflow-handoffs': 'opsflow',
    shortlists: 'shortlists',
    forms: 'tally',
    letters: 'cartas',
    calendar: 'calendario',
    planning: 'planeamiento',
    reports: 'reportes',
    compare: 'comparador',
    'user-activity': 'actividad',
    users: 'usuarios',
    settings: 'configuracion',
    'bulk-import': 'importacion',
};

export function helpSectionIdForView(viewType: string): string {
    return VIEW_HELP_SECTION[viewType] || 'mapa';
}

const ASSESSMENT_KEYWORDS: Record<string, string> = {
    uso: 'batería candidato enlace reloj reevaluación informe operativos mandos',
    barsit: 'barsit aptitud mando puntaje 60 series verbal',
    figuras: 'raven figuras inteligencia operativo nivel 0-60',
    personalidad: 'personalidad disc dominancia influencia estabilidad cumplimiento rasgos',
    riesgo: 'riesgo globos recompensa impulsivo prudente',
    atencion: 'atención flechas presión interferencia',
    esfuerzo: 'esfuerzo retorno motivación logro créditos',
};

function buildGroups(): HelpGroup[] {
    const assessmentSections: HelpSection[] = ASSESSMENT_GUIDE_SECTIONS.map((section) => ({
        ...section,
        keywords: ASSESSMENT_KEYWORDS[section.id] || section.title,
    }));
    return [
        { id: 'recorrido', label: 'Recorrido', sections: FLOW_SECTIONS },
        { id: 'pantallas', label: 'Pantallas', sections: SCREEN_SECTIONS },
        { id: 'integraciones', label: 'Integraciones', sections: [TALLY_SECTION] },
        { id: 'pruebas', label: 'Pruebas', sections: [TESTS_FLOW_SECTION, ...assessmentSections] },
        { id: 'informe', label: 'Informe', sections: [COMPETENCY_SECTION] },
    ];
}

const GROUPS = buildGroups();
const ALL_SECTIONS = GROUPS.flatMap((group) => group.sections);

export const AppHelpManual: React.FC<{ onClose: () => void; initialSectionId?: string }> = ({
    onClose,
    initialSectionId,
}) => {
    const start = ALL_SECTIONS.find((section) => section.id === initialSectionId) || ALL_SECTIONS[0];
    const [activeId, setActiveId] = useState(start.id);
    const [query, setQuery] = useState('');

    const normalizedQuery = query.trim().toLowerCase();
    const visibleGroups = useMemo(() => {
        if (!normalizedQuery) return GROUPS;
        return GROUPS
            .map((group) => ({
                ...group,
                sections: group.sections.filter((section) => {
                    const haystack = `${section.title} ${section.keywords}`.toLowerCase();
                    return haystack.includes(normalizedQuery);
                }),
            }))
            .filter((group) => group.sections.length > 0);
    }, [normalizedQuery]);

    const visibleSections = visibleGroups.flatMap((group) => group.sections);
    const active = visibleSections.find((section) => section.id === activeId) || visibleSections[0] || start;

    return (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4" onClick={onClose}>
            <div
                className="flex h-[100dvh] sm:h-[min(900px,94vh)] w-full max-w-6xl flex-col bg-white sm:rounded-2xl shadow-xl"
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="app-help-title"
            >
                <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Manual de la aplicación</p>
                        <h2 id="app-help-title" className="text-lg font-semibold text-slate-900">Ayuda</h2>
                        <p className="text-sm text-slate-500">Qué hace cada pantalla, cómo se usa y cómo lo hace el sistema. El candidato no ve esta pantalla.</p>
                    </div>
                    <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Cerrar">
                        <X className="w-5 h-5" />
                    </button>
                </header>
                <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
                    <nav className="flex max-h-48 flex-col border-b border-slate-200 sm:max-h-none sm:w-64 sm:border-b-0 sm:border-r">
                        <div className="px-3 pt-3">
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="search"
                                    value={query}
                                    onChange={(event) => setQuery(event.target.value)}
                                    placeholder="Buscar en el manual"
                                    className="w-full rounded-lg border border-slate-200 py-2 pl-8 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
                                />
                            </div>
                        </div>
                        <div className="flex gap-1 overflow-x-auto px-3 py-2 sm:block sm:flex-1 sm:overflow-y-auto sm:py-3">
                            {visibleGroups.length === 0 && (
                                <p className="px-3 py-2 text-sm text-slate-500">Ningún capítulo coincide con esa búsqueda.</p>
                            )}
                            {visibleGroups.map((group) => (
                                <div key={group.id} className="sm:mb-3">
                                    <p className="hidden px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:block">{group.label}</p>
                                    <div className="flex gap-1 sm:block">
                                        {group.sections.map((section) => (
                                            <button
                                                key={section.id}
                                                type="button"
                                                onClick={() => setActiveId(section.id)}
                                                className={`shrink-0 rounded-lg px-3 py-2 text-left text-sm sm:mb-0.5 sm:w-full ${
                                                    section.id === active.id ? 'bg-teal-700 text-white' : 'text-slate-700 hover:bg-slate-100'
                                                }`}
                                            >
                                                {section.title}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </nav>
                    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
                        <h2 className="text-base font-semibold text-slate-900 mb-2">{active.title}</h2>
                        <div className="space-y-2">{active.body}</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const SectionHelpButton: React.FC<{ sectionId: string; className?: string }> = ({
    sectionId,
    className,
}) => {
    const [open, setOpen] = useState(false);
    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                title="Qué hace esta sección, cómo usarla y cómo funciona"
                aria-label="Ayuda de esta sección"
                className={
                    className ||
                    'inline-flex items-center gap-1.5 shrink-0 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm font-medium text-teal-800 hover:bg-teal-100'
                }
            >
                <CircleHelp className="w-4 h-4" />
                Ayuda
            </button>
            {open && <AppHelpManual initialSectionId={sectionId} onClose={() => setOpen(false)} />}
        </>
    );
};
