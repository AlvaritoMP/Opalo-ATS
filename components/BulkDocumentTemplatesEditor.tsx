import React, { useRef } from 'react';
import { Trash2, Upload, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import type { BulkDocumentTemplate, CustomColumn } from '../types';
import {
    buildDocumentFieldSources,
    createDocumentTemplateId,
    readDocxFileAsTemplate,
} from '../lib/bulkDocumentData';

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

    const updateFieldMapping = (tplId: string, key: string, sourceId: string) => {
        const tpl = templates.find(t => t.id === tplId);
        if (!tpl) return;
        const mappings = { ...(tpl.fieldMappings || {}) };
        if (sourceId) mappings[key] = sourceId;
        else delete mappings[key];
        updateTemplate(tplId, { fieldMappings: mappings });
    };

    const groupedSources = fieldSources.reduce<Record<string, typeof fieldSources>>((acc, src) => {
        if (!acc[src.group]) acc[src.group] = [];
        acc[src.group].push(src);
        return acc;
    }, {});

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
                                            <div className="space-y-2">
                                                <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                                                    Mapeo de campos
                                                </p>
                                                {keys.map(key => (
                                                    <div key={key} className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center">
                                                        <label className="text-sm text-gray-700 font-mono truncate" title={key}>
                                                            {'{{'}{key}{'}}'}
                                                        </label>
                                                        <select
                                                            value={tpl.fieldMappings?.[key] || ''}
                                                            onChange={e => updateFieldMapping(tpl.id, key, e.target.value)}
                                                            className="text-sm border border-gray-300 rounded-md px-2 py-1.5"
                                                        >
                                                            <option value="">— Sin asignar —</option>
                                                            {Object.entries(groupedSources).map(([group, sources]) => (
                                                                <optgroup key={group} label={group}>
                                                                    {sources.map(src => (
                                                                        <option key={src.id} value={src.id}>
                                                                            {src.label}
                                                                        </option>
                                                                    ))}
                                                                </optgroup>
                                                            ))}
                                                        </select>
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
