import React, { useRef } from 'react';
import { Trash2, Upload, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import type { BulkDocumentTemplate, CustomColumn } from '../types';
import {
    buildDocumentFieldSources,
    createDocumentTemplateId,
    readDocxFileAsTemplate,
} from '../lib/bulkDocumentData';
import {
    DECOMPOSED_FIELD_HELP,
    getDecomposedBaseKey,
    isDecomposedTemplateKey,
} from '../lib/bulkDocumentDecomposition';

interface BulkDocumentTemplatesEditorProps {
    templates: BulkDocumentTemplate[];
    customColumns: CustomColumn[];
    onChange: (templates: BulkDocumentTemplate[]) => void;
}

export const BulkDocumentTemplatesEditor: React.FC<BulkDocumentTemplatesEditorProps> = ({
    templates,
    customColumns,
    onChange,
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [expandedId, setExpandedId] = React.useState<string | null>(null);
    const fieldSources = buildDocumentFieldSources(customColumns);

    const updateTemplate = (id: string, patch: Partial<BulkDocumentTemplate>) => {
        onChange(templates.map(t => (t.id === id ? { ...t, ...patch } : t)));
    };

    const removeTemplate = (id: string) => {
        onChange(templates.filter(t => t.id !== id));
        if (expandedId === id) setExpandedId(null);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!/\.docx$/i.test(file.name)) {
            alert('Solo se admiten archivos .docx');
            e.target.value = '';
            return;
        }
        try {
            const parsed = await readDocxFileAsTemplate(file, customColumns);
            const baseName = file.name.replace(/\.docx$/i, '');
            const newTpl: BulkDocumentTemplate = {
                id: createDocumentTemplateId(),
                name: baseName,
                ...parsed,
            };
            onChange([...templates, newTpl]);
            setExpandedId(newTpl.id);
        } catch (err) {
            console.error(err);
            alert('No se pudo leer el archivo Word.');
        }
        e.target.value = '';
    };

    const groupedSources = fieldSources.reduce<Record<string, typeof fieldSources>>((acc, src) => {
        if (!acc[src.group]) acc[src.group] = [];
        acc[src.group].push(src);
        return acc;
    }, {});

    /** Agrupa campos descompuestos bajo su campo base para un solo mapeo */
    const groupKeysForMapping = (keys: string[]) => {
        const groups: { baseKey: string; keys: string[]; decomposed: boolean }[] = [];
        const byBase = new Map<string, string[]>();

        for (const key of keys) {
            const base = getDecomposedBaseKey(key);
            const list = byBase.get(base) || [];
            list.push(key);
            byBase.set(base, list);
        }

        for (const [baseKey, groupKeys] of byBase) {
            const decomposed = groupKeys.some(k => isDecomposedTemplateKey(k));
            groups.push({
                baseKey,
                keys: groupKeys.sort((a, b) => a.localeCompare(b, 'es')),
                decomposed,
            });
        }

        return groups.sort((a, b) => a.baseKey.localeCompare(b.baseKey, 'es'));
    };

    return (
        <div className="space-y-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <p className="font-medium mb-1">Cómo preparar plantillas Word</p>
                <p className="text-amber-800">
                    En cada documento use marcadores con doble llave, por ejemplo{' '}
                    <code className="bg-amber-100 px-1 rounded">{'{{Nombre}}'}</code> o{' '}
                    <code className="bg-amber-100 px-1 rounded">{'{{Ap Paterno}}'}</code>.
                    Si un campo no tiene dato en el ATS, el valor y su etiqueta (p. ej.{' '}
                    <em>Ap Paterno:</em>) se omiten del Word para no dejar espacio en blanco.
                </p>
            </div>

            <details className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
                <summary className="font-medium cursor-pointer select-none">
                    Campos descompuestos (letra por letra y fechas)
                </summary>
                <ul className="mt-2 space-y-1.5 text-sky-800">
                    {DECOMPOSED_FIELD_HELP.map(item => (
                        <li key={item.syntax}>
                            <code className="bg-sky-100 px-1 rounded text-xs">{item.syntax}</code>
                            {' — '}{item.desc}
                        </li>
                    ))}
                </ul>
                <p className="mt-2 text-xs text-sky-700">
                    Solo asigne el campo base una vez (p. ej. <em>Ap Paterno</em> o <em>F Nac</em>);
                    las variantes <code className="bg-sky-100 px-1 rounded">#1</code>, <code className="bg-sky-100 px-1 rounded">.dia</code>, etc. heredan ese mapeo.
                </p>
            </details>

            <div className="flex flex-wrap gap-2">
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="hidden"
                    onChange={e => void handleFileUpload(e)}
                />
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100"
                >
                    <Upload className="w-4 h-4" />
                    Subir plantilla Word
                </button>
            </div>

            {templates.length === 0 ? (
                <p className="text-sm text-gray-500 py-6 text-center border border-dashed border-gray-200 rounded-lg">
                    No hay documentos configurados. Suba uno o más archivos .docx para habilitar la columna de documentos en la tabla.
                </p>
            ) : (
                <div className="space-y-3">
                    {templates.map(tpl => {
                        const isExpanded = expandedId === tpl.id;
                        const keys = tpl.detectedKeys || [];
                        return (
                            <div key={tpl.id} className="border border-gray-200 rounded-lg overflow-hidden">
                                <div className="flex items-center gap-2 px-4 py-3 bg-gray-50">
                                    <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <input
                                        type="text"
                                        value={tpl.name}
                                        onChange={e => updateTemplate(tpl.id, { name: e.target.value })}
                                        className="flex-1 min-w-0 text-sm font-medium border border-gray-200 rounded px-2 py-1 bg-white"
                                        placeholder="Nombre del documento"
                                    />
                                    <span className="text-xs text-gray-500 shrink-0">
                                        {keys.length} campo{keys.length !== 1 ? 's' : ''}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setExpandedId(isExpanded ? null : tpl.id)}
                                        className="p-1.5 text-gray-500 hover:bg-gray-200 rounded"
                                        title="Configurar campos"
                                    >
                                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => removeTemplate(tpl.id)}
                                        className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                                        title="Eliminar plantilla"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>

                                {isExpanded && (
                                    <div className="px-4 py-3 border-t border-gray-100 space-y-3">
                                        {keys.length === 0 ? (
                                            <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-100 rounded p-2">
                                                No se detectaron campos {'{{...}}'} en este documento.
                                            </p>
                                        ) : (
                                            <div className="space-y-3">
                                                <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                                                    Mapeo de campos
                                                </p>
                                                {groupKeysForMapping(keys).map(group => (
                                                    <div key={group.baseKey} className="border border-gray-100 rounded-md p-3 space-y-2">
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center">
                                                            <div>
                                                                <label className="text-sm text-gray-800 font-medium block">
                                                                    {group.baseKey}
                                                                </label>
                                                                {group.decomposed ? (
                                                                    <p className="text-xs text-gray-500 mt-0.5">
                                                                        {group.keys.length} marcador(es): letra/fecha descompuesta
                                                                    </p>
                                                                ) : (
                                                                    <p className="text-xs font-mono text-gray-500 mt-0.5">
                                                                        {'{{'}{group.baseKey}{'}}'}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <select
                                                                value={
                                                                    tpl.fieldMappings?.[group.baseKey]
                                                                    || tpl.fieldMappings?.[group.keys[0]]
                                                                    || ''
                                                                }
                                                                onChange={e => {
                                                                    const val = e.target.value;
                                                                    const mappings = { ...(tpl.fieldMappings || {}) };
                                                                    if (val) {
                                                                        mappings[group.baseKey] = val;
                                                                        group.keys.forEach(k => { mappings[k] = val; });
                                                                    } else {
                                                                        delete mappings[group.baseKey];
                                                                        group.keys.forEach(k => { delete mappings[k]; });
                                                                    }
                                                                    updateTemplate(tpl.id, { fieldMappings: mappings });
                                                                }}
                                                                className="text-sm border border-gray-300 rounded-md px-2 py-1.5"
                                                            >
                                                                <option value="">— Sin asignar —</option>
                                                                {Object.entries(groupedSources).map(([g, sources]) => (
                                                                    <optgroup key={g} label={g}>
                                                                        {sources.map(src => (
                                                                            <option key={src.id} value={src.id}>
                                                                                {src.label}
                                                                            </option>
                                                                        ))}
                                                                    </optgroup>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        {group.decomposed && group.keys.length <= 12 && (
                                                            <p className="text-[10px] font-mono text-gray-400 truncate" title={group.keys.join(', ')}>
                                                                {group.keys.map(k => `{{${k}}}`).join(' ')}
                                                            </p>
                                                        )}
                                                        {group.decomposed && group.keys.length > 12 && (
                                                            <p className="text-[10px] text-gray-400">
                                                                {group.keys.slice(0, 6).map(k => `{{${k}}}`).join(' ')}
                                                                {' … '}
                                                                {group.keys.slice(-2).map(k => `{{${k}}}`).join(' ')}
                                                                {' '}({group.keys.length} casillas)
                                                            </p>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
