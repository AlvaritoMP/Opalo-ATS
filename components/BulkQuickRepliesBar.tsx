import React from 'react';
import { Plus, MessageSquare, Paperclip, Pencil } from 'lucide-react';
import type { BulkQuickReply } from '../types';
import {
    bulkQuickReplyAttachmentCount,
    getBulkInfoPinStyle,
} from '../lib/bulkQuickReplies';

interface BulkQuickRepliesBarProps {
    replies: BulkQuickReply[];
    canEdit: boolean;
    isCopyingId?: string | null;
    onCopyReply: (reply: BulkQuickReply) => void;
    onEditReply: (reply: BulkQuickReply) => void;
    onAddReply: () => void;
}

export const BulkQuickRepliesBar: React.FC<BulkQuickRepliesBarProps> = ({
    replies,
    canEdit,
    isCopyingId,
    onCopyReply,
    onEditReply,
    onAddReply,
}) => {
    if (replies.length === 0 && !canEdit) return null;

    return (
        <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-1.5 px-0.5">
                <MessageSquare className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 select-none">
                    Respuestas rápidas
                </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                {replies.map(reply => {
                    const style = getBulkInfoPinStyle(reply.color);
                    const attachmentCount = bulkQuickReplyAttachmentCount(reply);
                    const isCopying = isCopyingId === reply.id;
                    return (
                        <div key={reply.id} className="inline-flex items-center max-w-[220px]">
                            <button
                                type="button"
                                onClick={() => onCopyReply(reply)}
                                disabled={isCopying}
                                className={`inline-flex items-center flex-1 min-w-0 px-2.5 py-1 text-xs font-semibold border rounded-l-md shadow-sm transition-colors truncate ${style.button} ${
                                    isCopying ? 'opacity-60 cursor-wait' : 'hover:brightness-95'
                                }`}
                                title={`Copiar: ${reply.title}`}
                            >
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 mr-1.5 ${style.dot}`} />
                                {attachmentCount > 0 && (
                                    <Paperclip className="w-3 h-3 shrink-0 mr-1 opacity-70" aria-hidden />
                                )}
                                <span className="truncate">{reply.title}</span>
                            </button>
                            {canEdit && (
                                <button
                                    type="button"
                                    onClick={() => onEditReply(reply)}
                                    className={`inline-flex items-center px-1.5 py-1 text-xs border border-l-0 rounded-r-md shadow-sm transition-colors ${style.button} hover:brightness-95`}
                                    title="Editar respuesta"
                                >
                                    <Pencil className="w-3 h-3 opacity-70" />
                                </button>
                            )}
                        </div>
                    );
                })}
                {canEdit && (
                    <button
                        type="button"
                        onClick={onAddReply}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 bg-white border border-dashed border-gray-300 rounded-md hover:border-sky-400 hover:text-sky-700 hover:bg-sky-50 transition-colors shrink-0"
                        title="Agregar respuesta"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Agregar
                    </button>
                )}
            </div>
        </div>
    );
};
