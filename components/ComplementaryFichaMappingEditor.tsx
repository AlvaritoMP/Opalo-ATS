import React, { useMemo } from 'react';
import type { CustomColumn } from '../types';
import type { ComplementaryFichaMapping, ComplementaryFichaMappableKey } from '../lib/complementaryFichaMapping';
import {
    COMPLEMENTARY_FICHA_DEFAULT_REQUIRED,
    COMPLEMENTARY_FICHA_MAPPABLE_FIELDS,
    complementaryFichaSourceOptions,
    isComplementaryFieldLockedRequired,
    suggestComplementaryFichaMapping,
} from '../lib/complementaryFichaMapping';
import { Sparkles } from 'lucide-react';

interface ComplementaryFichaMappingEditorProps {
    customColumns: CustomColumn[];
    mapping: ComplementaryFichaMapping;
    onChange: (mapping: ComplementaryFichaMapping) => void;
    requiredFields: string[];
    onChangeRequired: (requiredFields: string[]) => void;
}

export const ComplementaryFichaMappingEditor: React.FC<ComplementaryFichaMappingEditorProps> = ({
    customColumns,
    mapping,
    onChange,
    requiredFields,
    onChangeRequired,
}) => {
    const options = useMemo(() => complementaryFichaSourceOptions(customColumns), [customColumns]);
    const suggested = useMemo(() => suggestComplementaryFichaMapping(customColumns), [customColumns]);
    const requiredSet = useMemo(() => new Set(requiredFields), [requiredFields]);

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
        onChange({ ...suggested, ...mapping });
    };

    const applyAllSuggestions = () => {
        onChange({ ...suggested });
    };

    const applyDefaultRequired = () => {
        onChangeRequired([...COMPLEMENTARY_FICHA_DEFAULT_REQUIRED]);
    };

    const toggleRequired = (key: ComplementaryFichaMappableKey, checked: boolean) => {
        if (isComplementaryFieldLockedRequired(key)) return;
        const next = new Set(requiredFields);
        if (checked) next.add(key);
        else next.delete(key);
        for (const field of COMPLEMENTARY_FICHA_MAPPABLE_FIELDS) {
            if (isComplementaryFieldLockedRequired(field.key)) next.add(field.key);
        }
        onChangeRequired([...next]);
    };

    const mappedCount = COMPLEMENTARY_FICHA_MAPPABLE_FIELDS.filter((f) => mapping[f.key]).length;
    const suggestedCount = Object.keys(suggested).length;
    const requiredCount = requiredFields.length;

    return (
        <div className="border border-gray-200 rounded-lg p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                    <h3 className="text-sm font-semibold text-gray-800">Mapeo de ficha complementaria</h3>
                    <p className="text-xs text-gray-500 mt-1 max-w-xl">
                        Asocia columnas del proceso con el formulario público y marca cuáles son obligatorios
                        para el candidato. Los campos con * fijo del sistema no se pueden desactivar.
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                        Mapeados: {mappedCount}/{COMPLEMENTARY_FICHA_MAPPABLE_FIELDS.length}
                        {suggestedCount > 0 ? ` · Sugeridos: ${suggestedCount}` : ''}
                        {' · '}Obligatorios: {requiredCount}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={applySuggestions}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100"
                    >
                        <Sparkles className="w-3.5 h-3.5" />
                        Completar vacíos
                    </button>
                    <button
                        type="button"
                        onClick={applyAllSuggestions}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                    >
                        Usar sugerencias de mapeo
                    </button>
                    <button
                        type="button"
                        onClick={applyDefaultRequired}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-amber-200 text-amber-800 bg-amber-50 hover:bg-amber-100"
                    >
                        Obligatorios recomendados
                    </button>
                </div>
            </div>

            <div className="space-y-4 max-h-[28rem] overflow-y-auto pr-1">
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
                                const locked = isComplementaryFieldLockedRequired(field.key);
                                const isRequired = locked || requiredSet.has(field.key);
                                return (
                                    <div
                                        key={field.key}
                                        className="grid grid-cols-1 md:grid-cols-[minmax(0,10rem)_1fr_auto] gap-2 items-center"
                                    >
                                        <label className="text-sm text-gray-700">
                                            {field.label}
                                            {locked ? <span className="text-red-500"> *</span> : null}
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
                                            disabled={customColumns.length === 0 && !current.startsWith('candidate.')}
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
                                        <label
                                            className={`inline-flex items-center gap-1.5 text-xs whitespace-nowrap ${
                                                locked ? 'text-gray-400' : 'text-gray-700'
                                            }`}
                                            title={
                                                locked
                                                    ? 'Obligatorio del sistema'
                                                    : 'Marcar como obligatorio en el formulario'
                                            }
                                        >
                                            <input
                                                type="checkbox"
                                                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                                checked={isRequired}
                                                disabled={locked}
                                                onChange={(e) => toggleRequired(field.key, e.target.checked)}
                                            />
                                            Obligatorio
                                        </label>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
