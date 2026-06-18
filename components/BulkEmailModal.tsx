import React, { useState, useEffect, useMemo } from 'react';
import { X, Mail, Send, FileText, Copy } from 'lucide-react';
import { BulkCandidate } from '../lib/api/bulkCandidates';
import type { BulkContactMessageTemplate } from '../types';
import {
    applyContactMessageTemplate,
    copyContactMessageToClipboard,
    filterContactTemplatesByChannel,
} from '../lib/contactMessageTemplates';
import { openMailCompose, getMailComposeToastMessage } from '../lib/openMailto';

interface BulkEmailModalProps {
    isOpen: boolean;
    onClose: () => void;
    candidates: BulkCandidate[];
    templates: BulkContactMessageTemplate[];
    processTitle?: string;
    onSend: (subject: string, body: string, templateId?: string) => Promise<void>;
    onNotify?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const BulkEmailModal: React.FC<BulkEmailModalProps> = ({
    isOpen,
    onClose,
    candidates,
    templates,
    processTitle,
    onSend,
    onNotify,
}) => {
    const emailTemplates = useMemo(
        () => filterContactTemplatesByChannel(templates, 'email'),
        [templates]
    );

    const [selectedTemplate, setSelectedTemplate] = useState<string>('');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [isSending, setIsSending] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        const first = emailTemplates[0];
        setSelectedTemplate(first?.id ?? '');
        setSubject(first?.subject ?? '');
        setBody(first?.body ?? '');
    }, [isOpen, emailTemplates]);

    useEffect(() => {
        if (!selectedTemplate) return;
        const template = emailTemplates.find(t => t.id === selectedTemplate);
        if (template) {
            setSubject(template.subject ?? '');
            setBody(template.body);
        }
    }, [selectedTemplate, emailTemplates]);

    if (!isOpen) return null;

    const candidatesWithEmail = candidates.filter(c => c.email);
    const previewCandidate = candidatesWithEmail[0];
    const previewVars = {
        nombre: previewCandidate?.name,
        email: previewCandidate?.email,
        telefono: previewCandidate?.phone,
        puesto: processTitle,
    };

    const handleSend = async () => {
        if (!subject.trim() || !body.trim()) {
            onNotify?.('Completa el asunto y el cuerpo del correo', 'error');
            return;
        }

        setIsSending(true);
        try {
            await onSend(subject, body, selectedTemplate || undefined);
            setSubject('');
            setBody('');
            setSelectedTemplate('');
            onClose();
        } catch (error) {
            console.error('Error enviando correos:', error);
            onNotify?.('Error al enviar correos. Inténtalo de nuevo.', 'error');
        } finally {
            setIsSending(false);
        }
    };

    const handleCopyPreview = async () => {
        if (!previewCandidate) return;
        const previewSubject = applyContactMessageTemplate(subject, previewVars);
        const previewBody = applyContactMessageTemplate(body, previewVars);
        const ok = await copyContactMessageToClipboard('email', previewSubject, previewBody);
        onNotify?.(
            ok ? 'Mensaje copiado al portapapeles' : 'No se pudo copiar al portapapeles',
            ok ? 'success' : 'error'
        );
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b">
                    <div className="flex items-center gap-3">
                        <Mail className="w-6 h-6 text-blue-600" />
                        <h2 className="text-xl font-semibold text-gray-900">Enviar correo masivo</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-sm text-blue-800">
                            <Mail className="w-4 h-4" />
                            <span className="font-medium">
                                {candidatesWithEmail.length} candidato
                                {candidatesWithEmail.length !== 1 ? 's' : ''} con correo
                            </span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Plantilla predefinida
                        </label>
                        <select
                            value={selectedTemplate}
                            onChange={e => setSelectedTemplate(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            {emailTemplates.length === 0 ? (
                                <option value="">Sin plantillas — escribe el mensaje manualmente</option>
                            ) : (
                                emailTemplates.map(template => (
                                    <option key={template.id} value={template.id}>
                                        {template.name}
                                    </option>
                                ))
                            )}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Asunto</label>
                        <input
                            type="text"
                            value={subject}
                            onChange={e => setSubject(e.target.value)}
                            placeholder="Asunto del correo..."
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Cuerpo del correo
                        </label>
                        <textarea
                            value={body}
                            onChange={e => setBody(e.target.value)}
                            placeholder="Escribe el cuerpo del correo..."
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                            rows={10}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Variables: {'{{nombre}}'}, {'{{email}}'}, {'{{telefono}}'}, {'{{puesto}}'}
                        </p>
                    </div>

                    {previewCandidate && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between gap-2 mb-2">
                                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                    <FileText className="w-4 h-4" />
                                    Vista previa (primer candidato)
                                </div>
                                <button
                                    type="button"
                                    onClick={() => void handleCopyPreview()}
                                    className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900"
                                >
                                    <Copy className="w-3.5 h-3.5" />
                                    Copiar
                                </button>
                            </div>
                            <div className="text-sm text-gray-600 space-y-2">
                                <div>
                                    <strong>Asunto:</strong>{' '}
                                    {applyContactMessageTemplate(subject, previewVars)}
                                </div>
                                <div className="whitespace-pre-wrap border-t pt-2">
                                    {applyContactMessageTemplate(body, previewVars)}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3 pt-4">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                            disabled={isSending}
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={() => void handleSend()}
                            disabled={isSending || !subject.trim() || !body.trim()}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isSending ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Abriendo...
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4" />
                                    Abrir correo ({candidatesWithEmail.length})
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
