import React, { useState } from 'react';
import { X } from 'lucide-react';

interface GuideSection {
    id: string;
    title: string;
    body: React.ReactNode;
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

const SECTIONS: GuideSection[] = [
    {
        id: 'uso',
        title: 'Cómo se aplica',
        body: (
            <>
                <P>
                    El candidato entra con un enlace público, escribe su DNI y ve solo las pruebas de su proceso. El consultor ve el nombre real de cada prueba. El candidato ve un nombre neutro, para no anticipar qué se está midiendo.
                </P>
                <H3>Qué batería lleva cada proceso</H3>
                <Table
                    headers={['Configuración del proceso', 'Pruebas del candidato']}
                    rows={[
                        ['Mandos medios y superiores', 'Barsit y Personalidad D'],
                        ['Operativos y básicos', 'Figuras (Raven) y Personalidad D'],
                        ['Pruebas de conducta activadas', 'Se suman Riesgo, Atención y Esfuerzo, sea mandos u operativos'],
                    ]}
                />
                <H3>Nombre que ve el candidato</H3>
                <Table
                    headers={['Prueba real', 'Nombre en la pantalla del candidato']}
                    rows={[
                        ['Barsit', 'Prueba de aptitud'],
                        ['Figuras (Raven)', 'Prueba de aptitud'],
                        ['Personalidad D', 'Cuestionario'],
                        ['Riesgo, Atención y Esfuerzo', 'El mismo nombre: no revelan un diagnóstico'],
                    ]}
                />
                <H3>Modo de ejecución</H3>
                <Ul items={[
                    'El candidato abre el enlace, confirma su documento y elige una prueba.',
                    'Antes de empezar lee las instrucciones y un ejemplo. El reloj no corre en esa pantalla.',
                    'El tiempo empieza cuando confirma que desea comenzar. Si se acaba, se envía lo respondido.',
                    'Cada prueba se envía una sola vez. Una reevaluación la habilita el consultor en Resultados pruebas. El puntaje anterior se conserva hasta que el candidato inicia el nuevo intento.',
                    'Si sale a mitad, puede volver con el mismo enlace. Una prueba ya iniciada sigue con el mismo reloj: no se reinicia.',
                    'En la tabla del proceso se pueden activar columnas de estado: Pendiente, En curso o Realizada, con el puntaje cuando existe.',
                    'La clave de cada ítem no se publica en esta guía. Al abrir Resultados pruebas de un candidato, cada respuesta muestra la clave al lado.',
                ]} />
                <H3>Qué entra al informe psicolaboral</H3>
                <Ul items={[
                    'Solo en operativos. Mandos se consulta en Resultados pruebas y no reescribe el informe.',
                    'Personalidad D, si está terminada, carga los rasgos del inventario: Estabilidad emocional desde S, Autoconcepto desde D y Sociabilidad desde I.',
                    'Figuras, si está terminada, carga el nivel intelectual con el puntaje llevado a escala 0-60.',
                    'Barsit no carga el nivel intelectual. Las competencias, la idoneidad y las conclusiones no se rellenan solas.',
                    'Si el inventario del sistema tiene otros rangos de puntaje, esos rangos reemplazan la tabla estándar de esta guía.',
                ]} />
            </>
        ),
    },
    {
        id: 'barsit',
        title: 'Barsit',
        body: (
            <>
                <P>
                    Aptitud general para mandos. Mide comprensión verbal, clasificación, analogías, información y series numéricas. No es una prueba de personalidad y no diagnostica un nivel intelectual en el informe.
                </P>
                <H3>Ejecución</H3>
                <Ul items={[
                    '60 ítems. 48 son de opción múltiple, con cinco alternativas. 12 son series: hay que escribir los dos números que faltan.',
                    'Tiempo máximo: 15 minutos, desde la confirmación.',
                    'Si no sabe un ítem, puede pasar. Al enviar se califica lo respondido.',
                    'El candidato la ve como Prueba de aptitud.',
                ]} />
                <H3>Puntuación</H3>
                <Ul items={[
                    'Un punto por ítem correcto. Máximo 60. El puntaje que ve el consultor es ese bruto: no se transforma.',
                    'En las opciones, acierta si el texto coincide con la clave o si escribe la letra A, B, C, D o E. A es la primera opción y E la quinta. No importan mayúsculas ni tildes.',
                    'En las series se extraen los números escritos. Deben ser exactamente los dos de la clave, en cualquier orden. 08 vale igual que 8. Si falta uno o sobra otro, el ítem no suma.',
                    'Un ítem en blanco vale 0. No hay descuento por error.',
                ]} />
                <H3>Cómo leerlo</H3>
                <P>
                    A mayor puntaje, mayor rendimiento en ese conjunto de tareas. Compárelo con el puesto, no con un cociente intelectual. Un mando con puntaje bajo en series y alto en verbal no es el mismo perfil que a la inversa: en Resultados pruebas se ve ítem por ítem qué falló.
                </P>
                <P>
                    No alimenta el nivel intelectual del informe. Ese nivel, en operativos, sale solo de la prueba de figuras.
                </P>
            </>
        ),
    },
    {
        id: 'figuras',
        title: 'Figuras (Raven)',
        body: (
            <>
                <P>
                    Aptitud para operativos. Son 15 figuras incompletas. El candidato elige la pieza que completa el dibujo. Mide razonamiento con patrones visuales, no lenguaje ni conocimientos escolares.
                </P>
                <H3>Ejecución</H3>
                <Ul items={[
                    '15 ítems. Los ítems 1, 2 y 5 a 8 tienen 6 piezas. Los ítems 3, 4 y 9 a 15 tienen 8.',
                    'El número se marca sobre la pieza, en el mismo orden del dibujo.',
                    'Tiempo máximo: 10 minutos, desde la confirmación.',
                    'El candidato la ve como Prueba de aptitud, igual que Barsit, pero solo la recibe el proceso de operativos.',
                ]} />
                <H3>Puntuación y tabulación</H3>
                <P>
                    Se cuenta cuántas piezas son correctas, de 0 a 15. Ese bruto se lleva a escala 0-60 con el redondeo de (aciertos ÷ 15) × 60. Quince aciertos son 60. Trece aciertos son 52. Diez aciertos son 40.
                </P>
                <P>
                    Ese valor de 0 a 60 es el que entra al informe como puntaje intelectual. El nivel sale de esta tabla, salvo que el inventario del sistema tenga otros rangos:
                </P>
                <Table
                    headers={['Puntaje 0-60', 'Nivel', 'Lectura de trabajo']}
                    rows={[
                        ['0 a 15', 'Inferior', 'Dificultad para tareas nuevas y problemas de complejidad media. Conviene supervisión y tareas muy estructuradas.'],
                        ['16 a 25', 'Normal inferior', 'Tareas de baja a media complejidad, con apoyo. Necesita más tiempo para procedimientos nuevos.'],
                        ['26 a 40', 'Normal promedio', 'Tareas de complejidad media, análisis sencillo y rutina con autonomía moderada.'],
                        ['41 a 50', 'Normal superior', 'Buen análisis y aprendizaje ágil. Puede tomar más complejidad con poca supervisión.'],
                        ['51 a 60', 'Superior', 'Alta complejidad, planificación y decisiones con más presión.'],
                    ]}
                />
                <H3>Qué no hace</H3>
                <Ul items={[
                    'No se aplica a mandos. En mandos la aptitud es Barsit y no mueve este nivel.',
                    'Si la prueba no está terminada, el informe no inventa un nivel promedio.',
                    'Un tiempo agotado igual se califica: solo cuenta lo que alcanzó a marcar.',
                ]} />
            </>
        ),
    },
    {
        id: 'personalidad',
        title: 'Personalidad D',
        body: (
            <>
                <P>
                    Cuestionario de 28 grupos de cuatro palabras. En cada grupo el candidato marca la que más lo representa y la que menos. Mide el estilo de conducta en cuatro factores, no una patología y no un diagnóstico clínico.
                </P>
                <H3>Ejecución</H3>
                <Ul items={[
                    '28 grupos. Una palabra en MÁS y otra distinta en MENOS. No puede avanzar ni enviar si falta una de las dos.',
                    'Tiempo máximo: 15 minutos, desde la confirmación.',
                    'El candidato la ve como Cuestionario. La reciben mandos y operativos.',
                ]} />
                <H3>Tabulación</H3>
                <P>
                    Cada palabra pertenece a un solo factor. MÁS suma 1 a ese factor. MENOS resta 1. El neto es MÁS menos MENOS. Cada factor aparece una vez por grupo, así que el neto puede ir de −28 a +28.
                </P>
                <Table
                    headers={['Factor', 'Nombre en el sistema', 'Qué describe un neto alto']}
                    rows={[
                        ['D', 'Dominancia', 'Decisión directa, ritmo, exigencia y orientación al resultado.'],
                        ['I', 'Influencia', 'Sociabilidad, persuasión y búsqueda de contacto.'],
                        ['S', 'Estabilidad', 'Calma, constancia y tolerancia al ritmo del entorno.'],
                        ['C', 'Cumplimiento', 'Norma, detalle, método y cautela antes de actuar.'],
                    ]}
                />
                <H3>Interpretación del neto</H3>
                <Table
                    headers={['Neto del factor', 'Nivel en el informe']}
                    rows={[
                        ['5 o más', 'Alto'],
                        ['Entre −1 y 4', 'Promedio'],
                        ['−2 o menos', 'Bajo'],
                    ]}
                />
                <P>
                    El factor dominante es el de mayor neto. Un neto alto no es mejor ni peor: describe el estilo. Hay que leerlo contra el puesto. Por ejemplo, un C alto encaja con control y calidad; un D alto, con decisión y meta. Un neto bajo en S no significa inestabilidad clínica: en esta escala significa que esa palabra fue menos elegida como «más yo» y más elegida como «menos yo».
                </P>
                <H3>Qué entra al informe de operativos</H3>
                <Table
                    headers={['Rasgo del informe', 'Factor que lo alimenta']}
                    rows={[
                        ['Estabilidad emocional', 'S'],
                        ['Autoconcepto', 'D'],
                        ['Sociabilidad', 'I'],
                    ]}
                />
                <Ul items={[
                    'El factor C se ve en Resultados pruebas. Solo pasa a un rasgo del informe si ese rasgo, por su nombre, habla de norma, detalle o cumplimiento.',
                    'En mandos los factores se consultan en Resultados pruebas y no reescriben el informe.',
                    'Las competencias no se calculan con esta prueba. Siguen siendo calificación del consultor.',
                    'La observación automática del rasgo deja el conteo: cuántas veces fue MÁS, cuántas MENOS y el neto.',
                ]} />
            </>
        ),
    },
    {
        id: 'riesgo',
        title: 'Riesgo y recompensa',
        body: (
            <>
                <P>
                    Tarea de globos. Mide cómo persigue una ganancia cuando seguir aumenta el premio y también la chance de perder lo de esa ronda. No mide inteligencia.
                </P>
                <H3>Ejecución</H3>
                <Ul items={[
                    '15 globos. Cada inflada suma 10 puntos en esa ronda y agranda el globo.',
                    'Cobrar guarda los puntos de la ronda. Si revienta, se pierden solo los puntos de esa ronda. Lo ya cobrado queda.',
                    'No hay un número fijo de infladas seguras. Cada globo puede reventar entre la inflada 1 y la 32, sin aviso.',
                    'Tiempo máximo: 12 minutos. Al terminar el último globo, la prueba se envía.',
                    'Se activa solo si el proceso tiene pruebas de conducta.',
                ]} />
                <H3>Qué se tabula</H3>
                <Table
                    headers={['Dato', 'Cómo se obtiene']}
                    rows={[
                        ['Infladas promedio en globos cobrados', 'Promedio de infladas solo en los globos que cobró. Es el dato central.'],
                        ['Globos reventados (%)', 'Globos perdidos dividido entre 15.'],
                        ['Puntos cobrados', '10 puntos por cada inflada de los globos cobrados. Es el puntaje que se muestra.'],
                        ['Infladas tras una explosión', 'Promedio de infladas en el globo que sigue a uno reventado.'],
                        ['Latencia entre infladas', 'Milisegundos medios entre una inflada y la siguiente.'],
                    ]}
                />
                <H3>Interpretación</H3>
                <Table
                    headers={['Perfil', 'Regla', 'Lectura']}
                    rows={[
                        ['Arriesgado / impulsivo', 'Más de 18 infladas promedio, o más del 40 % de globos reventados', 'Fuerza la ganancia hasta el quiebre. Audacia alta; cuidado en caja, norma o activos.'],
                        ['Prudente / conservador', 'Menos de 8 infladas y a lo más 20 % de quiebres', 'Prefiere una ganancia menor y segura. Confiable en control; puede frenarse si el puesto pide meta agresiva.'],
                        ['Calculado / estratégico', 'Entre 8 y 18 infladas, y entre 15 % y 35 % de quiebres', 'Estira el resultado sin llevar la mayoría de las rondas al límite.'],
                        ['Mixto', 'No cae en las reglas anteriores', 'A veces cuida y a veces estira. Hay que leerlo con el puesto; esta prueba sola no asigna un rol de alto riesgo.'],
                    ]}
                />
                <Ul items={[
                    'Si después de reventar un globo baja más del 40 % las infladas, se lee sensibilidad a la frustración.',
                    'Si después del fallo se mantiene dentro del 20 % de su promedio, el error no le desarma el método.',
                    'Si no reventó ninguno, no hay dato de recuperación.',
                    'Menos de 250 ms entre infladas: decide casi sin pausa. Más de 900 ms: se detiene antes de seguir exponiendo.',
                ]} />
            </>
        ),
    },
    {
        id: 'atencion',
        title: 'Atención bajo presión',
        body: (
            <>
                <P>
                    Serie breve de flechas. Mide si la persona responde al dato central e ignora señales contrarias, bajo un tiempo muy corto. No mide conocimiento.
                </P>
                <H3>Ejecución</H3>
                <Ul items={[
                    '40 figuras. En cada una hay cinco flechas. La respuesta correcta es solo la dirección de la flecha del centro: izquierda o derecha.',
                    '20 figuras son congruentes: los costados apuntan igual que el centro. 20 son incongruentes: los costados apuntan al revés.',
                    'Cada figura admite como máximo 800 milisegundos. Si no responde a tiempo, es error.',
                    'Tiempo máximo de la prueba: 8 minutos. En la práctica la serie corre sola, una figura tras otra.',
                    'Se activa solo si el proceso tiene pruebas de conducta.',
                ]} />
                <H3>Qué se tabula</H3>
                <Table
                    headers={['Dato', 'Lectura']}
                    rows={[
                        ['Aciertos', 'Figuras correctas y a tiempo, sobre 40. Es el puntaje.'],
                        ['Efecto de interferencia', 'Milisegundos de más que tarda en las figuras incongruentes respecto de las congruentes, contando solo las correctas.'],
                        ['Error congruente e incongruente', 'Porcentaje de fallos en cada tipo.'],
                        ['Error en los primeros 10 y en los últimos 10', 'Sirve para ver si la atención se desgasta.'],
                        ['Errores en menos de 200 ms', 'Respondió antes de mirar el centro.'],
                    ]}
                />
                <H3>Interpretación</H3>
                <Table
                    headers={['Perfil', 'Regla', 'Lectura']}
                    rows={[
                        ['Alta concentración', 'Al menos 90 % de aciertos y efecto de interferencia menor a 70 ms', 'Aísla el ruido y sostiene la precisión. Encaja en calidad, digitación y control.'],
                        ['Vulnerable a distractores', 'Menos de 80 % de aciertos, o interferencia mayor a 120 ms', 'El ruido o el tiempo le bajan la calidad. Cuidado con interrupciones y varias órdenes a la vez.'],
                        ['Concentración funcional', 'Queda entre los dos cortes', 'Filtra parte del ruido, con algo de demora o algún error. Útil, y en lo crítico conviene supervisión.'],
                    ]}
                />
                <Ul items={[
                    'Tres o más errores en menos de 200 ms: responde antes de mirar el dato central.',
                    'Si el error de los últimos 10 supera en 20 puntos o más al de los primeros 10, la atención se desgasta en la serie.',
                    'Si los últimos 10 mejoran en 10 puntos o más, sostiene el rendimiento.',
                    'La serie es corta. No reemplaza la observación de una jornada larga.',
                ]} />
            </>
        ),
    },
    {
        id: 'esfuerzo',
        title: 'Esfuerzo y retorno',
        body: (
            <>
                <P>
                    El candidato elige, ronda a ronda, entre una tarea fácil de premio seguro y una retadora de premio mayor e incierto. Mide si invierte esfuerzo según la chance de cobrar, y si termina lo que elige.
                </P>
                <H3>Ejecución</H3>
                <Ul items={[
                    '12 rondas. La probabilidad anunciada es 20 %, 50 % u 80 %, cuatro veces cada una, en orden mezclado.',
                    'La fácil pide 10 toques en hasta 4,2 segundos y paga 1 crédito seguro si se completa.',
                    'La retadora pide 35 toques en hasta 6,2 segundos. Si se completa, paga 3 créditos solo si sale favorecida. La probabilidad de ese favor es la que se mostró antes de elegir. No es la probabilidad de poder hacer los toques.',
                    'Tiempo máximo: 10 minutos.',
                    'Se activa solo si el proceso tiene pruebas de conducta.',
                ]} />
                <H3>Qué se tabula</H3>
                <Table
                    headers={['Dato', 'Lectura']}
                    rows={[
                        ['Elige la retadora al 20, 50 y 80 %', 'En qué probabilidades acepta el esfuerzo extra.'],
                        ['Completa la retadora', 'De las veces que la eligió, cuántas terminó.'],
                        ['Completa la fácil', 'De las veces que eligió lo seguro, cuántas terminó.'],
                        ['Tiempo medio para elegir', 'Milisegundos antes de decidir la tarea.'],
                        ['Créditos', '1 por fácil completada, más 3 por retadora completada y favorecida. Es el puntaje.'],
                    ]}
                />
                <H3>Interpretación</H3>
                <Table
                    headers={['Perfil', 'Regla', 'Lectura']}
                    rows={[
                        ['Alta motivación al logro', 'Elige la retadora en al menos el 60 % de las rondas al 50 %', 'Invierte esfuerzo extra aunque el premio no esté asegurado. Encaja en meta, producción y cierre.'],
                        ['Economizador de esfuerzo', 'En el conjunto de rondas elige la retadora en menos del 30 %', 'Cumple lo seguro y reserva el extra para cuando el beneficio está casi garantizado.'],
                        ['Motivación selectiva', 'No cae en los cortes anteriores', 'Sube la exigencia cuando la chance de cobrar mejora. No se queda siempre en lo fácil ni siempre en lo difícil.'],
                    ]}
                />
                <Ul items={[
                    'Si elige la retadora al menos tres veces y deja sin terminar el 40 % o más de esas rondas, la ambición no llega al cierre.',
                    'Menos de 800 ms para elegir: decide casi sin sopesar el retorno. Más de 8 segundos: se detiene a calcular si vale el esfuerzo.',
                    'Elegir lo difícil no equivale a terminarlo. Hay que mirar el porcentaje de completadas junto con el de elección.',
                ]} />
            </>
        ),
    },
];

export const AssessmentConsultantGuide: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [activeId, setActiveId] = useState(SECTIONS[0].id);
    const active = SECTIONS.find((section) => section.id === activeId) || SECTIONS[0];

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4" onClick={onClose}>
            <div
                className="flex h-[100dvh] sm:h-[min(860px,92vh)] w-full max-w-5xl flex-col bg-white sm:rounded-2xl shadow-xl"
                onClick={(event) => event.stopPropagation()}
            >
                <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Consulta del consultor</p>
                        <h2 className="text-lg font-semibold text-slate-900">Guía de pruebas</h2>
                        <p className="text-sm text-slate-500">Aplicación, qué mide, puntuación e interpretación. El candidato no ve esta pantalla.</p>
                    </div>
                    <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Cerrar">
                        <X className="w-5 h-5" />
                    </button>
                </header>
                <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
                    <nav className="flex gap-1 overflow-x-auto border-b border-slate-200 px-3 py-2 sm:w-56 sm:flex-col sm:overflow-y-auto sm:border-b-0 sm:border-r sm:py-3">
                        {SECTIONS.map((section) => (
                            <button
                                key={section.id}
                                type="button"
                                onClick={() => setActiveId(section.id)}
                                className={`shrink-0 rounded-lg px-3 py-2 text-left text-sm sm:w-full ${
                                    section.id === active.id ? 'bg-teal-700 text-white' : 'text-slate-700 hover:bg-slate-100'
                                }`}
                            >
                                {section.title}
                            </button>
                        ))}
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
