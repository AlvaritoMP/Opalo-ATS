import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Columns3, Pin, X } from 'lucide-react';
import type { CustomColumn } from '../types';
import { isAssessmentColumnId } from '../lib/assessments/columns';
import { FICHA_DATOS_COLUMN_ID } from '../lib/bulkTableColumns';
import { isIdentitySystemColumnId } from '../lib/candidateIdentity';
import { LOOKALIKE_PAIRS, groupColumnsForMenu } from '../lib/columnMenuGuide';

interface BulkColumnVisibilityModalProps {
    isOpen: boolean;
    onClose: () => void;
    columnIds: string[];
    customColumns: CustomColumn[];
    columnOrder: string[];
    hiddenColumns: string[];
    pinnedColumns: string[];
    onShowAll: () => void;
    onToggleVisibility: (colId: string) => void;
    onTogglePin: (colId: string) => void;
}

function isShown(
    colId: string,
    columnOrder: string[],
    hiddenColumns: string[]
): boolean {
    if (isAssessmentColumnId(colId) || colId === FICHA_DATOS_COLUMN_ID) {
        return columnOrder.includes(colId) && !hiddenColumns.includes(colId);
    }
    return !hiddenColumns.includes(colId) || isIdentitySystemColumnId(colId);
}

export const BulkColumnVisibilityModal: React.FC<BulkColumnVisibilityModalProps> = ({
    isOpen,
    onClose,
    columnIds,
    customColumns,
    columnOrder,
    hiddenColumns,
    pinnedColumns,
    onShowAll,
    onToggleVisibility,
    onTogglePin,
}) => {
    const [query, setQuery] = useState('');
    const [helpOpen, setHelpOpen] = useState(false);
    const wasOpen = useRef(false);
    const groups = useMemo(
        () => groupColumnsForMenu(columnIds, customColumns),
        [columnIds, customColumns]
    );
    const hasRepeated = groups.some(group => group.id === 'repeated');
    const normalizedQuery = query.trim().toLowerCase();

    useEffect(() => {
        if (isOpen && !wasOpen.current) {
            setHelpOpen(hasRepeated);
            setQuery('');
        }
        wasOpen.current = isOpen;
    }, [isOpen, hasRepeated]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
                <div className="flex items-start justify-between gap-4 p-6 border-b shrink-0">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                            <Columns3 className="w-5 h-5 text-primary-600" />
                            Mostrar columnas
                        </h2>
                        <p className="text-sm text-gray-600 mt-1">
                            Decide qué columnas se ven en la tabla y cuáles quedan fijas al desplazarse.
                            Aquí están las columnas del sistema y las que usted creó.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        aria-label="Cerrar"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    <div className="rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950 space-y-2">
                        <p className="font-medium">Tres acciones distintas</p>
                        <p>
                            <strong>Mostrar columnas</strong> (esta ventana) enciende o apaga la visibilidad y fija columnas.
                            No crea columnas ni cambia su tipo.
                        </p>
                        <p>
                            <strong>Editar columnas propias</strong> cambia el nombre, el tipo, las opciones de una lista,
                            la clasificación del Panel y el uso en el informe psicolaboral. Solo alcanza a las columnas creadas en el proceso.
                        </p>
                        <p>
                            <strong>Agregar columna</strong> crea un dato nuevo. Los campos Clasificación para el Panel e Informe psicolaboral
                            son opcionales: no dibujan otra columna. Le dicen al Panel y al PDF cómo leer los valores.
                        </p>
                    </div>

                    <div className="rounded-lg border border-gray-200">
                        <button
                            type="button"
                            onClick={() => setHelpOpen(open => !open)}
                            className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
                        >
                            <span className="text-sm font-medium text-gray-900">
                                Por qué hay columnas con nombres parecidos
                            </span>
                            <span className="text-xs text-primary-700">{helpOpen ? 'Ocultar' : 'Ver explicación'}</span>
                        </button>
                        {helpOpen && (
                            <div className="px-4 pb-4 space-y-3 text-sm text-gray-700">
                                <p>
                                    La lista mezcla columnas fijas del sistema con columnas de este proceso.
                                    Un título igual o parecido no significa que sea la misma columna ni que esté duplicada por error.
                                    Cada grupo de abajo dice de qué familia es.
                                </p>
                                {LOOKALIKE_PAIRS.map(pair => (
                                    <div key={pair.title}>
                                        <p className="font-medium text-gray-900">{pair.title}</p>
                                        <p className="mt-0.5">{pair.body}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <input
                            type="search"
                            value={query}
                            onChange={event => setQuery(event.target.value)}
                            placeholder="Buscar por nombre"
                            className="flex-1 min-w-[12rem] px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                        {hiddenColumns.length > 0 && (
                            <button
                                type="button"
                                onClick={onShowAll}
                                className="px-3 py-2 text-sm font-medium text-primary-700 hover:bg-primary-50 rounded-lg"
                            >
                                Mostrar todas
                            </button>
                        )}
                    </div>
                    <p className="text-xs text-gray-500">
                        La casilla muestra u oculta. El pin deja la columna fija a la izquierda cuando se desplaza la tabla en horizontal.
                        Para cambiar el nombre o el tipo de una columna propia, cierre esta ventana y use Editar columnas propias.
                    </p>

                    {groups.map(group => {
                        const columns = normalizedQuery
                            ? group.columns.filter(col =>
                                `${col.label} ${col.hint || ''}`.toLowerCase().includes(normalizedQuery)
                            )
                            : group.columns;
                        if (columns.length === 0) return null;
                        return (
                            <section key={group.id} className="border border-gray-200 rounded-lg overflow-hidden">
                                <div className={`px-4 py-3 ${group.id === 'repeated' ? 'bg-amber-50' : 'bg-gray-50'}`}>
                                    <h3 className="text-sm font-semibold text-gray-900">{group.title}</h3>
                                    <p className="text-xs text-gray-600 mt-1">{group.description}</p>
                                </div>
                                <ul className="divide-y divide-gray-100">
                                    {columns.map(col => {
                                        const pinned = pinnedColumns.includes(col.colId);
                                        const locked = isIdentitySystemColumnId(col.colId);
                                        return (
                                            <li key={col.colId} className="flex items-start gap-2 px-3 py-2.5">
                                                <button
                                                    type="button"
                                                    onClick={() => onTogglePin(col.colId)}
                                                    className={`mt-0.5 p-1 rounded shrink-0 ${pinned ? 'text-primary-600 bg-primary-50' : 'text-gray-300 hover:text-gray-500'}`}
                                                    title={pinned ? 'Dejar de fijar esta columna' : 'Fijar esta columna al desplazar'}
                                                >
                                                    <Pin className="w-3.5 h-3.5" />
                                                </button>
                                                <label className={`flex items-start gap-2 flex-1 min-w-0 ${locked ? 'cursor-default' : 'cursor-pointer'}`}>
                                                    <input
                                                        type="checkbox"
                                                        checked={isShown(col.colId, columnOrder, hiddenColumns)}
                                                        disabled={locked}
                                                        onChange={() => onToggleVisibility(col.colId)}
                                                        className="mt-1 w-3.5 h-3.5 text-primary-600 rounded focus:ring-primary-500 disabled:opacity-60"
                                                    />
                                                    <span className="min-w-0">
                                                        <span className="block text-sm text-gray-900">{col.label}</span>
                                                        {col.hint && (
                                                            <span className={`block text-xs mt-0.5 ${group.id === 'repeated' ? 'text-amber-900' : 'text-gray-500'}`}>
                                                                {col.hint}
                                                            </span>
                                                        )}
                                                        {locked && (
                                                            <span className="block text-xs text-gray-400 mt-0.5">
                                                                Siempre visible. Es un dato fijo del sistema.
                                                            </span>
                                                        )}
                                                    </span>
                                                </label>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </section>
                        );
                    })}
                </div>

                <div className="p-4 border-t shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};
