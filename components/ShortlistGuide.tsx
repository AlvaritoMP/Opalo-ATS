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
                    <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl" onClick={event => event.stopPropagation()}>
                        <header className="px-5 py-4 border-b flex items-start justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">Cómo usar esta sala</h2>
                                <p className="text-sm text-gray-500 mt-1">Solo verá los datos que el equipo dejó habilitados.</p>
                            </div>
                            <button type="button" onClick={() => setOpen(false)} className="text-sm text-gray-500 px-2 py-1">Cerrar</button>
                        </header>
                        <ol className="px-5 py-4 space-y-3 text-sm text-gray-700 list-decimal list-inside">
                            <li>La sala tiene tres pasos: Presentación, Entrevista y Finalista.</li>
                            <li>Abra un candidato para ver su ficha, sus documentos y sus pruebas.</li>
                            <li>Puede comentar sobre una persona o dejar un comentario para toda la sala.</li>
                            <li>Puede avanzar un solo paso. Para rechazar, escriba el sustento.</li>
                            <li>En Agenda marque su disponibilidad una vez. Vale para todos los candidatos.</li>
                            <li>El ícono de descarga guarda una tabla con esos mismos datos. No incluye el resto de la información del proceso.</li>
                        </ol>
                    </div>
                </div>,
                document.body,
            )}
        </>
    );
};
