import React, { useEffect, useMemo, useState } from 'react';
import { X, Mail, MessageCircle, Copy, ExternalLink } from 'lucide-react';
import type { BulkContactMessageTemplate } from '../types';
import {
    applyContactMessageTemplate,
    copyContactMessageToClipboard,
    filterContactTemplatesByChannel,
    type ContactMessageTemplateVars,
} from '../lib/contactMessageTemplates';
import { openMailCompose, getMailComposeToastMessage } from '../lib/openMailto';

export interface ContactMessageModalProps {
    isOpen: boolean;
    onClose: () => void;
    channel: 'email' | 'whatsapp';
    candidateName?: string;
    contactAddress: string;
    processTitle?: string;
    templates: BulkContactMessageTemplate[];
    onAfterSend?: () => void | Promise<void>;
    onNotify?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const ContactMessageModal: React.FC<ContactMessageModalProps> = ({
    isOpen,
    onClose,
    channel,
    candidateName,
    contactAddress,
    processTitle,
    templates,
    onAfterSend,
    onNotify,
}) => {
    const channelTemplates = useMemo(
        () => filterContactTemplatesByChannel(templates, channel),
        [templates, channel]
    );

    const [selectedId, setSelectedId] = useState('');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [busy, setBusy] = useState(false);

    const vars: ContactMessageTemplateVars = useMemo(
        () => ({
            nombre: candidateName,
            email: channel === 'email' ? contactAddress : undefined,
            telefono: channel === 'whatsapp' ? contactAddress : undefined,
            puesto: processTitle,
        }),
        [candidateName, contactAddress, channel, processTitle]
    );

    useEffect(() => {
        if (!isOpen) return;
        const first = channelTemplates[0];
        setSelectedId(first?.id ?? '');
        if (first) {
            setSubject(first.subject ?? '');
            setBody(first.body);
        } else {
            setSubject('');
            setBody('');
        }
    }, [isOpen, channel, channelTemplates]);

    useEffect(() => {
        if (!selectedId) return;
        const template = channelTemplates.find(t => t.id === selectedId);
        if (template) {
            setSubject(template.subject ?? '');
            setBody(template.body);
        }
    }, [selectedId, channelTemplates]);

    if (!isOpen) return null;

    const previewSubject = applyContactMessageTemplate(subject, vars);
    const previewBody = applyContactMessageTemplate(body, vars);

    const notify = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        onNotify?.(message, type);
    };

    const handleCopy = async () => {
        if (!previewBody.trim()) {
            notify('Escribe o selecciona un mensaje primero', 'error');
            return;
        }
        const ok = await copyContactMessageToClipboard(channel, previewSubject, previewBody);
        notify(
            ok
                ? 'Mensaje copiado al portapapeles'
                : 'No se pudo copiar. Copia el texto manualmente.',
            ok ? 'success' : 'error'
        );
    };

    const handleOpen = async () => {
        if (!previewBody.trim()) {
            notify('Escribe o selecciona un mensaje primero', 'error');
            return;
        }
        if (channel === 'email' && !previewSubject.trim()) {
            notify('El asunto del correo es obligatorio', 'error');
            return;
        }

        setBusy(true);
        try {
            if (channel === 'whatsapp') {
                const clean = contactAddress.replace(/[^\d]/g, '');
                const encoded = encodeURIComponent(previewBody);
                window.open(`https://wa.me/${clean}?text=${encoded}`, '_blank', 'noopener,noreferrer');
                notify('WhatsApp abierto con el mensaje preparado');
            } else {
                const result = await openMailCompose({
                    to: [contactAddress],
                    subject: previewSubject,
                    body: previewBody,
                });
                notify(getMailComposeToastMessage(result));
            }
            await onAfterSend?.();
            onClose();
        } finally {
            setBusy(false);
        }
    };

    const ChannelIcon = channel === 'email' ? Mail : MessageCircle;
    const channelLabel = channel === 'email' ? 'Correo' : 'WhatsApp';

    return (
        <div className="fixed inset-0 bg-black/50 z-[120] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between p-4 border-b shrink-0">
                    <div className="flex items-center gap-2">
                        <ChannelIcon
                            className={`w-5 h-5 ${channel === 'email' ? 'text-blue-600' : 'text-green-600'}`}
                        />
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">
                                {channelLabel} — {candidateName || 'Candidato'}
                            </h2>
                            <p className="text-xs text-gray-500 truncate max-w-[280px]">{contactAddress}</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-gray-100"
                        aria-label="Cerrar"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Plantilla predefinida
                        </label>
                        {channelTemplates.length === 0 ? (
                            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                                No hay plantillas para {channelLabel.toLowerCase()}. Configúralas en la
                                edición del proceso masivo.
                            </p>
                        ) : (
                            <select
                                value={selectedId}
                                onChange={e => setSelectedId(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                            >
                                {channelTemplates.map(t => (
                                    <option key={t.id} value={t.id}>
                                        {t.name}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    {channel === 'email' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Asunto</label>
                            <input
                                type="text"
                                value={subject}
                                onChange={e => setSubject(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mensaje</label>
                        <textarea
                            value={body}
                            onChange={e => setBody(e.target.value)}
                            rows={8}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm resize-none"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Variables: {'{{nombre}}'}, {'{{email}}'}, {'{{telefono}}'}, {'{{puesto}}'}
                        </p>
                    </div>

                    {(previewSubject || previewBody) && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                            <p className="text-xs font-semibold text-gray-600 mb-2">Vista previa</p>
                            {channel === 'email' && previewSubject && (
                                <p className="text-sm text-gray-800 mb-2">
                                    <span className="font-medium">Asunto:</span> {previewSubject}
                                </p>
                            )}
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{previewBody}</p>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t bg-gray-50 flex flex-wrap gap-2 justify-end shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                        disabled={busy}
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={() => void handleCopy()}
                        disabled={busy || !previewBody.trim()}
                        className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2"
                    >
                        <Copy className="w-4 h-4" />
                        Copiar
                    </button>
                    <button
                        type="button"
                        onClick={() => void handleOpen()}
                        disabled={busy || !previewBody.trim()}
                        className={`px-4 py-2 text-sm text-white rounded-lg disabled:opacity-50 flex items-center gap-2 ${
                            channel === 'email'
                                ? 'bg-blue-600 hover:bg-blue-700'
                                : 'bg-green-600 hover:bg-green-700'
                        }`}
                    >
                        <ExternalLink className="w-4 h-4" />
                        {channel === 'email' ? 'Abrir correo' : 'Abrir WhatsApp'}
                    </button>
                </div>
            </div>
        </div>
    );
};
