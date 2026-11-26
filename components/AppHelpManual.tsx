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
                    Opalo ATS sigue a una persona desde que postula hasta que se decide. Hay dos entradas que no se mezclan: el formulario de Tally crea o actualiza la ficha, y el enlace de pruebas es otra pantalla donde la persona rinde la batería del proceso.
                </P>
                <H3>Dónde se escribe cada cosa</H3>
                <Table
                    headers={['Quiere hacer esto', 'Menú', 'Dónde se escribe']}
                    rows={[
                        ['Abrir una vacante', 'Procesos o Procesos masivos', 'Nuevo proceso. Título, cliente, etapas y estado.'],
                        ['Recibir postulaciones', 'Formularios', 'Nueva integración. URL de Tally, proceso y mapeo de preguntas. El webhook se pega en Tally.'],
                        ['Cargar a alguien a mano', 'Dentro del proceso', 'Nueva fila, o agregar candidato. Nombres, apellidos, DNI, teléfono, email y fuente.'],
                        ['Cargar un Excel', 'Dentro del proceso', 'Importar candidatos. Revise proceso y etapa antes de confirmar.'],
                        ['Seguir el día a día', 'Procesos masivos', 'Doble clic en la celda. Enter guarda. La etapa se cambia en la columna Etapa.'],
                        ['Activar pruebas', 'Editar el proceso masivo', 'Pestaña Configuración avanzada, bloque Pruebas para candidatos.'],
                        ['Calificar el informe', 'Tabla del proceso', 'Informe psico. o Eval. masiva. Notas, idoneidad y conclusiones.'],
                        ['Mostrar finalistas al cliente', 'Shortlists y la ficha', 'Nueva sala (nombre y DNI). Luego Presentar en shortlist desde la ficha.'],
                        ['Ver cómo va la operación', 'Panel e Inteligencia', 'Filtros de arriba. Esas pantallas no editan fichas.'],
                    ]}
                />
                <H3>Orden de trabajo</H3>
                <Ol items={[
                    'Cree el proceso y ordene las etapas. La primera, la de arriba, es donde cae cada postulación nueva de Tally.',
                    'Si las postulaciones llegan por formulario, abra Formularios, cree la integración, copie el webhook y péguelo en Tally. El detalle está en Integración con Tally.',
                    'Si el puesto lleva pruebas, edite el proceso masivo, abra Configuración avanzada y elija la jerarquía. Sin esa elección el enlace público no tiene batería.',
                    'Si va a emitir informe psicolaboral, arme el set en el Inventario y asígnelo al proceso. Esas notas las pone el consultor: las pruebas no las calculan.',
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
                    El menú lateral cambia según el rol y las secciones habilitadas. El botón Ayuda de cada pantalla abre este capítulo. El botón Ayuda del menú abre el capítulo de la pantalla en la que está. Nada de lo que se escribe aquí modifica fichas: es solo la guía.
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
                    Un proceso es una vacante. Se crea en Procesos (Nuevo proceso) o en Procesos masivos. Lleva cliente, título y una lista ordenada de etapas. Tally siempre deposita la postulación nueva en la primera etapa de esa lista.
                </P>
                <H3>Dos formas de trabajar el mismo proceso</H3>
                <Table
                    headers={['Vista', 'Para qué sirve', 'Cómo entra']}
                    rows={[
                        ['Procesos', 'Tablero: una columna por etapa y una tarjeta por persona. Sirve para mover pocas personas.', 'Menú Procesos y luego la tarjeta de la vacante.'],
                        ['Procesos masivos', 'Tabla de muchas filas. Ahí se escriben columnas propias, contacto, documentos, pruebas e informe.', 'Menú Procesos masivos y luego la vacante. Desde el tablero también existe Modo tabla.'],
                    ]}
                />
                <H3>Campos de la pestaña Básico</H3>
                <P>Al crear o editar, la pestaña Básico es la ficha de la vacante. Pulse Crear o Actualizar al final. Cancelar descarta lo que no se guardó.</P>
                <Table
                    headers={['Campo', 'Qué escribir', 'Para qué sirve']}
                    rows={[
                        ['Título del proceso', 'El nombre con el que el equipo reconoce la vacante. Es obligatorio.', 'Sale en el menú, en filtros del Panel y en la tarjeta.'],
                        ['Descripción', 'El contexto del puesto, en texto libre.', 'Lo lee el equipo al abrir el proceso. No lo ve quien postula en Tally.'],
                        ['Cliente', 'Elija uno de la lista, o Sin cliente.', 'La lista se arma en Configuración, bloque Clientes. El nombre y el RUC se muestran en la opción.'],
                        ['Imagen de portada', 'Subir imagen. Clic en la vista previa ajusta el encuadre.', 'Se ve en la tarjeta del proceso. Quitar vuelve a la imagen predeterminada.'],
                        ['Documentación de consulta', 'Agregar documento: requisitos, formatos, bases.', 'El equipo los abre desde la tarjeta. Si Drive está conectado, se suben a la carpeta de la vacante.'],
                        ['Etapas del proceso', 'Un nombre por fila. Arrastre el ícono o use las flechas. El color es de la columna.', 'La etapa 1, la de arriba, es la bandeja de Tally. Agregar etapa suma una columna nueva. Eliminar etapa solo se permite si queda al menos una.'],
                        ['Estado', 'En Proceso, Stand By, Terminado, Cancelado o Trunco.', 'Solo En Proceso mantiene la operación habitual y las alertas. Los demás siguen visibles para reactivar, pero dejan de generar trabajo automático.'],
                        ['Vacantes', 'Un número, mínimo 1.', 'Cuántos cupos tiene la convocatoria. Lo usan cobertura y reportes.'],
                        ['Fecha de inicio del proceso', 'Día en que el equipo empezó a trabajarla.', 'Respaldo de Time to Hire si no hay fecha de publicación.'],
                        ['Fecha de publicación de la oferta', 'Día en que se publicó.', 'Inicio del cómputo de Time to Hire en el Panel.'],
                        ['Fecha de identificación de necesidad', 'Día en que el cliente pidió el puesto.', 'Inicio del cómputo de Time to Fill en el Panel.'],
                    ]}
                />
                <H3>Pestaña Configuración avanzada</H3>
                <P>Solo en el proceso masivo. Aquí no se mueven personas: se define cómo se va a trabajar la tabla.</P>
                <Ul items={[
                    'Prompt de IA para análisis de CV: instrucciones en texto libre para cuando el sistema lee un currículum. Ejemplo: experiencia en ventas y Excel avanzado.',
                    'Killer questions: preguntas de filtro. Escriba el texto, elija Sí/No u Opción múltiple, y marque Requerida si debe contestarse. Quien no cumple queda marcado como no apto.',
                    'Ficha complementaria: enlace público aparte, con sus campos obligatorios, para datos que el formulario inicial no trajo.',
                    'Acceso rápido a WhatsApp: la casilla enciende el botón de WhatsApp en la tabla.',
                    'Pruebas para candidatos e Informes psicolaborales: el detalle está en Ejecución de las pruebas y en Competencias.',
                    'Puntaje de corte y filtrado automático por Score IA aparecen solo si esa columna está visible. El número, de 0 a 100, oculta de la vista principal a quien quede por debajo.',
                ]} />
                <P>
                    Defina título, cliente y etapas antes de conectar Tally. Si el proceso no tiene etapas, el webhook rechaza la postulación. Al crear el proceso, si Drive está configurado, el sistema abre una carpeta para los archivos de esa vacante.
                </P>
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
                    Cada persona pertenece a un proceso y a una etapa. El origen queda registrado para el Panel: formulario (llegó por Tally), manual (fila o ficha creada en el ATS) o masivo (Excel u otra carga por lote).
                </P>
                <H3>Tres puertas de entrada</H3>
                <Ul items={[
                    'Formulario: la persona llena Tally. El webhook crea o actualiza la ficha y la deja en la primera etapa. Usted no escribe esos datos: los trae el formulario si las preguntas están mapeadas.',
                    'Manual: en la tabla, Nueva fila. En el tablero, agregar candidato. El reclutador elige la etapa.',
                    'Masivo: Importar candidatos dentro del proceso. El archivo rellena filas. Las celdas que ya tenían un valor se conservan.',
                ]} />
                <H3>Campos de Nueva fila</H3>
                <P>Esta ventana solo pide lo mínimo para crear la fila. El resto se completa después con doble clic en la celda, o abriendo la ficha con doble clic en la fila.</P>
                <Table
                    headers={['Campo', 'Obligatorio', 'Qué escribir']}
                    rows={[
                        ['Nombres', 'Sí', 'Nombres de pila. Junto con los apellidos arma el nombre que se ve en tarjetas y listados.'],
                        ['Apellido paterno', 'Sí', 'Primer apellido.'],
                        ['Apellido materno', 'No', 'Segundo apellido. Puede quedar vacío.'],
                        ['DNI', 'Sí', 'Documento. Sirve para reconocer a la persona si vuelve a postular y para entrar al enlace de pruebas.'],
                        ['Teléfono', 'No', 'Número de contacto. También se usa para reconocer una re-postulación si no hay DNI ni correo.'],
                        ['Email', 'No', 'Correo real. Si lo deja vacío, el sistema guarda uno interno de respaldo para que la fila exista. Ese correo interno no sirve para invitar a pruebas ni para reconocer una postulación posterior.'],
                        ['Fuente', 'No', 'De dónde llegó: la lista sale de Configuración, Fuentes de candidatos. El Panel la usa en los gráficos de canal.'],
                    ]}
                />
                <P>Añadir fila guarda y vuelve a la tabla. Cancelar no crea a nadie.</P>
                <H3>Si la misma persona vuelve a postular</H3>
                <P>
                    Dentro del mismo proceso, y solo entre fichas que no están archivadas, el sistema busca una coincidencia en este orden: DNI, correo real, teléfono. Si encuentra la ficha, suma una postulación y completa solo los campos y columnas que estaban vacíos. Lo que el equipo ya escribió se mantiene. Una ficha archivada no se reabre por un webhook: llega como registro nuevo.
                </P>
                <P>
                    Si Tally no trae correo, el sistema guarda un correo interno de respaldo para que la ficha pueda existir. Ese correo no se usa para reconocer a la persona en una postulación posterior; el reconocimiento sigue siendo DNI, correo real o teléfono.
                </P>
                <H3>Después del alta, dónde se sigue escribiendo</H3>
                <Ul items={[
                    'Etapa: en el tablero arrastre la tarjeta a otra columna. En la tabla cambie la celda Etapa. El movimiento queda en el historial.',
                    'Datos de contacto y columnas propias: doble clic en la celda, escriba y confirme. Enter guarda. Ctrl+Z deshace. Ctrl+C y Ctrl+V copian y pegan entre celdas.',
                    'Comentarios, documentos e historial: doble clic en la fila, o abra la tarjeta. Ahí también está Presentar en shortlist.',
                    'Archivar saca a la persona del trabajo activo. Descartar la archiva con un motivo. Restaurar, desde Archivados, la devuelve a la etapa en la que estaba.',
                    'Resultados de pruebas e informe aparecen en la ficha solo si el proceso tiene esa batería y los informes habilitados.',
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
                    La tabla es la mesa de un volumen alto. Entre por Procesos masivos y abra la vacante. Cada fila es una persona. Cada columna es un dato: identidad, etapa, o una columna que usted creó.
                </P>
                <H3>Cómo se escribe en la tabla</H3>
                <Ul items={[
                    'Doble clic o Enter en una celda abre la edición. Escriba el valor y confirme. La celda guarda ese dato de esa persona.',
                    'Clic derecho en una celda abre color y comentario de esa celda. El comentario no sustituye el valor: es una nota encima.',
                    'Flechas mueven la selección. Shift y arrastre marcan un bloque. Ctrl y clic marca filas sueltas para cartas, WhatsApp, pruebas o el ZIP de documentos.',
                    'Doble clic en la fila (fuera de una celda en edición) abre la ficha: comentarios, documentos, historial, shortlist y consola de llamada.',
                    'Actualizar, en la barra de la tabla, vuelve a leer candidatos y columnas. El Actualizar del menú lateral recarga procesos y candidatos de toda la sesión.',
                    'El aviso de la barra resume los atajos: copiar, pegar, deshacer y el panel violeta de fidelización, que se desliza sobre la tabla.',
                ]} />
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
                    headers={['Botón', 'Dónde se escribe', 'Qué queda guardado']}
                    rows={[
                        ['Nueva fila', 'Nombres, apellidos, DNI, teléfono, email y fuente.', 'Una persona nueva en la etapa que corresponda. El resto de celdas queda vacío para completarlo en la grilla.'],
                        ['Agregar columna', 'Nombre y tipo. Si es lista, una opción por fila, con color. Si es ruta, la dirección de destino. Si es costo, la columna de ruta que se cotiza.', 'Un dato nuevo del proceso, igual para todas las filas. Clasificación para el Panel e Informe psicolaboral son opcionales y no crean otra columna: dicen a los gráficos y al PDF cómo leer el valor. En Automático, el sistema usa el título.'],
                        ['Editar columnas propias', 'Nombre, tipo y opciones de las columnas que usted creó.', 'Cambia la definición. No muestra ni oculta columnas. Las fijas (Nombres, Teléfono, Llamadas, pruebas) no están en esta lista. Cambiar el tipo no convierte solo los valores viejos.'],
                        ['Mostrar columnas', 'Casilla para ver u ocultar. El pin fija la columna a la izquierda al desplazar.', 'Solo la vista de esta tabla. Agrupa nombres parecidos (Email y Correo, Teléfono y Llamadas, estado de una prueba y una casilla) y explica por qué conviven.'],
                        ['Link pruebas', 'No se escribe nada: copia el enlace.', 'La dirección del ATS con pruebas=1. La persona escribe su DNI al abrirla. No es la URL de Tally.'],
                        ['Invitar a pruebas', 'Seleccione filas con correo real. Revise asunto y cuerpo.', 'Abre el redactor con los pasos y el enlace. Las filas sin correo real, o con el correo interno de respaldo, se omiten.'],
                        ['Resultados pruebas', 'Una fila seleccionada.', 'Puntaje, ítems, clave y reevaluación. La reevaluación se habilita ahí.'],
                        ['Informe psico. y Eval. masiva', 'Nota obtenida y observación por competencia, nivel, rasgos, idoneidad y texto.', 'El PDF del informe. Aparecen cuando el proceso tiene informes habilitados.'],
                        ['Inventario', 'Niveles, rasgos, sets y plantillas.', 'La biblioteca de todo el sistema, no de una sola fila.'],
                        ['Perfil ideal', 'Reglas sobre columnas.', 'Una marca de cercanía en cada fila. No mueve la etapa.'],
                        ['Documentación', 'Plantilla Word y filas seleccionadas.', 'Un Word por persona y un ZIP de las filas marcadas.'],
                        ['Estructura del guion', 'Preguntas de la llamada.', 'El guion. La consola se abre desde la ficha, durante el contacto.'],
                        ['Mensajes contacto, Tarifas, Estadísticas, Performance, Historial', 'Plantillas, costos de ruta, gráficos, cobertura y bitácora.', 'Salidas y lecturas del proceso. Historial no deshace: solo muestra quién cambió qué.'],
                    ]}
                />
                <H3>Tipos de columna y cómo se llena la celda</H3>
                <Table
                    headers={['Tipo', 'Qué se escribe en la celda', 'Detalle al crearla']}
                    rows={[
                        ['Texto', 'Cualquier frase.', 'Sirve para observaciones, turno, disponibilidad.'],
                        ['Número', 'Una cifra.', 'Edad, años de experiencia, monto suelto.'],
                        ['Casilla', 'Sí o no.', 'Si elige una prueba en «se marca sola», el visto se pone al enviar esa prueba. La columna de estado (Pendiente, En curso, Realizada) sigue siendo otra columna.'],
                        ['Fecha', 'Un día.', 'Si la clasifica como Fecha de cita, el Panel la usa en agendamiento.'],
                        ['Lista', 'Una de las opciones.', 'Escriba cada opción al crear la columna. El color se ve cuando esa opción está elegida. Quitar una opción no borra el texto ya guardado en una fila.'],
                        ['Ruta', 'No se escribe el trayecto a mano.', 'Al crearla ponga el destino, igual para todas las filas. Cada fila arma el enlace desde la ubicación de esa persona.'],
                        ['Costo de ruta', 'Pulse Calcular en la fila.', 'Antes tiene que existir una columna Ruta. El monto se guarda y no se vuelve a pedir hasta que alguien recalcule.'],
                    ]}
                />
                <P>
                    Clasificación para el Panel: déjela en Automático si el título ya dice Fuente, Distrito, Provincia, Edad, Asistencia o Fecha de cita. Si el título es otro, elija a mano para que el gráfico lea esa columna. Informe psicolaboral, en el mismo formulario, marca si el texto es Nombres, Apellido paterno, Apellido materno o Apellidos. Marcar una parte del nombre oculta esa columna propia en la tabla, porque ya existe la columna fija.
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
            <P>Menú Formularios, botón Nueva integración. Estos son los campos del formulario. Guarde al final: hasta entonces no existe webhook.</P>
            <Table
                headers={['Campo', 'Qué escribir', 'Qué hace']}
                rows={[
                    ['Plataforma', 'Tally, si las fichas deben crearse solas.', 'Google Forms y Microsoft Forms solo guardan el enlace. No crean fichas ni mapean labels.'],
                    ['Nombre del formulario', 'Un nombre interno, por ejemplo Postulación analista de crédito.', 'Solo lo ve el equipo en la lista de integraciones.'],
                    ['URL del formulario', 'La dirección pública, la que empieza por tally.so/r/.', 'No recibe datos. Queda como referencia para saber qué formulario es.'],
                    ['Vincular a proceso', 'El proceso normal o masivo que debe recibir a estas personas.', 'Sin proceso, el envío no tiene dónde caer. La postulación entra en la primera etapa de ese proceso.'],
                    ['Mapeo de campos', 'El título exacto de la pregunta de Tally, solo si no coincide con el nombre de Opalo.', 'Vacío significa: usar el título tal cual. El aviso ámbar cuenta cuántos campos del proceso siguen sin label.'],
                ]}
            />
            <P>Al guardar, Opalo muestra una URL de webhook, única para esta integración. Cópiela. Si más adelante edita la integración, la plataforma no cambia y el webhook sigue siendo el mismo. Puede corregir el proceso vinculado y los labels.</P>
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
            <H3>Dónde se configuran</H3>
            <P>Edite el proceso masivo, pestaña Configuración avanzada, bloque Pruebas para candidatos. Guarde el proceso. Hasta ese guardado, Link pruebas e Invitar a pruebas no tienen batería.</P>
            <Table
                headers={['Campo', 'Qué elegir', 'Qué rinde la persona']}
                rows={[
                    ['Jerarquía: Sin pruebas', 'Déjelo así si el puesto no lleva batería clásica.', 'El enlace no muestra Barsit, Figuras ni Personalidad D.'],
                    ['Jerarquía: Mandos medios y superiores', 'Puestos de coordinación o jefatura.', 'Barsit (10 minutos) y Personalidad D. Los resultados se leen en Resultados pruebas. No reescriben el informe.'],
                    ['Jerarquía: Operativos y básicos', 'Puestos operativos.', 'Figuras (Raven) y Personalidad D. Al terminar, el informe recibe el nivel intelectual y los rasgos.'],
                    ['Incluir pruebas de conducta', 'Casilla, además de la jerarquía.', 'Se suman Riesgo y recompensa, Atención bajo presión, y Esfuerzo y retorno. El dictamen queda en Resultados pruebas. No reemplazan el nivel intelectual ni los rasgos.'],
                ]}
            />
            <P>En la tabla, abra Mostrar columnas y active, en Estado de las pruebas, Barsit, Raven, Personalidad D, Riesgo, Atención o Esfuerzo. Cada celda pasa por Pendiente, En curso y Realizada. Una casilla propia marcada al completar la prueba es otro dato: un sí/no, no el avance.</P>
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
                Informe psico. abre un candidato. Eval. masiva abre la misma grilla para varias filas. Estos son los campos que se escriben ahí. Guardar arma el informe. Las pruebas no rellenan estas notas.
            </P>
            <Table
                headers={['Campo de la grilla', 'Qué escribir', 'De dónde puede venir ya lleno']}
                rows={[
                    ['Nota obtenida', 'Un número por competencia. Arranca en el puntaje esperado, así que el porcentaje sale en 100 hasta que lo baje o lo suba.', 'Nadie lo calcula. Es del consultor.'],
                    ['Observación', 'Una frase por competencia, si hace falta matizar la nota.', 'Texto libre. Entra al informe junto a la nota.'],
                    ['Nivel intelectual', 'Elija el nivel del inventario si todavía está vacío.', 'En operativos, Figuras lo escribe al terminar. En mandos lo elige el consultor.'],
                    ['Nivel de cada rasgo', 'Bajo, promedio o alto.', 'En operativos, Personalidad D lo escribe si el nombre del rasgo corresponde a un factor. Si no corresponde, conserva el valor que ya tenía.'],
                    ['Idoneidad', 'Apto, apto con reservas o no apto.', 'Decisión del consultor. Pasa a la variable de estado: APTO, APTO CON RESERVAS o NO APTO.'],
                    ['Conclusiones', 'Elija una plantilla para armar el borrador y luego edite el texto.', 'La plantilla por defecto del proceso entra sola si se eligió al guardar el proceso. Si quedó en blanco, se escoge aquí.'],
                ]}
            />
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
                    Resume la operación sin editar fichas. No hay celdas para cargar candidatos: los números salen de lo que ya está guardado en procesos, etapas y contactos. Arriba están los volúmenes (procesos activos, candidatos en alcance, descartados y contratados). Después vienen contactología, canales de atención, generación de registros, agendamiento de citas, ingresos a contratación y el perfil promedio de quien fue contratado.
                </P>
                <H3>Filtros de arriba: qué acotan</H3>
                <Table
                    headers={['Campo', 'Qué elegir', 'Qué cambia']}
                    rows={[
                        ['Tipo de proceso', 'Todos (regulares + masivos), Solo procesos masivos o Solo procesos regulares.', 'Deja fuera del Panel los procesos del otro tipo.'],
                        ['Proceso', 'Una vacante, o todas.', 'Los gráficos pasan a leer solo esa vacante.'],
                        ['Postulación desde', 'Una fecha.', 'Solo entran fichas cuya postulación es de ese día en adelante.'],
                        ['Postulación hasta', 'Una fecha.', 'Cierra el rango. Vacío significa sin tope.'],
                    ]}
                />
                <P>Esos cuatro filtros se recuerdan en este navegador. Actualizar vuelve a leer el Panel. «Datos al…» es la hora de esa lectura, no la hora de las postulaciones.</P>
                <H3>Cómo leer cada bloque</H3>
                <Ol items={[
                    'Recorra de arriba hacia abajo. El título del bloque dice qué pregunta responde.',
                    'Cuando un bloque ofrece semana, mes o año, ese periodo acota solo las tarjetas y los gráficos de ese bloque. No mueve los filtros de postulación de arriba.',
                    'En contactología, el rango semanal, mensual o anual aplica a la fecha del intento de contacto, no a la fecha en que la persona postuló.',
                    'Pase el cursor por el signo de ayuda de una tarjeta para leer la definición exacta de ese número.',
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
                    'Arriba elija últimos 7 días, último mes o último año. Ese único campo acota ingresos, llamadas y contrataciones de toda la pantalla.',
                    'Lea las tarjetas de arriba y después el flujo diario, el desempeño por usuario y el resumen de procesos.',
                    'En el resumen, el filtro de estado deja ver solo En Proceso, Stand By o terminados. Pulse el título de una columna para ordenar y ver qué vacante pide atención.',
                    'Actualizar vuelve a pedir flujo, traspasos e intentos de contacto. No edita fichas ni etapas.',
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
                    'Cada columna del tablero es una etapa, en el orden guardado al editar el proceso. Arrastre una tarjeta de una columna a otra para cambiarle la etapa. El movimiento queda en el historial de esa persona.',
                    'Abra la tarjeta para la ficha: datos, comentarios, documentos, historial y, si aplica, pruebas e informe. Presentar en shortlist también está ahí.',
                    'Marque varias tarjetas para emitir cartas o usar Comunicar solo con esa selección. Comunicación masiva escribe a todo el proceso, no solo a las marcadas.',
                    'Performance abre cobertura y desempeño de esta vacante. Ver documentos abre los archivos subidos en Documentación de consulta. Editar proceso cambia título, cliente, etapas, estado y fechas.',
                    'Importar candidatos carga un archivo hacia una etapa. Importar CVs lee currículums hacia fichas ya existentes o nuevas.',
                    'Modo tabla, cuando el proceso lo admite, pasa a la mesa de alta densidad. Finalizar proceso cierra la operación. Si ya no está En Proceso, Reactivar lo devuelve y vuelven las alertas de esa vacante.',
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
                    'Use el buscador de la pantalla para filtrar por nombre u otro dato visible. La lista mezcla procesos: no hace falta saber en cuál estaba.',
                    'Abra la fila para leer la ficha y el historial. Desde aquí no se edita la etapa ni se contacta: es consulta.',
                    'Restaure si debe volver al trabajo activo. Vuelve al mismo proceso y a la etapa en la que estaba al archivarse.',
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
                    'El buscador de arriba acepta nombre, correo, teléfono, DNI o nombre de proceso. Escriba y la lista se reduce. No crea personas.',
                    'El filtro de proceso deja una sola vacante. Si eligió una, aparece el filtro de etapa para quedarse con una columna del tablero.',
                    'Abra la fila para la ficha completa: los mismos datos que en el proceso de origen.',
                    'Marque las casillas de las filas y pulse Enviar a OpsFlow. Revise el paquete antes de confirmar. El envío no cambia la etapa. El historial queda en Envíos OpsFlow.',
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
                    'Esta pantalla no arma el envío. El paquete se crea en Candidatos o en la tabla masiva, con Enviar a OpsFlow. Aquí solo se consulta.',
                    'Actualizar vuelve a leer el historial. Cada fila es un paquete: personas incluidas, fecha, quién lo envió y si OpsFlow lo recibió.',
                    'Abra un paquete para leer ese detalle. Si la entrega falló, Reintentar vuelve a entregar el mismo paquete. No crea fichas nuevas ni duplica el lote en el historial.',
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
                    'En Word escriba el texto fijo y deje huecos con doble llave, por ejemplo {{Nombre}} o {{DNI}}. Guarde el archivo como .docx.',
                    'En Cartas suba ese archivo. Elija a la persona: el sistema lee su ficha y avisa qué marcadores quedaron vacíos porque ese dato no está cargado.',
                    'Si el aviso señala un campo vacío, vuelva a la ficha o a la celda de la tabla, escriba el dato y genere la carta otra vez. Descargue el Word resultante.',
                    'Puede guardar la plantilla para no subirla de nuevo. Ver guía de plantillas, en esta misma pantalla, lista cada marcador y las variaciones de nombre que el sistema reconoce.',
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
                    'Agendar entrevista abre el formulario. También puede pulsar un hueco del calendario: la fecha y la hora de ese hueco entran solas.',
                    'Pulse un evento ya puesto para abrirlo o cambiarlo. Guardar actualiza esa cita. No crea otra.',
                ]} />
                <H3>Campos de la cita</H3>
                <Table
                    headers={['Campo', 'Qué escribir', 'Qué hace']}
                    rows={[
                        ['Candidato', 'La persona de la lista.', 'La cita queda colgada de su ficha. Si entra desde la ficha o desde filas marcadas, este campo ya viene elegido.'],
                        ['Entrevistador', 'Quién del equipo la recibe.', 'Sale en el título del evento: persona con entrevistador.'],
                        ['Título', 'Un nombre corto de la cita.', 'Es el texto del evento en el calendario.'],
                        ['Fecha, hora inicio y hora fin', 'Día y rango.', 'El calendario dibuja el bloque entre esas dos horas.'],
                        ['Notas', 'Texto libre: dirección, enlace, qué llevar.', 'Lo lee quien abre la cita. No cambia la etapa.'],
                        ['Emails de asistentes', 'Un correo y pulse agregar. La pastilla se puede quitar.', 'Esos correos quedan en la cita para avisar a quien acompaña.'],
                    ]}
                />
                <H3>Cómo lo hace</H3>
                <Ul items={[
                    'Cada evento guarda candidato, entrevistador, inicio y fin.',
                    'Las citas se crean desde esta pantalla, desde la ficha o desde la selección en la tabla masiva.',
                    'Planeamiento no aparece aquí: ese acuerdo de equipo no es una entrevista.',
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
                    'Cambie de semana o de mes para ver la carga. Un clic en un día abre Nueva asignación con esa fecha.',
                    'Abra una asignación ya puesta para corregirla. Quitar la borra. No mueve candidatos.',
                ]} />
                <H3>Campos de Nueva asignación</H3>
                <Table
                    headers={['Campo', 'Qué escribir', 'Qué hace']}
                    rows={[
                        ['Atajos de fecha', 'Solo este día, Hasta el viernes, Semana laboral o Hasta fin de mes.', 'Rellena Desde y Hasta. Puede corregir las fechas después.'],
                        ['Desde y Hasta', 'El primer y el último día del acuerdo.', 'El bloque se pinta en ese rango.'],
                        ['Indicar hora de inicio y de fin', 'Active la casilla solo si el acuerdo no es el día completo.', 'Aparecen Hora de inicio y Hora de fin, el último día. Si la casilla está apagada, el acuerdo es de día completo.'],
                        ['Procesos', 'Busque y marque uno o varios. Incluir procesos cerrados los suma a la lista.', 'Al crear puede marcar varios. Al editar, uno. El color de cada proceso se elige en la fila de bolitas y se recuerda para ese proceso.'],
                        ['Consultores', 'Busque y marque a quienes lo trabajan.', 'Salen como etiquetas debajo del nombre del proceso.'],
                        ['Nota del acuerdo', 'Texto libre, por ejemplo solo operarios de limpieza hasta el viernes.', 'La lee el equipo al abrir la asignación. No cambia etapas ni crea entrevistas.'],
                    ]}
                />
                <H3>Cómo lo hace</H3>
                <P>
                    Guarda proceso, personas, inicio, fin, color y nota. No cambia etapas y no aparece como entrevista en el Calendario.
                </P>
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
                    'Hay dos tablas: Candidatos y Procesos. Trabaje una por vez.',
                    'Seleccionar columnas abre la lista de campos. Marque solo los que quiere llevarse. Una casilla apagada no borra el dato: solo lo deja fuera del archivo.',
                    'Exporte. Se descarga un JSON con las filas visibles y las columnas marcadas. Exportar no modifica nada en el ATS.',
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
                    'Busque por nombre y marque a las personas. Sin marcas, los gráficos de ficha quedan vacíos.',
                    'Agregue un widget: barras, línea, radar, torta, área, tabla, resumen o lista. En el widget elija qué campos de la ficha entran (edad, salario, etapa, días en el proceso, documentos y el resto de la lista).',
                    'Si el contraste no sale de fichas, active datos manuales en ese widget y escriba usted las filas y los números. Ese widget ignora la base.',
                    'Exporte el informe cuando el contraste esté listo. Si adjunta el PDF a una ficha, el archivo queda entre los documentos de esa persona.',
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
                    'Elija Hoy, 7 días o 30 días. Ese campo acota la lista por la hora del hecho.',
                    'El buscador filtra por el nombre de quien hizo la acción. La categoría deja solo sesión (entró o salió), navegación o cambios.',
                    'Cada fila trae usuario, categoría, resumen y hora. La hora es la del hecho. Esta pantalla no deshace lo que la persona hizo.',
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
                <P>Añadir usuario abre el formulario. No hay campo de clave: al primer ingreso con Entrar con Mattermost el ATS vincula ese correo.</P>
                <Table
                    headers={['Campo', 'Qué escribir', 'Qué hace']}
                    rows={[
                        ['Foto', 'Subir foto, o pegar una URL https.', 'El avatar del menú. Es opcional.'],
                        ['Nombre completo', 'Cómo debe verse en actividad, planeamiento y firmas internas.', 'No tiene que coincidir con Mattermost. El correo sí.'],
                        ['Correo electrónico', 'El mismo correo de Mattermost, en minúsculas.', 'Es la llave del ingreso. Si no coincide, la persona no entra.'],
                        ['Rol', 'Admin (Edición), Recruiter (Consultor), Client (Cliente) o Viewer (Consulta).', 'Al cambiarlo, permisos y secciones vuelven a los de ese rol, salvo que después los personalice.'],
                        ['Permisos', 'Déjelos por defecto o marque acciones concretas.', 'El texto indica si se usan los del rol. Una lista propia manda sobre el rol.'],
                        ['Secciones visibles', 'Las pantallas del menú que esa persona verá.', 'Actividad sigue siendo solo de administrador. Planeamiento se conserva para administrador y reclutador.'],
                    ]}
                />
                <P>Guardar crea o actualiza. Un usuario no puede borrarse a sí mismo. Eliminar, en la lista, quita el acceso. No borra las fichas que esa persona cargó.</P>
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
                <P>Recorra los bloques, cambie los campos y pulse Save Changes arriba a la derecha. Hasta ese botón, el resto del sistema sigue con los valores anteriores. No hay guardado por bloque.</P>
                <H3>Qué se escribe en cada bloque</H3>
                <Table
                    headers={['Bloque', 'Campos', 'Dónde se usa después']}
                    rows={[
                        ['Branding', 'Application Name, Company Logo y POWERED BY Logo.', 'El nombre y los logos del menú, incluido el pie «Powered by».'],
                        ['Informe (PDF)', 'Membrete del informe general y del informe psicolaboral.', 'Los documentos que se exportan. No cambia los datos de la persona.'],
                        ['Fuentes de candidatos', 'Agregue o quite nombres de canal.', 'La lista Fuente al crear una fila y los gráficos de canal del Panel.'],
                        ['Clientes', 'Nuevo cliente pide Razón social y RUC, los dos obligatorios.', 'El desplegable Cliente al crear un proceso y al armar una sala de shortlist. Editar cambia esos datos. Eliminar lo saca de la lista.'],
                        ['Alertas', 'Busque un cliente o un proceso y use el interruptor. Activar todas los vuelve a encender.', 'Apaga los avisos de la campana para ese cliente o esa vacante. Si apaga el cliente, ninguno de sus procesos avisa. Solo lista procesos En Proceso. Hace falta Save Changes.'],
                        ['Sedes de entrevista', 'Nombre y dirección de cada sede.', 'Punto de destino de las rutas en transporte público desde la ficha, en procesos normales.'],
                        ['Provincias y distritos', 'Agregue o quite nombres de la lista.', 'Los campos Provincia y Distrito de la ficha y de la tabla.'],
                        ['UI Labels', 'El texto de cada entrada de menú y de títulos del Panel.', 'Solo el rótulo. No cambia lo que hace la pantalla.'],
                        ['Localization', 'Currency Symbol, por ejemplo S/.', 'El símbolo de moneda en salarios y montos.'],
                        ['Database Connection', 'API URL y API Token. Database Type queda en Baserow.', 'Lo toca quien administra la instalación. No es un campo de una vacante.'],
                        ['Almacenamiento de archivos', 'Conectar Google Drive. Solo el superadministrador configura la conexión.', 'Al crear un proceso se abre una carpeta para los archivos de esa vacante, si Drive está conectado. El resto del equipo ve si está conectado y a qué cuenta.'],
                    ]}
                />
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
                    'En Shortlists pulse nueva sala y complete el formulario de abajo. Copie el enlace o envíelo por WhatsApp junto con el DNI. El buscador de la lista filtra por nombre, cliente o DNI.',
                    'Ver como cliente abre esa misma sala dentro del ATS para revisar la interfaz. Se pueden abrir fichas y documentos, y no se guarda ningún cambio.',
                    'Abra la ficha de un candidato, en un proceso o en un proceso masivo, y use Presentar en shortlist. Puede venir de cualquier etapa. Presentar no cambia su etapa ni su historial en el proceso.',
                    'El cliente abre el enlace, escribe el DNI de acceso, comenta, avanza de paso o rechaza con sustento. En Agenda marca su disponibilidad una vez, para toda la sala.',
                    'Cerrar sala apaga el enlace. El historial queda para que el equipo actualice el proceso cuando lo decida. Editar conserva el enlace. Descargar guarda una tabla solo con los datos visibles. Eliminar borra la sala y su historial. Reabrir vuelve a habilitar el mismo enlace.',
                ]} />
                <H3>Campos de Nueva sala</H3>
                <Table
                    headers={['Campo', 'Qué escribir', 'Qué hace']}
                    rows={[
                        ['Nombre', 'Cómo reconoce el equipo la sala, por ejemplo Finalistas analista de crédito.', 'Título interno y de la sala.'],
                        ['Cliente del ATS, si ya existe', 'Uno del catálogo, o Sin cliente del catálogo.', 'Si elige uno y el nombre de abajo está vacío, se copia la razón social.'],
                        ['Nombre del cliente o de la terna', 'Texto libre si el cliente no está en el catálogo.', 'Es la etiqueta que ve el equipo en la lista.'],
                        ['DNI de acceso', 'Al menos 8 dígitos, el documento de quien revisa.', 'Es la clave del enlace. No es un usuario del ATS. Si lo cambia al editar, el DNI anterior deja de servir y el enlace sigue siendo el mismo.'],
                        ['Documentos', 'Casilla.', 'El cliente puede abrir y descargar documentos, incluido el informe adjunto. La conclusión redactada del informe no se muestra.'],
                        ['Resultados de pruebas', 'Casilla.', 'El cliente ve los resultados de la batería.'],
                        ['Datos del candidato', 'Casilla, y debajo una fila por dato con la columna del proceso.', 'Sin columna elegida, ese dato no aparece. Cada dato muestra el valor de la columna que usted señaló.'],
                    ]}
                />
                <H3>Cómo lo hace</H3>
                <Ul items={[
                    'Cada persona en la sala es una referencia a su ficha. La columna, el comentario y el rechazo se guardan en la sala.',
                    'El cliente ve los documentos, las pruebas y los datos marcados en la sala. Cada dato muestra la columna del proceso que se eligió para él. Los documentos se descargan desde la sala, con el DNI ya ingresado, sin abrir la carpeta de Drive. La conclusión redactada del informe no se muestra.',
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
                    'Abra el proceso en Procesos y use Importar candidatos. En un proceso masivo, use la importación de filas de la tabla. Esta entrada ya no está suelta en el menú.',
                    'Elija el archivo. Revise el proceso de destino y la etapa antes de confirmar: las filas nuevas caen en esa etapa.',
                    'Confirme solo cuando las columnas del archivo coincidan con los campos de la ficha o con columnas propias del proceso. Un encabezado que no coincide no llena ninguna celda.',
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
                        <p className="text-sm text-slate-500">Dónde escribir cada dato, qué hace cada campo y cómo sigue el flujo. El candidato no ve esta pantalla.</p>
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

export const SectionHelpButton: React.FC<{ sectionId: string; className?: string; compact?: boolean }> = ({
    sectionId,
    className,
    compact,
}) => {
    const [open, setOpen] = useState(false);
    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                title="Cómo usar esta pantalla: dónde escribir, qué hace cada campo y cómo sigue el flujo"
                aria-label="Ayuda de esta sección"
                className={
                    className ||
                    (compact
                        ? 'inline-flex items-center justify-center w-8 h-8 shrink-0 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100'
                        : 'inline-flex items-center gap-1.5 shrink-0 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm font-medium text-teal-800 hover:bg-teal-100')
                }
            >
                <CircleHelp className="w-4 h-4" />
                {compact ? <span className="sr-only">Ayuda</span> : 'Ayuda'}
            </button>
            {open && <AppHelpManual initialSectionId={sectionId} onClose={() => setOpen(false)} />}
        </>
    );
};
