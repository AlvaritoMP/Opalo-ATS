import React, { useState, useRef, useEffect } from 'react';
import { FileText, Download, Loader2, ChevronDown } from 'lucide-react';
import { saveAs } from 'file-saver';
import type { BulkDocumentTemplate, CustomColumn, Process } from '../types';
import type { BulkCandidate } from '../lib/api/bulkCandidates';
import { generateBulkDocument } from '../lib/bulkDocumentData';

interface BulkDocumentsCellProps {
    templates: BulkDocumentTemplate[];
    candidate: BulkCandidate;
    process?: Process;
    companyName: string;
    customColumns: CustomColumn[];
    getColumnValue: (candidateId: string, columnId: string, candidate?: BulkCandidate) => unknown;
    onError?: (message: string) => void;
}

export const BulkDocumentsCell: React.FC<BulkDocumentsCellProps> = ({
    templates,
    candidate,
    process,
    companyName,
    customColumns,
    getColumnValue,
    onError,
}) => {
    const [open, setOpen] = useState(false);
    const [generatingId, setGeneratingId] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const handleClick = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [open]);

    if (!templates.length) {
        return <span className="text-gray-300 text-xs">—</span>;
    }

    const handleDownload = async (tpl: BulkDocumentTemplate) => {
        setGeneratingId(tpl.id);
        try {
            const { blob, fileName } = generateBulkDocument(tpl, {
                candidate,
                process,
                companyName,
                customColumns,
                getColumnValue,
            });
            saveAs(blob, fileName);
            setOpen(false);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Error al generar el documento';
            onError?.(msg);
        } finally {
            setGeneratingId(null);
        }
    };

    const handleDownloadAll = async () => {
        for (const tpl of templates) {
            await handleDownload(tpl);
        }
    };

    return (
        <div className="relative inline-block" ref={menuRef}>
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    if (templates.length === 1) {
                        void handleDownload(templates[0]);
                    } else {
                        setOpen(v => !v);
                    }
                }}
                disabled={!!generatingId}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 rounded transition-colors disabled:opacity-50"
                title={templates.length === 1 ? `Descargar ${templates[0].name}` : 'Descargar documentos'}
            >
                {generatingId ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                    <FileText className="w-3.5 h-3.5" />
                )}
                <span className="hidden sm:inline">Doc</span>
                {templates.length > 1 && <ChevronDown className="w-3 h-3" />}
            </button>

            {open && templates.length > 1 && (
                <div className="absolute left-0 top-full mt-1 z-50 min-w-[180px] bg-white border border-gray-200 rounded-lg shadow-lg py-1">
                    {templates.map(tpl => (
                        <button
                            key={tpl.id}
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                void handleDownload(tpl);
                            }}
                            disabled={generatingId === tpl.id}
                            className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-emerald-50 flex items-center gap-2 disabled:opacity-50"
                        >
                            {generatingId === tpl.id ? (
                                <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                            ) : (
                                <Download className="w-3 h-3 shrink-0 text-emerald-600" />
                            )}
                            <span className="truncate">{tpl.name}</span>
                        </button>
                    ))}
                    <div className="border-t border-gray-100 mt-1 pt-1">
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                void handleDownloadAll();
                            }}
                            disabled={!!generatingId}
                            className="w-full text-left px-3 py-1.5 text-xs text-emerald-700 font-medium hover:bg-emerald-50 disabled:opacity-50"
                        >
                            Descargar todos
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
