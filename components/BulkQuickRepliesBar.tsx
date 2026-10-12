import React from 'react';
import { Plus, MessageSquare, Paperclip, Pencil, LayoutGrid } from 'lucide-react';
import type { BulkQuickReply } from '../types';
import {
    bulkQuickReplyAttachmentCount,
    getBulkInfoPinStyle,
    quickReplyCopyKey,
} from '../lib/bulkQuickReplies';

interface BulkQuickRepliesBarProps {
    replies: BulkQuickReply[];
    canEdit: boolean;
    currentProcessId?: string;
    isCopyingId?: string | null;
    globalReplyCount?: number;
    onCopyReply: (reply: BulkQuickReply) => void;
    onEditReply: (reply: BulkQuickReply) => void;
    onAddReply: () => void;
    onOpenGlobalPanel?: () => void;
}

export const BulkQuickRepliesBar: React.FC<BulkQuickRepliesBarProps> = ({
    replies,
    canEdit,
    currentProcessId,
    isCopyingId,
    globalReplyCount = 0,
    onCopyReply,
    onEditReply,
    onAddReply,
    onOpenGlobalPanel,
}) => {
    const showGlobalPanel = Boolean(onOpenGlobalPanel && globalReplyCount > 0);
    if (replies.length === 0 && !canEdit && !showGlobalPanel) return null;

    return (
        <div className="flex items-center gap-1 min-w-0 shrink-0">
            <div className="flex items-center gap-1 px-0.5 shrink-0">
                <MessageSquare className="w-3 h-3 text-sky-600 shrink-0" />
                <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 select-none whitespace-nowrap">
                    Respuestas
                </span>
            </div>
            <div className="flex flex-nowrap items-center gap-1 min-w-0">
                {replies.map(reply => {
                    const style = getBulkInfoPinStyle(reply.color);
                    const attachmentCount = bulkQuickReplyAttachmentCount(reply);
                    const copyKey = currentProcessId
                        ? quickReplyCopyKey(currentProcessId, reply.id)
                        : reply.id;
                    const isCopying = isCopyingId === copyKey;
                    return (
                        <div key={reply.id} className="inline-flex items-center max-w-[160px] shrink-0">
                            <button
                                type="button"
                                onClick={() => onCopyReply(reply)}
                                disabled={isCopying}
                                className={`inline-flex items-center flex-1 min-w-0 h-7 px-2 text-[11px] font-semibold border rounded-l-md transition-colors truncate ${style.button} ${
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
                                    className={`inline-flex items-center h-7 px-1.5 text-[11px] border border-l-0 rounded-r-md transition-colors ${style.button} hover:brightness-95`}
                                    title="Editar respuesta"
                                >
                                    <Pencil className="w-3 h-3 opacity-70" />
                                </button>
                            )}
                        </div>
                    );
                })}
                {showGlobalPanel && (
                    <button
                        type="button"
                        onClick={onOpenGlobalPanel}
                        className="inline-flex items-center gap-1 h-7 px-2 text-[11px] font-medium text-sky-700 bg-sky-50 border border-sky-200 rounded-md hover:bg-sky-100 hover:border-sky-300 transition-colors shrink-0 whitespace-nowrap"
                        title="Ver respuestas de todos los procesos masivos"
                    >
                        <LayoutGrid className="w-3.5 h-3.5" />
                        Todas ({globalReplyCount})
                    </button>
                )}
                {canEdit && (
                    <button
                        type="button"
                        onClick={onAddReply}
                        className="inline-flex items-center gap-1 h-7 px-2 text-[11px] font-medium text-gray-600 bg-white border border-dashed border-gray-300 rounded-md hover:border-sky-400 hover:text-sky-700 hover:bg-sky-50 transition-colors shrink-0"
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
