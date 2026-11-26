import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { CircleHelp, Download } from 'lucide-react';
import type { Shortlist, ShortlistMember } from '../types';
import { downloadShortlistTable } from '../lib/shortlistExport';

const iconClass = 'inline-flex items-center justify-center w-8 h-8 shrink-0 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100';

export const ShortlistDownloadButton: React.FC<{
    shortlist: Shortlist;
    members: ShortlistMember[];
}> = ({ shortlist, members }) => (
    <button
        type="button"
        onClick={() => downloadShortlistTable(shortlist, members)}
        title="Descargar la tabla con los datos visibles de esta sala"
        aria-label="Descargar tabla"
        className={iconClass}
    >
        <Download className="w-4 h-4" />
    </button>
);

export const ClientShortlistHelp: React.FC = () => {
    const [open, setOpen] = useState(false);
    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                title="Qué puede hacer en esta sala"
                aria-label="Ayuda"
                className={iconClass}
            >
                <CircleHelp className="w-4 h-4" />
            </button>
            {open && createPortal(
                <div className="fixed inset-0 z-[90] bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setOpen(false)}>
                    <div className="bg-white w-full sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl shadow-2xl" onClick={event => event.stopPropagation()}>
                        <header className="px-5 py-4 border-b flex items-start justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">Cómo usar esta sala</h2>
                                <p className="text-sm text-gray-500 mt-1">Solo verá los datos que el equipo dejó habilitados.</p>
                            </div>
                            <button type="button" onClick={() => setOpen(false)} className="text-sm text-gray-500 px-2 py-1">Cerrar</button>
                        </header>
                        <div className="px-5 py-4 space-y-3 text-sm text-gray-700">
                            <p>Esta sala no es el sistema interno. Solo muestra a las personas que el equipo presentó y los datos que dejó habilitados. No cambia la etapa de nadie en el proceso de origen.</p>
                            <p className="font-medium text-gray-900">Los tres pasos</p>
                            <ol className="list-decimal list-inside space-y-1">
                                <li>Presentación: revise a las personas propuestas.</li>
                                <li>Entrevista: deje a quienes quiere conocer.</li>
                                <li>Finalista: deje a quienes recomienda seguir.</li>
                            </ol>
                            <p className="font-medium text-gray-900">Qué puede hacer</p>
                            <ul className="list-disc pl-5 space-y-1">
                                <li>Abra una persona para leer las columnas que el equipo eligió, sus documentos y sus pruebas, si esas casillas están activas. Los documentos se descargan desde esta sala.</li>
                                <li>Escriba un comentario sobre una persona, o un comentario para toda la sala. El equipo lo lee dentro del ATS.</li>
                                <li>Avance a una persona un solo paso. Para rechazarla, escriba el sustento: sin ese texto el rechazo no se guarda.</li>
                                <li>En Agenda marque su disponibilidad una sola vez. Esa marca vale para todas las personas de la sala, no hay que repetirla en cada ficha.</li>
                                <li>El ícono de descarga guarda una tabla solo con los datos visibles. No incluye el resto del proceso ni la conclusión redactada del informe.</li>
                            </ul>
                        </div>
                    </div>
                </div>,
                document.body,
            )}
        </>
    );
};
