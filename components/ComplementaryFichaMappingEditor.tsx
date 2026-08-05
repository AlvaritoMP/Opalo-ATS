import React, { useMemo } from 'react';
import type { CustomColumn } from '../types';
import type { ComplementaryFichaMapping } from '../lib/complementaryFichaMapping';
import {
    COMPLEMENTARY_FICHA_MAPPABLE_FIELDS,
    complementaryFichaSourceOptions,
    suggestComplementaryFichaMapping,
} from '../lib/complementaryFichaMapping';
import { Sparkles } from 'lucide-react';

interface ComplementaryFichaMappingEditorProps {
    customColumns: CustomColumn[];
    mapping: ComplementaryFichaMapping;
    onChange: (mapping: ComplementaryFichaMapping) => void;
}

export const ComplementaryFichaMappingEditor: React.FC<ComplementaryFichaMappingEditorProps> = ({
    customColumns,
    mapping,
    onChange,
}) => {
    const options = useMemo(() => complementaryFichaSourceOptions(customColumns), [customColumns]);
    const suggested = useMemo(() => suggestComplementaryFichaMapping(customColumns), [customColumns]);

    const groups = useMemo(() => {
        const map = new Map<string, typeof COMPLEMENTARY_FICHA_MAPPABLE_FIELDS>();
        for (const field of COMPLEMENTARY_FICHA_MAPPABLE_FIELDS) {
            const list = map.get(field.group) || [];
            list.push(field);
            map.set(field.group, list);
        }
        return [...map.entries()];
    }, []);

    const applySuggestions = () => {
        // Solo completa campos aún sin mapear
        onChange({ ...suggested, ...mapping });
    };

    const applyAllSuggestions = () => {
        onChange({ ...suggested });
    };

    const mappedCount = COMPLEMENTARY_FICHA_MAPPABLE_FIELDS.filter((f) => mapping[f.key]).length;
    const suggestedCount = Object.keys(suggested).length;

    return (
        <div className="border border-gray-200 rounded-lg p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                    <h3 className="text-sm font-semibold text-gray-800">Mapeo de ficha complementaria</h3>
                    <p className="text-xs text-gray-500 mt-1 max-w-xl">
                        Asocia columnas personalizadas de este proceso con los campos del formulario público
                        (por DNI). Así se precarga lo que el candidato ya entregó en la tabla, sin volver a
                        pedirlo.
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                        Mapeados: {mappedCount}/{COMPLEMENTARY_FICHA_MAPPABLE_FIELDS.length}
                        {suggestedCount > 0 ? ` · Sugeridos automáticamente: ${suggestedCount}` : ''}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={applySuggestions}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100"
                        title="Completa solo los campos aún sin mapear"
                    >
                        <Sparkles className="w-3.5 h-3.5" />
                        Completar vacíos
                    </button>
                    <button
                        type="button"
                        onClick={applyAllSuggestions}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                        title="Reemplaza el mapeo con las sugerencias del sistema"
                    >
                        Usar todas las sugerencias
                    </button>
                </div>
            </div>

            {customColumns.length === 0 ? (
                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                    Este proceso aún no tiene columnas personalizadas. Agrégalas en la tabla del proceso para
                    poder asociarlas aquí.
                </p>
            ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
                    {groups.map(([group, fields]) => (
                        <div key={group}>
                            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                                {group}
                            </div>
                            <div className="space-y-2">
                                {fields.map((field) => {
                                    const current = mapping[field.key] || '';
                                    const suggestion = suggested[field.key] || '';
                                    const isSuggested = Boolean(suggestion) && current === suggestion;
                                    return (
                                        <div
                                            key={field.key}
                                            className="grid grid-cols-1 md:grid-cols-[minmax(0,11rem)_1fr] gap-2 items-center"
                                        >
                                            <label className="text-sm text-gray-700">
                                                {field.label}
                                                {isSuggested ? (
                                                    <span className="ml-1 text-[10px] text-blue-600 font-medium">
                                                        sugerido
                                                    </span>
                                                ) : null}
                                            </label>
                                            <select
                                                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                                value={current}
                                                onChange={(e) => {
                                                    const next = { ...mapping };
                                                    if (!e.target.value) delete next[field.key];
                                                    else next[field.key] = e.target.value;
                                                    onChange(next);
                                                }}
                                            >
                                                {options.map((opt) => (
                                                    <option key={`${field.key}-${opt.id || 'empty'}`} value={opt.id}>
                                                        {opt.label}
                                                        {opt.id && opt.id === suggestion && opt.id !== current
                                                            ? ' (sugerido)'
                                                            : ''}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
