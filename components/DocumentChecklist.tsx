import React from 'react';
import { Candidate, Process, DocumentCategory, Attachment } from '../types';
import { CheckCircle, XCircle, AlertCircle, FileText } from 'lucide-react';

interface DocumentChecklistProps {
    candidate: Candidate;
    process: Process;
}

export const DocumentChecklist: React.FC<DocumentChecklistProps> = ({ candidate, process }) => {
    const categories = process.documentCategories || [];
    const candidateAttachments = candidate.attachments || [];
    
    // Agrupar attachments por categoría
    const attachmentsByCategory = candidateAttachments.reduce((acc, att) => {
        const category = att.category || 'Sin categoría';
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(att);
        return acc;
    }, {} as Record<string, Attachment[]>);
    
    // Verificar qué categorías están completas
    const getCategoryStatus = (category: DocumentCategory) => {
        const categoryAttachments = attachmentsByCategory[category.id] || [];
        const hasDocuments = categoryAttachments.length > 0;
        
        if (category.required) {
            return hasDocuments ? 'complete' : 'missing';
        }
        return hasDocuments ? 'optional-complete' : 'optional-empty';
    };
    
    // Verificar requisitos de la etapa actual
    const currentStage = process.stages.find(s => s.id === candidate.stageId);
    const requiredForStage = currentStage?.requiredDocuments || [];
    const canAdvance = requiredForStage.every(catId => {
        const categoryAttachments = attachmentsByCategory[catId] || [];
        return categoryAttachments.length > 0;
    });
    
    if (categories.length === 0) {
        return (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-sm text-gray-600">
                    No hay categorías de documentos definidas para este proceso. 
                    Configúralas en la edición del proceso.
                </p>
            </div>
        );
    }
    
    return (
        <div className="space-y-4">
            {/* Estado general */}
            <div className={`rounded-lg p-4 border-2 ${canAdvance ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                    {canAdvance ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                        <AlertCircle className="w-5 h-5 text-yellow-600" />
                    )}
                    <h3 className="font-semibold text-gray-800">
                        {canAdvance 
                            ? 'Documentos completos - Puede avanzar de etapa' 
                            : 'Faltan documentos requeridos para avanzar'}
                    </h3>
                </div>
                {!canAdvance && requiredForStage.length > 0 && (
                    <p className="text-sm text-gray-700">
                        Para avanzar a la siguiente etapa, se requieren los siguientes documentos: 
                        {requiredForStage.map(catId => {
                            const cat = categories.find(c => c.id === catId);
                            return cat ? ` ${cat.name}` : '';
                        }).join(', ')}
                    </p>
                )}
            </div>
            
            {/* Lista de categorías */}
            <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-800 mb-2">Checklist de documentos</h4>
                {categories.map(category => {
                    const status = getCategoryStatus(category);
                    const categoryAttachments = attachmentsByCategory[category.id] || [];
                    const isRequired = category.required || requiredForStage.includes(category.id);
                    
                    return (
                        <div 
                            key={category.id} 
                            className={`border rounded-lg p-3 ${
                                status === 'complete' 
                                    ? 'bg-green-50 border-green-200' 
                                    : status === 'missing'
                                    ? 'bg-red-50 border-red-200'
                                    : 'bg-gray-50 border-gray-200'
                            }`}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        {status === 'complete' || status === 'optional-complete' ? (
                                            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                                        ) : (
                                            <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                                        )}
                                        <span className="font-medium text-gray-800">
                                            {category.name}
                                        </span>
                                        {isRequired && (
                                            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
                                                Requerido
                                            </span>
                                        )}
                                        {!isRequired && (
                                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                                                Opcional
                                            </span>
                                        )}
                                    </div>
                                    {category.description && (
                                        <p className="text-xs text-gray-600 mb-2">{category.description}</p>
                                    )}
                                    {categoryAttachments.length > 0 ? (
                                        <div className="mt-2 space-y-1">
                                            {categoryAttachments.map(att => (
                                                <div key={att.id} className="flex items-center gap-2 text-xs text-gray-700 bg-white rounded px-2 py-1">
                                                    <FileText className="w-3 h-3" />
                                                    <span>{att.name}</span>
                                                    {att.uploadedAt && (
                                                        <span className="text-gray-500">
                                                            ({new Date(att.uploadedAt).toLocaleDateString()})
                                                        </span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-gray-500 italic mt-1">
                                            No hay documentos en esta categoría
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            
            {/* Resumen */}
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <div className="grid grid-cols-3 gap-4 text-center text-sm">
                    <div>
                        <div className="font-semibold text-gray-800">
                            {categories.filter(c => getCategoryStatus(c) === 'complete' || getCategoryStatus(c) === 'optional-complete').length}
                        </div>
                        <div className="text-gray-600">Completadas</div>
                    </div>
                    <div>
                        <div className="font-semibold text-red-600">
                            {categories.filter(c => getCategoryStatus(c) === 'missing').length}
                        </div>
                        <div className="text-gray-600">Faltantes</div>
                    </div>
                    <div>
                        <div className="font-semibold text-gray-800">
                            {categories.length}
                        </div>
                        <div className="text-gray-600">Total</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

