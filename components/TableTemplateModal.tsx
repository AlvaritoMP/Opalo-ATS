import React, { useState, useEffect } from 'react';
import { X, Save, Download, Upload, Trash2 } from 'lucide-react';
import type { CustomColumn } from '../types';
import { DEFAULT_COLUMN_ORDER } from '../lib/bulkTableColumns';

export interface BulkTableTemplateLayout {
    columns: CustomColumn[];
    columnOrder: string[];
    hiddenColumns: string[];
    pinnedColumns: string[];
    columnWidths: Record<string, number>;
}

export interface BulkTableTemplate extends BulkTableTemplateLayout {
    id: string;
    name: string;
    createdAt: string;
}

interface TableTemplateModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentLayout: BulkTableTemplateLayout;
    onLoadTemplate: (template: BulkTableTemplateLayout) => void | Promise<void>;
}

function hasSaveableLayout(layout: BulkTableTemplateLayout): boolean {
    if (layout.columns.length > 0) return true;
    if (layout.hiddenColumns.length > 0) return true;
    if (Object.keys(layout.columnWidths).length > 0) return true;
    if (layout.pinnedColumns.length !== 1 || layout.pinnedColumns[0] !== 'name') return true;
    return JSON.stringify(layout.columnOrder) !== JSON.stringify(DEFAULT_COLUMN_ORDER);
}

export const TableTemplateModal: React.FC<TableTemplateModalProps> = ({
    isOpen,
    onClose,
    currentLayout,
    onLoadTemplate,
}) => {
    const [templates, setTemplates] = useState<BulkTableTemplate[]>([]);
    const [templateName, setTemplateName] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            loadTemplates();
        }
    }, [isOpen]);

    const loadTemplates = () => {
        const saved = localStorage.getItem('bulkProcessesTableTemplates');
        if (saved) {
            setTemplates(JSON.parse(saved));
        } else {
            setTemplates([]);
        }
    };

    const handleSaveTemplate = () => {
        if (!templateName.trim()) {
            alert('Por favor, ingrese un nombre para la plantilla');
            return;
        }

        if (!hasSaveableLayout(currentLayout)) {
            alert('No hay configuración de columnas para guardar');
            return;
        }

        const template: BulkTableTemplate = {
            id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: templateName.trim(),
            columns: currentLayout.columns,
            columnOrder: currentLayout.columnOrder,
            hiddenColumns: currentLayout.hiddenColumns,
            pinnedColumns: currentLayout.pinnedColumns,
            columnWidths: currentLayout.columnWidths,
            createdAt: new Date().toISOString(),
        };

        const updatedTemplates = [...templates, template];
        setTemplates(updatedTemplates);
        localStorage.setItem('bulkProcessesTableTemplates', JSON.stringify(updatedTemplates));
        setTemplateName('');
        alert('Plantilla guardada exitosamente');
    };

    const handleLoadTemplate = async (templateId: string) => {
        const template = templates.find(t => t.id === templateId);
        if (!template) return;

        const layout: BulkTableTemplateLayout = {
            columns: template.columns || [],
            columnOrder: template.columnOrder?.length
                ? template.columnOrder
                : [
                    ...DEFAULT_COLUMN_ORDER,
                    ...(template.columns || []).map(c => `custom_${c.id}`),
                ],
            hiddenColumns: template.hiddenColumns || [],
            pinnedColumns: template.pinnedColumns?.length ? template.pinnedColumns : ['name'],
            columnWidths: template.columnWidths || {},
        };

        await onLoadTemplate(layout);
        setSelectedTemplate(templateId);
    };

    const handleDeleteTemplate = (templateId: string) => {
        if (confirm('¿Estás seguro de eliminar esta plantilla?')) {
            const updatedTemplates = templates.filter(t => t.id !== templateId);
            setTemplates(updatedTemplates);
            localStorage.setItem('bulkProcessesTableTemplates', JSON.stringify(updatedTemplates));
            if (selectedTemplate === templateId) {
                setSelectedTemplate(null);
            }
        }
    };

    const handleExportTemplate = (templateId: string) => {
        const template = templates.find(t => t.id === templateId);
        if (template) {
            const dataStr = JSON.stringify(template, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `plantilla_${template.name.replace(/\s+/g, '_')}.json`;
            link.click();
            URL.revokeObjectURL(url);
        }
    };

    const handleImportTemplate = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const template = JSON.parse(event.target?.result as string) as BulkTableTemplate;
                const newTemplate: BulkTableTemplate = {
                    ...template,
                    id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    createdAt: new Date().toISOString(),
                };
                const updatedTemplates = [...templates, newTemplate];
                setTemplates(updatedTemplates);
                localStorage.setItem('bulkProcessesTableTemplates', JSON.stringify(updatedTemplates));
                alert('Plantilla importada exitosamente');
            } catch (error) {
                alert('Error al importar la plantilla. Verifique que el archivo sea válido.');
            }
        };
        reader.readAsText(file);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
                <div className="flex items-center justify-between p-6 border-b">
                    <h2 className="text-xl font-semibold text-gray-900">Plantillas de Tabla</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {/* Guardar Plantilla Actual */}
                    <div className="border border-gray-200 rounded-lg p-4">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">Guardar Plantilla Actual</h3>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={templateName}
                                onChange={(e) => setTemplateName(e.target.value)}
                                placeholder="Nombre de la plantilla..."
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />
                            <button
                                onClick={handleSaveTemplate}
                                disabled={!templateName.trim() || !hasSaveableLayout(currentLayout)}
                                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Save className="w-4 h-4" />
                                Guardar
                            </button>
                        </div>
                        {hasSaveableLayout(currentLayout) && (
                            <p className="text-xs text-gray-500 mt-2">
                                Se guardará el orden, visibilidad y {currentLayout.columns.length} columna
                                {currentLayout.columns.length !== 1 ? 's' : ''} personalizada
                                {currentLayout.columns.length !== 1 ? 's' : ''}
                                {currentLayout.hiddenColumns.length > 0
                                    ? ` (${currentLayout.hiddenColumns.length} oculta${currentLayout.hiddenColumns.length !== 1 ? 's' : ''})`
                                    : ''}
                            </p>
                        )}
                    </div>

                    {/* Importar Plantilla */}
                    <div className="border border-gray-200 rounded-lg p-4">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">Importar Plantilla</h3>
                        <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer">
                            <Upload className="w-4 h-4" />
                            Seleccionar archivo JSON
                            <input
                                type="file"
                                accept=".json"
                                onChange={handleImportTemplate}
                                className="hidden"
                            />
                        </label>
                    </div>

                    {/* Lista de Plantillas */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">Plantillas Guardadas</h3>
                        {templates.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-8">
                                No hay plantillas guardadas
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {templates.map(template => (
                                    <div
                                        key={template.id}
                                        className={`border rounded-lg p-4 ${
                                            selectedTemplate === template.id
                                                ? 'border-primary-500 bg-primary-50'
                                                : 'border-gray-200'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <h4 className="font-medium text-gray-900">{template.name}</h4>
                                                <p className="text-xs text-gray-500">
                                                    {(template.columns || []).length} personalizada{(template.columns || []).length !== 1 ? 's' : ''}
                                                    {template.columnOrder?.length ? ' • orden personalizado' : ''}
                                                    {template.hiddenColumns?.length
                                                        ? ` • ${template.hiddenColumns.length} oculta${template.hiddenColumns.length !== 1 ? 's' : ''}`
                                                        : ''}
                                                    {' • '}
                                                    {new Date(template.createdAt).toLocaleDateString('es-PE')}
                                                </p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleLoadTemplate(template.id)}
                                                    className="px-3 py-1 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors"
                                                >
                                                    Cargar
                                                </button>
                                                <button
                                                    onClick={() => handleExportTemplate(template.id)}
                                                    className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                    title="Exportar"
                                                >
                                                    <Download className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteTemplate(template.id)}
                                                    className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="border-t p-6">
                    <button
                        onClick={onClose}
                        className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};
