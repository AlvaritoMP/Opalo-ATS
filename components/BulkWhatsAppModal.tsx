import React, { useEffect, useMemo, useState } from 'react';
import { X, MessageCircle, Users, Send, Copy } from 'lucide-react';
import { BulkCandidate } from '../lib/api/bulkCandidates';
import type { BulkContactMessageTemplate } from '../types';
import {
    applyContactMessageTemplate,
    copyContactMessageToClipboard,
    filterContactTemplatesByChannel,
} from '../lib/contactMessageTemplates';

interface BulkWhatsAppModalProps {
    isOpen: boolean;
    onClose: () => void;
    candidates: BulkCandidate[];
    templates: BulkContactMessageTemplate[];
    processTitle?: string;
    onSend: (message: string, createGroup: boolean) => Promise<void>;
    onNotify?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const BulkWhatsAppModal: React.FC<BulkWhatsAppModalProps> = ({
    isOpen,
    onClose,
    candidates,
    templates,
    processTitle,
    onSend,
    onNotify,
}) => {
    const whatsappTemplates = useMemo(
        () => filterContactTemplatesByChannel(templates, 'whatsapp'),
        [templates]
    );

    const [selectedTemplate, setSelectedTemplate] = useState('');
    const [message, setMessage] = useState('');
    const [createGroup, setCreateGroup] = useState(false);
    const [isSending, setIsSending] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        const first = whatsappTemplates[0];
        setSelectedTemplate(first?.id ?? '');
        setMessage(first?.body ?? '');
    }, [isOpen, whatsappTemplates]);

    useEffect(() => {
        if (!selectedTemplate) return;
        const template = whatsappTemplates.find(t => t.id === selectedTemplate);
        if (template) setMessage(template.body);
    }, [selectedTemplate, whatsappTemplates]);

    if (!isOpen) return null;

    const candidatesWithPhone = candidates.filter(c => c.phone);
    const previewCandidate = candidatesWithPhone[0];
    const previewMessage = previewCandidate
        ? applyContactMessageTemplate(message, {
              nombre: previewCandidate.name,
              telefono: previewCandidate.phone,
              puesto: processTitle,
          })
        : message;

    const handleSend = async () => {
        if (!message.trim()) {
            onNotify?.('Ingresa un mensaje', 'error');
            return;
        }

        setIsSending(true);
        try {
            await onSend(message, createGroup);
            setMessage('');
            setSelectedTemplate('');
            setCreateGroup(false);
            onClose();
        } catch (error) {
            console.error('Error enviando mensajes:', error);
            onNotify?.('Error al enviar mensajes. Inténtalo de nuevo.', 'error');
        } finally {
            setIsSending(false);
        }
    };

    const handleCopy = async () => {
        const ok = await copyContactMessageToClipboard('whatsapp', '', previewMessage);
        onNotify?.(
            ok ? 'Mensaje copiado al portapapeles' : 'No se pudo copiar al portapapeles',
            ok ? 'success' : 'error'
        );
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b">
                    <div className="flex items-center gap-3">
                        <MessageCircle className="w-6 h-6 text-green-600" />
                        <h2 className="text-xl font-semibold text-gray-900">Enviar WhatsApp masivo</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-sm text-blue-800">
                            <Users className="w-4 h-4" />
                            <span className="font-medium">
                                {candidatesWithPhone.length} candidato
                                {candidatesWithPhone.length !== 1 ? 's' : ''} con teléfono
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
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        >
                            {whatsappTemplates.length === 0 ? (
                                <option value="">Sin plantillas — escribe el mensaje manualmente</option>
                            ) : (
                                whatsappTemplates.map(template => (
                                    <option key={template.id} value={template.id}>
                                        {template.name}
                                    </option>
                                ))
                            )}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Mensaje</label>
                        <textarea
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                            placeholder="Escribe el mensaje..."
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                            rows={6}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Variables: {'{{nombre}}'}, {'{{telefono}}'}, {'{{puesto}}'}
                        </p>
                    </div>

                    {previewCandidate && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold text-gray-600">Vista previa</span>
                                <button
                                    type="button"
                                    onClick={() => void handleCopy()}
                                    className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900"
                                >
                                    <Copy className="w-3.5 h-3.5" />
                                    Copiar
                                </button>
                            </div>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{previewMessage}</p>
                        </div>
                    )}

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="createGroup"
                            checked={createGroup}
                            onChange={e => setCreateGroup(e.target.checked)}
                            className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                        />
                        <label htmlFor="createGroup" className="text-sm text-gray-700 cursor-pointer">
                            Crear grupo de WhatsApp
                        </label>
                    </div>

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
                            disabled={isSending || !message.trim()}
                            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isSending ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Abriendo...
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4" />
                                    Abrir WhatsApp ({candidatesWithPhone.length})
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
