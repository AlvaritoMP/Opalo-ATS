import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAppState } from '../App';
import { bulkCandidatesApi, BulkCandidate } from '../lib/api/bulkCandidates';
import { processesApi } from '../lib/api/processes';
import { Check, X, Loader2, Send, Archive, Search, ChevronDown, ChevronUp, Plus, Edit, Trash2, ArrowLeft, MessageCircle, Phone, Upload, Filter, Mail, Calendar, Settings, ArrowUp, ArrowDown, Pin, FileText, BookOpen, Paperclip, ClipboardList } from 'lucide-react';
import { Process, CustomColumn, BulkProcessConfig } from '../types';
import {
    BASE_COLUMNS,
    DEFAULT_COLUMN_ORDER,
    buildAllColumnIds,
    getColumnLabel,
    getColumnValuesStorageKey,
    resolveColumnOrder,
    formatBulkDate,
    normalizeBulkDateInput,
    isScoreIaColumnVisible,
    shouldApplyScoreAutoFilter,
    mapImportHeader,
    parseClipboardGrid,
    isPasteEditableColumn,
    formatCustomCellDisplay,
    parseCustomCellInput,
    getDisplayEmail,
    resolveStandardFieldValue,
    isPlaceholderImportEmail,
    repairDateColumnValues,
    COMPACT_TD_CLASS,
    COMPACT_TH_CLASS,
    getStickyColumnStyle,
    CHECKBOX_COL_WIDTH,
} from '../lib/bulkTableColumns';
import { getCellMetaStorageKey, BulkCellMeta, BulkCellMetaStore } from '../lib/bulkCellMeta';
import { BulkCellContextMenu } from './BulkCellContextMenu';
import { BulkProcessEditorModal } from './BulkProcessEditorModal';
import { BulkProcessImportModal } from './BulkProcessImportModal';
import { BulkWhatsAppModal } from './BulkWhatsAppModal';
import { BulkEmailModal } from './BulkEmailModal';
import { QuickScheduleModal } from './QuickScheduleModal';
import { QuickScheduleInline } from './QuickScheduleInline';
import { BulkScheduleModal } from './BulkScheduleModal';
import { AddColumnModal } from './AddColumnModal';
import { TableTemplateModal } from './TableTemplateModal';
import { PsycholaboralReportModal } from './PsycholaboralReportModal';
import { PsycholaboralBulkEvaluateModal } from './PsycholaboralBulkEvaluateModal';
import { PsycholaboralInventoryModal } from './PsycholaboralInventoryModal';
import { psycholaboralApi } from '../lib/api/psycholaboral';
import { createDefaultPsycholaboralInventory } from '../lib/psycholaboralDefaults';
import { PsycholaboralInventory } from '../types';
import { isPsycholaboralEnabled } from '../lib/psycholaboralUtils';
import { BulkProcessCard } from './BulkProcessCard';
import { BulkProcessAttachmentsModal } from './BulkProcessAttachmentsModal';

interface BulkProcessesViewProps {}

type CellCoord = { candidateId: string; colId: string };

const toCellKey = (c: CellCoord) => `${c.candidateId}::${c.colId}`;

const parseCellKey = (key: string): CellCoord => {
    const sep = key.indexOf('::');
    return { candidateId: key.slice(0, sep), colId: key.slice(sep + 2) };
};

const getCellFromElement = (el: EventTarget | null): CellCoord | null => {
    const td = (el as HTMLElement | null)?.closest?.('[data-cell-row]') as HTMLElement | null;
    if (!td) return null;
    const candidateId = td.getAttribute('data-cell-row');
    const colId = td.getAttribute('data-cell-col');
    if (!candidateId || !colId) return null;
    return { candidateId, colId };
};

// Función helper para formatear tiempo relativo
const formatTimeAgo = (dateString?: string): string => {
    if (!dateString) return 'Nunca';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    
    if (diffMins < 1) return 'Hace menos de 1 min';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
    if (diffDays < 7) return `Hace ${diffDays} ${diffDays === 1 ? 'día' : 'días'}`;
    if (diffWeeks < 4) return `Hace ${diffWeeks} ${diffWeeks === 1 ? 'semana' : 'semanas'}`;
    if (diffMonths < 12) return `Hace ${diffMonths} ${diffMonths === 1 ? 'mes' : 'meses'}`;
    return `Hace más de ${Math.floor(diffDays / 365)} ${Math.floor(diffDays / 365) === 1 ? 'año' : 'años'}`;
};

// Drawer lateral para mostrar detalles del candidato
const CandidateDrawer: React.FC<{
    candidate: BulkCandidate | null;
    isOpen: boolean;
    onClose: () => void;
    onLoadDetails: (candidateId: string) => Promise<void>;
    process?: Process;
    onPsychReport?: (candidate: BulkCandidate) => void;
    showPsychReport?: boolean;
}> = ({ candidate, isOpen, onClose, onLoadDetails, process, onPsychReport, showPsychReport }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [fullCandidate, setFullCandidate] = useState<BulkCandidate | null>(null);

    useEffect(() => {
        if (isOpen && candidate && !fullCandidate) {
            setIsLoading(true);
            bulkCandidatesApi.getCandidateDetails(candidate.id)
                .then(details => {
                    setFullCandidate(details);
                })
                .catch(error => {
                    console.error('Error cargando detalles:', error);
                })
                .finally(() => {
                    setIsLoading(false);
                });
        }
    }, [isOpen, candidate, fullCandidate]);

    useEffect(() => {
        if (!isOpen) {
            setFullCandidate(null);
        }
    }, [isOpen]);

    if (!isOpen || !candidate) return null;

    const displayCandidate = fullCandidate || candidate;
    const stage = process?.stages.find(s => s.id === candidate.stageId);
    const showScoreIa = isScoreIaColumnVisible(process?.bulkConfig);

    return (
        <div className="fixed inset-0 z-50 flex">
            <div className="flex-1 bg-black bg-opacity-50" onClick={onClose} />
            <div className="w-full max-w-2xl bg-white shadow-xl overflow-y-auto">
                <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
                    <h2 className="text-xl font-semibold text-gray-900">{displayCandidate.name}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>
                <div className="p-6 space-y-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
                            <span className="ml-2 text-gray-600">Cargando detalles...</span>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Email</label>
                                    <p className="text-gray-900">{displayCandidate.email || 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Teléfono</label>
                                    <p className="text-gray-900">{displayCandidate.phone || 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Etapa</label>
                                    <p className="text-gray-900">{stage?.name || 'N/A'}</p>
                                </div>
                                {showScoreIa && displayCandidate.scoreIa !== undefined && (
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Score IA</label>
                                        <p className="text-gray-900">{displayCandidate.scoreIa}</p>
                                    </div>
                                )}
                            </div>
                            {displayCandidate.description && (
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Descripción</label>
                                    <p className="text-gray-900 mt-1 whitespace-pre-wrap">{displayCandidate.description}</p>
                                </div>
                            )}
                            {displayCandidate.metadataIa && (
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Resumen IA</label>
                                    <p className="text-gray-900 mt-1 whitespace-pre-wrap">{displayCandidate.metadataIa}</p>
                                </div>
                            )}
                            {displayCandidate.attachments && displayCandidate.attachments.length > 0 && (
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Documentos</label>
                                    <div className="mt-2 space-y-2">
                                        {displayCandidate.attachments.map((att: any) => (
                                            <a
                                                key={att.id}
                                                href={att.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                            >
                                                <p className="text-sm font-medium text-gray-900">{att.name}</p>
                                                <p className="text-xs text-gray-500">{att.type}</p>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {showPsychReport && onPsychReport && candidate && (
                                <button
                                    type="button"
                                    onClick={() => onPsychReport(candidate)}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm"
                                >
                                    <FileText className="w-4 h-4" />
                                    Generar informe psicolaboral
                                </button>
                            )}
                            {displayCandidate.history && displayCandidate.history.length > 0 && (
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Historial</label>
                                    <div className="mt-2 space-y-2">
                                        {displayCandidate.history.map((h: any, idx: number) => (
                                            <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                                                <p className="text-sm text-gray-900">
                                                    Movido a: {process?.stages.find(s => s.id === h.stage_id)?.name || h.stage_id}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {new Date(h.moved_at).toLocaleString()} por {h.moved_by || 'Sistema'}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

// Tooltip para mostrar metadata_ia al hover con formato mejorado
const MetadataTooltip: React.FC<{
    metadata: string;
    scoreIa?: number;
    children: React.ReactNode;
}> = ({ metadata, scoreIa, children }) => {
    const [isVisible, setIsVisible] = useState(false);
    if (!metadata && scoreIa === undefined) return <>{children}</>;
    
    // Intentar parsear metadata como JSON o usar como texto plano
    let parsedMetadata: any = null;
    try {
        parsedMetadata = metadata ? JSON.parse(metadata) : null;
    } catch {
        // Si no es JSON, usar como texto
    }
    
    return (
        <div className="relative inline-block" onMouseEnter={() => setIsVisible(true)} onMouseLeave={() => setIsVisible(false)}>
            {children}
            {isVisible && (
                <div className="absolute z-50 w-96 p-4 bg-gray-900 text-white text-sm rounded-lg shadow-xl left-0 top-full mt-2">
                    {scoreIa !== undefined && (
                        <div className="mb-2 pb-2 border-b border-gray-700">
                            <span className="font-semibold">Score IA: </span>
                            <span className={scoreIa >= 70 ? 'text-green-400' : scoreIa >= 50 ? 'text-yellow-400' : 'text-red-400'}>
                                {scoreIa}/100
                            </span>
                        </div>
                    )}
                    {parsedMetadata && typeof parsedMetadata === 'object' ? (
                        <div className="space-y-1">
                            {parsedMetadata.experiencia && (
                                <div><span className="font-semibold">Experiencia: </span>{parsedMetadata.experiencia}</div>
                            )}
                            {parsedMetadata.ubicacion && (
                                <div><span className="font-semibold">Ubicación: </span>{parsedMetadata.ubicacion}</div>
                            )}
                            {parsedMetadata.match && (
                                <div><span className="font-semibold">Match: </span>{parsedMetadata.match}</div>
                            )}
                            {parsedMetadata.resumen && (
                                <div className="mt-2 pt-2 border-t border-gray-700">{parsedMetadata.resumen}</div>
                            )}
                        </div>
                    ) : (
                        <p className="whitespace-pre-wrap">{metadata}</p>
                    )}
                    <div className="absolute -top-1 left-4 w-2 h-2 bg-gray-900 transform rotate-45" />
                </div>
            )}
        </div>
    );
};

// Floating Action Button para acciones masivas
const BulkActionsFAB: React.FC<{
    selectedIds: string[];
    onApprove: () => void;
    onReject: () => void;
    onArchive: () => void;
    onWebhook: () => void;
    onDelete: () => void;
    onWhatsApp: () => void;
    onEmail: () => void;
    onBulkSchedule: () => void;
    onPsychReport?: () => void;
    onPsychBulkEvaluate?: () => void;
    showPsychReport?: boolean;
}> = ({
    selectedIds,
    onApprove,
    onReject,
    onArchive,
    onWebhook,
    onDelete,
    onWhatsApp,
    onEmail,
    onBulkSchedule,
    onPsychReport,
    onPsychBulkEvaluate,
    showPsychReport,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    if (selectedIds.length === 0) return null;
    return (
        <div className="fixed bottom-6 right-6 z-40">
            {isOpen && (
                <div className="mb-4 space-y-2">
                    <button onClick={() => { onApprove(); setIsOpen(false); }} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg shadow-lg hover:bg-green-700 transition-colors">
                        <Check className="w-4 h-4" /> Aprobar ({selectedIds.length})
                    </button>
                    <button onClick={() => { onReject(); setIsOpen(false); }} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg shadow-lg hover:bg-red-700 transition-colors">
                        <X className="w-4 h-4" /> Rechazar ({selectedIds.length})
                    </button>
                    <button onClick={() => { onArchive(); setIsOpen(false); }} className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg shadow-lg hover:bg-gray-700 transition-colors">
                        <Archive className="w-4 h-4" /> Archivar ({selectedIds.length})
                    </button>
                    <button onClick={() => { onBulkSchedule(); setIsOpen(false); }} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg shadow-lg hover:bg-indigo-700 transition-colors">
                        <Calendar className="w-4 h-4" /> Agendar Entrevista ({selectedIds.length})
                    </button>
                    {showPsychReport && onPsychReport && (
                    <button onClick={() => { onPsychReport(); setIsOpen(false); }} className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg shadow-lg hover:bg-teal-700 transition-colors">
                        <FileText className="w-4 h-4" /> Informe Psicolaboral ({selectedIds.length})
                    </button>
                    )}
                    {showPsychReport && onPsychBulkEvaluate && (
                    <button onClick={() => { onPsychBulkEvaluate(); setIsOpen(false); }} className="flex items-center gap-2 px-4 py-2 bg-cyan-700 text-white rounded-lg shadow-lg hover:bg-cyan-800 transition-colors">
                        <ClipboardList className="w-4 h-4" /> Evaluación masiva ({selectedIds.length})
                    </button>
                    )}
                    <button onClick={() => { onWhatsApp(); setIsOpen(false); }} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg shadow-lg hover:bg-green-700 transition-colors">
                        <MessageCircle className="w-4 h-4" /> WhatsApp ({selectedIds.length})
                    </button>
                    <button onClick={() => { onEmail(); setIsOpen(false); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700 transition-colors">
                        <Mail className="w-4 h-4" /> Email ({selectedIds.length})
                    </button>
                    <button onClick={() => { onWebhook(); setIsOpen(false); }} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg shadow-lg hover:bg-purple-700 transition-colors">
                        <Send className="w-4 h-4" /> Enviar a n8n ({selectedIds.length})
                    </button>
                    <button onClick={() => { onDelete(); setIsOpen(false); }} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg shadow-lg hover:bg-red-700 transition-colors">
                        <Trash2 className="w-4 h-4" /> Eliminar ({selectedIds.length})
                    </button>
                </div>
            )}
            <button onClick={() => setIsOpen(!isOpen)} className="w-14 h-14 bg-primary-600 text-white rounded-full shadow-lg hover:bg-primary-700 transition-colors flex items-center justify-center">
                {isOpen ? <ChevronDown className="w-6 h-6" /> : <ChevronUp className="w-6 h-6" />}
            </button>
        </div>
    );
};

export const BulkProcessesView: React.FC<BulkProcessesViewProps> = () => {
    const { state, actions } = useAppState();
    const [bulkProcesses, setBulkProcesses] = useState<Process[]>([]);
    const [candidates, setCandidates] = useState<BulkCandidate[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [currentPage, setCurrentPage] = useState(0);
    const [total, setTotal] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingProcesses, setIsLoadingProcesses] = useState(false);
    const [selectedProcess, setSelectedProcess] = useState<string>('');
    const [selectedStage, setSelectedStage] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');
    const [drawerCandidate, setDrawerCandidate] = useState<BulkCandidate | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [optimisticUpdates, setOptimisticUpdates] = useState<Map<string, Partial<BulkCandidate>>>(new Map());
    const [showProcessModal, setShowProcessModal] = useState(false);
    const [editingProcess, setEditingProcess] = useState<Process | null>(null);
    const [showImportModal, setShowImportModal] = useState(false);
    const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [schedulingCandidate, setSchedulingCandidate] = useState<{ id: string; name: string } | null>(null);
    const [showBulkScheduleModal, setShowBulkScheduleModal] = useState(false);
    const [editingCell, setEditingCell] = useState<{ candidateId: string; field: string } | null>(null);
    const [editValue, setEditValue] = useState('');
    const [customColumns, setCustomColumns] = useState<CustomColumn[]>([]);
    const [showAddColumnModal, setShowAddColumnModal] = useState(false);
    const [editingColumn, setEditingColumn] = useState<CustomColumn | null>(null);
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [showColumnConfig, setShowColumnConfig] = useState(false);
    const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
    const [pinnedColumns, setPinnedColumns] = useState<string[]>(['name']);
    const [columnOrder, setColumnOrder] = useState<string[]>(DEFAULT_COLUMN_ORDER);
    const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
    const [columnValues, setColumnValues] = useState<Record<string, Record<string, any>>>({});
    const [cellMeta, setCellMeta] = useState<BulkCellMetaStore>({});
    const [cellContextMenu, setCellContextMenu] = useState<{ x: number; y: number; candidateId: string; colId: string } | null>(null);
    const [quickScheduleCandidate, setQuickScheduleCandidate] = useState<string | null>(null);
    const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
    const [sortColumn, setSortColumn] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [activeCell, setActiveCell] = useState<CellCoord | null>(null);
    const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
    const [selectionAnchor, setSelectionAnchor] = useState<CellCoord | null>(null);
    const tableContainerRef = useRef<HTMLDivElement>(null);
    const isDraggingCells = useRef(false);
    const dragAnchorCell = useRef<CellCoord | null>(null);
    const didDragSelect = useRef(false);
    const [psychInventory, setPsychInventory] = useState<PsycholaboralInventory>(createDefaultPsycholaboralInventory());
    const [showPsychReportModal, setShowPsychReportModal] = useState(false);
    const [showPsychInventoryModal, setShowPsychInventoryModal] = useState(false);
    const [psychReportCandidates, setPsychReportCandidates] = useState<BulkCandidate[]>([]);
    const [showPsychBulkModal, setShowPsychBulkModal] = useState(false);
    const [psychBulkCandidates, setPsychBulkCandidates] = useState<BulkCandidate[]>([]);
    const [attachmentCounts, setAttachmentCounts] = useState<Record<string, number>>({});
    const [showProcessDocsModal, setShowProcessDocsModal] = useState(false);
    const [docsModalProcess, setDocsModalProcess] = useState<Process | null>(null);

    const pageSize = 50;

    const process = useMemo(() => {
        if (!selectedProcess) return undefined;
        return bulkProcesses.find(p => p.id === selectedProcess);
    }, [selectedProcess, bulkProcesses]);

    const psycholaboralActive = useMemo(
        () => isPsycholaboralEnabled(process?.bulkConfig?.psycholaboral),
        [process?.bulkConfig?.psycholaboral]
    );

    useEffect(() => {
        psycholaboralApi.getInventory().then(setPsychInventory).catch(() => {});
    }, []);

    useEffect(() => {
        if (bulkProcesses.length === 0) return;
        const loadCounts = async () => {
            const counts: Record<string, number> = {};
            await Promise.all(
                bulkProcesses.map(async p => {
                    try {
                        counts[p.id] = await processesApi.getAttachmentsCount(p.id, p.googleDriveFolderId, state.settings?.googleDrive);
                    } catch {
                        counts[p.id] = p.attachments?.length ?? 0;
                    }
                })
            );
            setAttachmentCounts(counts);
        };
        loadCounts();
    }, [bulkProcesses, state.settings?.googleDrive]);

    const openPsychReport = useCallback((list: BulkCandidate[]) => {
        if (!process || list.length === 0) return;
        setPsychReportCandidates(list);
        setShowPsychReportModal(true);
    }, [process]);

    const openPsychBulkEvaluate = useCallback((list: BulkCandidate[]) => {
        if (!process || list.length === 0) return;
        setPsychBulkCandidates(list);
        setShowPsychBulkModal(true);
    }, [process]);

    const baseColumns = BASE_COLUMNS;
    const allColumnIds = useMemo(
        () => buildAllColumnIds(customColumns),
        [customColumns]
    );

    const persistBulkConfig = useCallback(async (updates: Partial<BulkProcessConfig>) => {
        if (!process) return;
        const newBulkConfig: BulkProcessConfig = {
            ...process.bulkConfig,
            ...updates,
        };
        try {
            await processesApi.update(process.id, { bulkConfig: newBulkConfig });
            setBulkProcesses(prev => prev.map(p =>
                p.id === process.id ? { ...p, bulkConfig: newBulkConfig } : p
            ));
        } catch (error) {
            console.error('Error guardando configuración de tabla:', error);
            actions.showToast('Error al guardar configuración de columnas', 'error', 3000);
        }
    }, [process, actions]);

    useEffect(() => {
        if (!process) {
            setCustomColumns([]);
            setHiddenColumns([]);
            setColumnOrder(DEFAULT_COLUMN_ORDER);
            setColumnValues({});
            setColumnFilters({});
            return;
        }

        const config = process.bulkConfig;
        const cols = config?.customColumns || [];
        setCustomColumns(cols);
        setHiddenColumns(config?.hiddenColumns || []);
        setPinnedColumns(config?.pinnedColumns?.length ? config.pinnedColumns : ['name']);
        setColumnOrder(resolveColumnOrder(config, cols));
        setColumnFilters({});

        const savedValues = localStorage.getItem(getColumnValuesStorageKey(process.id));
        const parsedValues = savedValues ? JSON.parse(savedValues) : {};
        const repairedValues = repairDateColumnValues(parsedValues, cols);
        setColumnValues(repairedValues);
        if (repairedValues !== parsedValues && Object.keys(repairedValues).length > 0) {
            localStorage.setItem(getColumnValuesStorageKey(process.id), JSON.stringify(repairedValues));
        }

        const savedMeta = localStorage.getItem(getCellMetaStorageKey(process.id));
        setCellMeta(savedMeta ? JSON.parse(savedMeta) : {});

        // Si Score IA está oculto, desactivar filtro automático en BD (evita estados inconsistentes)
        if (config && !isScoreIaColumnVisible(config) && config.autoFilterEnabled) {
            persistBulkConfig({ autoFilterEnabled: false });
        }
    }, [process?.id]);

    const visibleColumns = useMemo(
        () => columnOrder.filter(colId => !hiddenColumns.includes(colId)),
        [columnOrder, hiddenColumns]
    );

    const scoreIaColumnVisible = useMemo(
        () => isScoreIaColumnVisible(process?.bulkConfig),
        [process?.bulkConfig]
    );

    // Cargar procesos masivos
    const loadBulkProcesses = useCallback(async () => {
        setIsLoadingProcesses(true);
        try {
            const processes = await processesApi.getAllBulkProcesses();
            let filteredProcesses = processes;
            const currentUser = state.currentUser;
            if (currentUser && currentUser.allowedClientIds !== undefined && currentUser.allowedClientIds !== null) {
                const allowedClientIdsSet = new Set(currentUser.allowedClientIds);
                filteredProcesses = processes.filter(p => p.clientId && allowedClientIdsSet.has(p.clientId));
            }
            setBulkProcesses(filteredProcesses);
            if (filteredProcesses.length > 0 && !selectedProcess) {
                setSelectedProcess(filteredProcesses[0].id);
            }
        } catch (error) {
            console.error('Error cargando procesos masivos:', error);
            actions.showToast('Error al cargar procesos masivos', 'error', 3000);
        } finally {
            setIsLoadingProcesses(false);
        }
    }, [selectedProcess, actions, state.currentUser]);

    useEffect(() => {
        loadBulkProcesses();
    }, []);

    // Cargar candidatos
    const loadCandidates = useCallback(async (page: number = 0, reset: boolean = false) => {
        if (!selectedProcess) {
            setCandidates([]);
            setTotal(0);
            return;
        }

        setIsLoading(true);
        try {
            const result = await bulkCandidatesApi.getCandidates(
                selectedProcess,
                page,
                pageSize,
                {
                    stageId: selectedStage || undefined,
                    search: searchQuery || undefined,
                    archived: false,
                    discarded: false,
                }
            );

            if (reset) {
                setCandidates(result.candidates);
            } else {
                setCandidates(prev => [...prev, ...result.candidates]);
            }
            setTotal(result.total);
            setHasMore(result.hasMore);
            setCurrentPage(page);
        } catch (error) {
            console.error('Error cargando candidatos:', error);
            actions.showToast('Error al cargar candidatos', 'error', 3000);
        } finally {
            setIsLoading(false);
        }
    }, [selectedProcess, selectedStage, searchQuery, actions]);

    useEffect(() => {
        loadCandidates(0, true);
    }, [selectedProcess, selectedStage, searchQuery]);

    // Sincronizar edades importadas al campo age de BD hacia columnas personalizadas "Edad"
    useEffect(() => {
        if (!process || candidates.length === 0 || customColumns.length === 0) return;
        const ageColumns = customColumns.filter(
            c => mapImportHeader(c.name.toLowerCase()) === 'age'
        );
        if (ageColumns.length === 0) return;

        setColumnValues(prev => {
            const newValues = { ...prev };
            let updated = false;
            candidates.forEach(candidate => {
                if (candidate.age == null) return;
                ageColumns.forEach(col => {
                    const current = newValues[candidate.id]?.[col.id];
                    if (current !== undefined && current !== '' && current !== null) return;
                    if (!newValues[candidate.id]) newValues[candidate.id] = {};
                    newValues[candidate.id][col.id] = candidate.age;
                    updated = true;
                });
            });
            if (updated) {
                localStorage.setItem(getColumnValuesStorageKey(process.id), JSON.stringify(newValues));
                return newValues;
            }
            return prev;
        });
    }, [candidates, customColumns, process?.id]);

    const applyOptimisticUpdate = useCallback((candidateId: string, updates: Partial<BulkCandidate>) => {
        setOptimisticUpdates(prev => new Map(prev).set(candidateId, updates));
        setCandidates(prev => prev.map(c => c.id === candidateId ? { ...c, ...updates } : c));
    }, []);

    const updateCandidateStatus = useCallback(async (candidateId: string, updates: { stageId?: string; discarded?: boolean; archived?: boolean }, previousStageId?: string) => {
        applyOptimisticUpdate(candidateId, updates);
        try {
            await bulkCandidatesApi.updateCandidate(candidateId, updates, {
                previousStageId,
                movedBy: state.currentUser?.id,
            });
            setOptimisticUpdates(prev => {
                const newMap = new Map(prev);
                newMap.delete(candidateId);
                return newMap;
            });
            if (updates.stageId && previousStageId && updates.stageId !== previousStageId) {
                const stageName = process?.stages.find(s => s.id === updates.stageId)?.name;
                actions.showToast(`Movido a: ${stageName || 'nueva etapa'}`, 'success', 2000);
            }
        } catch (error) {
            console.error('Error actualizando candidato:', error);
            loadCandidates(currentPage, true);
            actions.showToast('Error al actualizar candidato', 'error', 3000);
        }
    }, [applyOptimisticUpdate, loadCandidates, currentPage, actions, state.currentUser?.id, process?.stages]);

    const handleBulkApprove = useCallback(async () => {
        if (selectedIds.size === 0) return;
        const ids = Array.from(selectedIds);
        ids.forEach(id => {
            applyOptimisticUpdate(id, { stageId: process?.stages[process.stages.length - 1]?.id });
        });
        try {
            await bulkCandidatesApi.updateCandidatesBatch(ids, {
                stageId: process?.stages[process.stages.length - 1]?.id,
            });
            setSelectedIds(new Set());
            actions.showToast(`${ids.length} candidatos aprobados`, 'success', 3000);
        } catch (error) {
            console.error('Error aprobando candidatos:', error);
            loadCandidates(currentPage, true);
            actions.showToast('Error al aprobar candidatos', 'error', 3000);
        }
    }, [selectedIds, process, applyOptimisticUpdate, loadCandidates, currentPage, actions]);

    const handleBulkReject = useCallback(async () => {
        if (selectedIds.size === 0) return;
        const ids = Array.from(selectedIds);
        ids.forEach(id => { applyOptimisticUpdate(id, { discarded: true }); });
        try {
            await bulkCandidatesApi.updateCandidatesBatch(ids, { discarded: true, discardReason: 'Rechazado en proceso masivo' });
            setSelectedIds(new Set());
            actions.showToast(`${ids.length} candidatos rechazados`, 'success', 3000);
            loadCandidates(currentPage, true);
        } catch (error) {
            console.error('Error rechazando candidatos:', error);
            loadCandidates(currentPage, true);
            actions.showToast('Error al rechazar candidatos', 'error', 3000);
        }
    }, [selectedIds, applyOptimisticUpdate, loadCandidates, currentPage, actions]);

    const handleBulkArchive = useCallback(async () => {
        if (selectedIds.size === 0) return;
        const ids = Array.from(selectedIds);
        ids.forEach(id => { applyOptimisticUpdate(id, { archived: true }); });
        try {
            await bulkCandidatesApi.updateCandidatesBatch(ids, { archived: true });
            setSelectedIds(new Set());
            actions.showToast(`${ids.length} candidatos archivados`, 'success', 3000);
            loadCandidates(currentPage, true);
        } catch (error) {
            console.error('Error archivando candidatos:', error);
            loadCandidates(currentPage, true);
            actions.showToast('Error al archivar candidatos', 'error', 3000);
        }
    }, [selectedIds, applyOptimisticUpdate, loadCandidates, currentPage, actions]);

    const handleBulkDelete = useCallback(async () => {
        if (selectedIds.size === 0) return;
        if (!confirm(`¿Estás seguro de eliminar permanentemente ${selectedIds.size} candidato(s)? Esta acción no se puede deshacer y también se eliminarán sus carpetas en Google Drive si existen.`)) {
            return;
        }
        const ids = Array.from(selectedIds);
        try {
            // Eliminar carpetas de Google Drive si están conectadas
            if (state.settings?.googleDrive?.connected) {
                const candidatesToDelete = candidates.filter(c => ids.includes(c.id));
                for (const candidate of candidatesToDelete) {
                    // Intentar obtener el folder ID del candidato (necesitaríamos cargar los detalles completos)
                    // Por ahora, solo eliminamos de la base de datos
                }
            }
            
            await bulkCandidatesApi.deleteCandidatesBatch(ids);
            setCandidates(prev => prev.filter(c => !ids.includes(c.id)));
            setSelectedIds(new Set());
            setTotal(prev => Math.max(0, prev - ids.length));
            actions.showToast(`${ids.length} candidato(s) eliminado(s) permanentemente`, 'success', 3000);
        } catch (error) {
            console.error('Error eliminando candidatos:', error);
            loadCandidates(currentPage, true);
            actions.showToast('Error al eliminar candidatos', 'error', 3000);
        }
    }, [selectedIds, candidates, state.settings, loadCandidates, currentPage, actions]);

    const handleWhatsAppClick = useCallback(async (candidateId: string, phone: string) => {
        // Registrar la interacción en la base de datos
        try {
            await bulkCandidatesApi.recordWhatsAppInteraction(candidateId);
            
            // Actualizar optimísticamente el candidato en la lista
            setOptimisticUpdates(prev => {
                const newMap = new Map(prev);
                const candidate = candidates.find(c => c.id === candidateId);
                if (candidate) {
                    newMap.set(candidateId, {
                        ...candidate,
                        lastWhatsAppInteractionAt: new Date().toISOString(),
                    });
                }
                return newMap;
            });
        } catch (error) {
            console.error('Error registrando interacción de WhatsApp:', error);
            // No mostramos error al usuario, solo lo registramos
        }
        
        // Abrir WhatsApp en nueva pestaña
        const cleanPhone = phone.replace(/[^\d]/g, '');
        window.open(`https://wa.me/${cleanPhone}`, '_blank', 'noopener,noreferrer');
    }, [candidates]);

    const handleDeleteCandidate = useCallback(async (candidateId: string, candidateName: string) => {
        if (!confirm(`¿Estás seguro de eliminar permanentemente a ${candidateName}? Esta acción no se puede deshacer.`)) {
            return;
        }
        try {
            await bulkCandidatesApi.deleteCandidate(candidateId);
            setCandidates(prev => prev.filter(c => c.id !== candidateId));
            setSelectedIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(candidateId);
                return newSet;
            });
            setTotal(prev => prev - 1);
            actions.showToast('Candidato eliminado', 'success', 3000);
        } catch (error) {
            console.error('Error eliminando candidato:', error);
            actions.showToast('Error al eliminar candidato', 'error', 3000);
        }
    }, [actions]);

    const handleBulkWhatsApp = useCallback(async (message: string, createGroup: boolean) => {
        const selectedCandidates = candidates.filter(c => selectedIds.has(c.id) && c.phone);
        
        if (createGroup) {
            // Para crear grupo, abrimos WhatsApp Web con los números
            const phoneNumbers = selectedCandidates.map(c => c.phone?.replace(/[^\d]/g, '')).filter(Boolean);
            // WhatsApp no permite crear grupos directamente desde URL, pero podemos abrir WhatsApp Web
            window.open('https://web.whatsapp.com', '_blank');
            actions.showToast('Abre WhatsApp Web y crea un grupo manualmente con los candidatos seleccionados', 'info', 5000);
        } else {
            // Enviar mensaje individual a cada candidato
            const cleanMessage = encodeURIComponent(message);
            let openedCount = 0;
            
            for (const candidate of selectedCandidates) {
                if (candidate.phone) {
                    const cleanPhone = candidate.phone.replace(/[^\d]/g, '');
                    const personalizedMessage = message.replace(/\{\{nombre\}\}/g, candidate.name || 'Candidato');
                    const encodedMessage = encodeURIComponent(personalizedMessage);
                    
                    // Registrar la interacción
                    try {
                        await bulkCandidatesApi.recordWhatsAppInteraction(candidate.id);
                    } catch (error) {
                        console.error('Error registrando interacción:', error);
                    }
                    
                    // Abrir WhatsApp con el mensaje prellenado
                    setTimeout(() => {
                        window.open(`https://wa.me/${cleanPhone}?text=${encodedMessage}`, '_blank');
                    }, openedCount * 500); // Delay para no bloquear el navegador
                    openedCount++;
                }
            }
            
            if (openedCount > 0) {
                actions.showToast(`Abriendo WhatsApp para ${openedCount} candidato(s)`, 'success', 3000);
            }
        }
    }, [selectedIds, candidates, actions]);

    const handleBulkEmail = useCallback(async (subject: string, body: string) => {
        const selectedCandidates = candidates.filter(c => selectedIds.has(c.id) && c.email);
        
        if (selectedCandidates.length === 0) {
            actions.showToast('No hay candidatos seleccionados con email', 'error', 3000);
            return;
        }

        // Para el asunto, no reemplazamos variables ya que es un envío masivo
        // Simplemente removemos las variables o las dejamos como están
        const emailSubject = subject
            .replace(/\{\{nombre\}\}/g, '')
            .replace(/\{\{email\}\}/g, '')
            .replace(/\{\{telefono\}\}/g, '')
            .replace(/\s+/g, ' ') // Limpiar espacios múltiples
            .trim();
        
        // Para el cuerpo, usamos el primer candidato para la vista previa
        // pero en realidad cada candidato debería recibir su versión personalizada
        // Por ahora, usamos el primero para el cuerpo también
        const firstCandidate = selectedCandidates[0];
        const personalizedBody = body
            .replace(/\{\{nombre\}\}/g, firstCandidate.name || 'Candidato')
            .replace(/\{\{email\}\}/g, firstCandidate.email || '')
            .replace(/\{\{telefono\}\}/g, firstCandidate.phone || '');

        // Obtener todas las direcciones de email y separarlas con punto y coma
        const emailAddresses = selectedCandidates.map(c => c.email).filter(Boolean);
        const toEmails = emailAddresses.join(';');
        
        // Construir el enlace mailto: con todas las direcciones en el campo "to"
        // Las direcciones en el campo "to" no deben estar codificadas, solo los parámetros
        const mailtoLink = `mailto:${toEmails}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(personalizedBody)}`;
        
        window.location.href = mailtoLink;
        actions.showToast(`Abriendo cliente de correo para ${emailAddresses.length} candidato(s)`, 'success', 3000);
    }, [selectedIds, candidates, actions]);

    const handleQuickSchedule = useCallback(async (date: string, time: string, interviewerId: string, notes?: string) => {
        const candidateId = quickScheduleCandidate || schedulingCandidate?.id;
        if (!candidateId) return;

        const startDateTime = new Date(`${date}T${time}`);
        const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // 1 hora por defecto

        // Obtener nombre del candidato
        const candidate = candidates.find(c => c.id === candidateId);
        const candidateName = candidate?.name || 'Candidato';

        const eventData = {
            title: `Entrevista con ${candidateName}`,
            start: startDateTime,
            end: endDateTime,
            candidateId,
            interviewerId,
            notes: notes || '',
        };

        try {
            await actions.addInterviewEvent(eventData);
            actions.showToast('Entrevista agendada exitosamente', 'success', 3000);
        } catch (error) {
            console.error('Error agendando entrevista:', error);
            actions.showToast('Error al agendar la entrevista', 'error', 3000);
            throw error;
        }
    }, [quickScheduleCandidate, schedulingCandidate, candidates, actions]);

    const handleBulkSchedule = useCallback(async (date: string, time: string, interviewerId: string, notes?: string) => {
        const selectedCandidates = candidates.filter(c => selectedIds.has(c.id));
        
        if (selectedCandidates.length === 0) {
            actions.showToast('No hay candidatos seleccionados', 'error', 3000);
            return;
        }

        const startDateTime = new Date(`${date}T${time}`);
        const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // 1 hora por defecto

        let successCount = 0;
        let errorCount = 0;

        // Crear eventos de entrevista para todos los candidatos seleccionados
        for (const candidate of selectedCandidates) {
            const eventData = {
                title: `Entrevista con ${candidate.name}`,
                start: startDateTime,
                end: endDateTime,
                candidateId: candidate.id,
                interviewerId,
                notes: notes || '',
            };

            try {
                await actions.addInterviewEvent(eventData);
                successCount++;
            } catch (error) {
                console.error(`Error agendando entrevista para ${candidate.name}:`, error);
                errorCount++;
            }
        }

        if (successCount > 0) {
            actions.showToast(
                `${successCount} entrevista${successCount !== 1 ? 's' : ''} agendada${successCount !== 1 ? 's' : ''} exitosamente${errorCount > 0 ? ` (${errorCount} error${errorCount !== 1 ? 'es' : ''})` : ''}`,
                errorCount > 0 ? 'info' : 'success',
                4000
            );
            // Recargar candidatos para mostrar las nuevas entrevistas
            await loadCandidates(currentPage, true);
        } else {
            actions.showToast('Error al agendar las entrevistas', 'error', 3000);
        }
    }, [selectedIds, candidates, actions, currentPage, loadCandidates]);

    const handleWebhook = useCallback(async () => {
        if (selectedIds.size === 0) return;
        const ids = Array.from(selectedIds);
        const webhookUrl = state.settings?.customLabels?.n8nWebhookUrl || '';
        if (!webhookUrl) {
            actions.showToast('Webhook de n8n no configurado', 'error', 3000);
            return;
        }
        try {
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ candidateIds: ids, timestamp: new Date().toISOString() }),
            });
            if (!response.ok) throw new Error('Error en webhook');
            setSelectedIds(new Set());
            actions.showToast(`${ids.length} candidatos enviados a n8n`, 'success', 3000);
        } catch (error) {
            console.error('Error enviando a webhook:', error);
            actions.showToast('Error al enviar a n8n', 'error', 3000);
        }
    }, [selectedIds, state.settings, actions]);

    const toggleSelection = useCallback((candidateId: string) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(candidateId)) {
                newSet.delete(candidateId);
            } else {
                newSet.add(candidateId);
            }
            return newSet;
        });
    }, []);

    const toggleSelectAll = useCallback(() => {
        if (selectedIds.size === candidates.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(candidates.map(c => c.id)));
        }
    }, [selectedIds, candidates]);

    const openDrawer = useCallback((candidate: BulkCandidate) => {
        setDrawerCandidate(candidate);
        setIsDrawerOpen(true);
    }, []);

    const handleCreateProcess = () => {
        setEditingProcess(null);
        setShowProcessModal(true);
    };

    const handleEditProcess = (process: Process) => {
        setEditingProcess(process);
        setShowProcessModal(true);
    };

    const handleDeleteProcess = async (processId: string) => {
        if (!confirm('¿Estás seguro de eliminar este proceso masivo? Esta acción no se puede deshacer.')) {
            return;
        }
        try {
            await processesApi.delete(processId);
            actions.showToast('Proceso masivo eliminado', 'success', 3000);
            await loadBulkProcesses();
            if (selectedProcess === processId) {
                setSelectedProcess('');
                setCandidates([]);
            }
        } catch (error: any) {
            console.error('Error eliminando proceso:', error);
            actions.showToast(`Error: ${error.message || 'Error desconocido'}`, 'error', 5000);
        }
    };

    const handleProcessSaved = async () => {
        await loadBulkProcesses();
        setShowProcessModal(false);
        setEditingProcess(null);
    };

    const handleAddColumn = async (column: CustomColumn) => {
        const newColumns = [...customColumns, column];
        const newOrder = [...columnOrder, `custom_${column.id}`];
        setCustomColumns(newColumns);
        setColumnOrder(newOrder);
        await persistBulkConfig({ customColumns: newColumns, columnOrder: newOrder });
        actions.showToast('Columna agregada', 'success', 2000);
    };

    const handleEditColumn = async (column: CustomColumn) => {
        const newColumns = customColumns.map(c => c.id === column.id ? column : c);
        setCustomColumns(newColumns);
        await persistBulkConfig({ customColumns: newColumns });
        setEditingColumn(null);
        actions.showToast('Columna actualizada', 'success', 2000);
    };

    const handleDeleteColumn = async (columnId: string) => {
        if (!confirm('¿Eliminar esta columna personalizada?')) return;
        const colKey = `custom_${columnId}`;
        const newColumns = customColumns.filter(c => c.id !== columnId);
        const newOrder = columnOrder.filter(id => id !== colKey);
        const newHidden = hiddenColumns.filter(id => id !== colKey);
        setCustomColumns(newColumns);
        setColumnOrder(newOrder);
        setHiddenColumns(newHidden);
        await persistBulkConfig({
            customColumns: newColumns,
            columnOrder: newOrder,
            hiddenColumns: newHidden,
        });
        actions.showToast('Columna eliminada', 'success', 2000);
    };

    const handleLoadTemplate = async (columns: CustomColumn[]) => {
        const newOrder = [...DEFAULT_COLUMN_ORDER, ...columns.map(c => `custom_${c.id}`)];
        setCustomColumns(columns);
        setColumnOrder(newOrder);
        await persistBulkConfig({ customColumns: columns, columnOrder: newOrder });
        actions.showToast('Plantilla aplicada', 'success', 2000);
    };

    const handleColumnValueChange = (candidateId: string, columnId: string, value: any) => {
        if (!process) return;
        setColumnValues(prev => {
            const newValues = {
                ...prev,
                [candidateId]: {
                    ...prev[candidateId],
                    [columnId]: value,
                },
            };
            localStorage.setItem(getColumnValuesStorageKey(process.id), JSON.stringify(newValues));
            return newValues;
        });
    };

    const handleStartEdit = (candidateId: string, field: string, currentValue: any) => {
        const colId = field.startsWith('custom_') ? field : field;
        setActiveCell({ candidateId, colId });
        setSelectionAnchor({ candidateId, colId });
        setSelectedCells(new Set([toCellKey({ candidateId, colId })]));
        setEditingCell({ candidateId, field });
        if (field.startsWith('custom_')) {
            const colId = field.replace('custom_', '');
            const col = customColumns.find(c => c.id === colId);
            if (col?.type === 'checkbox') {
                setEditValue(currentValue === true ? 'true' : 'false');
            } else {
                setEditValue(currentValue === undefined || currentValue === null ? '' : String(currentValue));
            }
        } else {
            setEditValue(currentValue ?? '');
        }
    };

    const handleCancelEdit = () => {
        setEditingCell(null);
        setEditValue('');
    };

    const syncCustomFieldFromStandard = useCallback((candidateId: string, field: 'source' | 'province' | 'district', value: string) => {
        const homonymCol = customColumns.find(c => mapImportHeader(c.name.toLowerCase()) === field);
        if (!homonymCol || !process?.id) return;
        setColumnValues(prev => {
            const newValues = {
                ...prev,
                [candidateId]: { ...(prev[candidateId] || {}), [homonymCol.id]: value },
            };
            localStorage.setItem(getColumnValuesStorageKey(process.id), JSON.stringify(newValues));
            return newValues;
        });
    }, [customColumns, process?.id]);

    const handleSaveEdit = (candidateId: string, field: string) => {
        if (field.startsWith('custom_')) {
            const colId = field.replace('custom_', '');
            const col = customColumns.find(c => c.id === colId);
            if (col) {
                handleColumnValueChange(candidateId, colId, parseCustomCellInput(editValue, col));
            }
            setEditingCell(null);
            setEditValue('');
            return;
        }

        const trimmed = editValue.trim();
        if (field === 'email' && !trimmed) {
            setEditingCell(null);
            setEditValue('');
            return;
        }

        const updates: Record<string, string | undefined> = {
            [field]: trimmed || undefined,
        };

        applyOptimisticUpdate(candidateId, updates as Partial<BulkCandidate>);
        setEditingCell(null);
        setEditValue('');

        if (field === 'source' || field === 'province' || field === 'district') {
            syncCustomFieldFromStandard(candidateId, field, trimmed);
        }

        bulkCandidatesApi.patchFields(candidateId, updates).catch(error => {
            console.error('Error guardando celda:', error);
            loadCandidates(currentPage, true);
            actions.showToast('Error al guardar cambios', 'error', 3000);
        });
    };

    const setCellValue = useCallback(async (candidateId: string, colId: string, rawValue: string) => {
        if (!isPasteEditableColumn(colId)) return;

        if (colId.startsWith('custom_')) {
            const customColId = colId.replace('custom_', '');
            const col = customColumns.find(c => c.id === customColId);
            if (!col) return;
            handleColumnValueChange(candidateId, customColId, parseCustomCellInput(rawValue, col));
            return;
        }

        const value = rawValue.trim() || undefined;
        applyOptimisticUpdate(candidateId, { [colId]: value } as Partial<BulkCandidate>);
        if (colId === 'source' || colId === 'province' || colId === 'district') {
            syncCustomFieldFromStandard(candidateId, colId, rawValue.trim());
        }
        bulkCandidatesApi.patchFields(candidateId, { [colId]: value }).catch(error => {
            console.error('Error pegando valor:', error);
        });
    }, [customColumns, applyOptimisticUpdate, syncCustomFieldFromStandard]);

    const toggleColumnVisibility = async (colId: string) => {
        const isHiding = !hiddenColumns.includes(colId);
        const newHidden = isHiding
            ? [...hiddenColumns, colId]
            : hiddenColumns.filter(id => id !== colId);
        setHiddenColumns(newHidden);

        const updates: Partial<BulkProcessConfig> = { hiddenColumns: newHidden };
        if (colId === 'scoreIa' && isHiding) {
            updates.autoFilterEnabled = false;
            setColumnFilters(prev => {
                const { scoreIa: _, ...rest } = prev;
                return rest;
            });
        }

        await persistBulkConfig(updates);
    };

    const togglePinColumn = async (colId: string) => {
        const isPinned = pinnedColumns.includes(colId);
        const newPinned = isPinned
            ? pinnedColumns.filter(id => id !== colId)
            : [...pinnedColumns, colId];
        setPinnedColumns(newPinned);
        await persistBulkConfig({ pinnedColumns: newPinned });
    };

    const applyCellMeta = useCallback((candidateIds: string[], colIds: string[], patch: Partial<BulkCellMeta>) => {
        if (!process?.id) return;
        setCellMeta(prev => {
            const next = { ...prev };
            candidateIds.forEach(cId => {
                colIds.forEach(colId => {
                    if (!next[cId]) next[cId] = {};
                    const current = { ...next[cId][colId] };
                    if (patch.bgColor !== undefined) {
                        if (patch.bgColor) current.bgColor = patch.bgColor;
                        else delete current.bgColor;
                    }
                    if (patch.comment !== undefined) {
                        if (patch.comment) current.comment = patch.comment;
                        else delete current.comment;
                    }
                    if (Object.keys(current).length === 0) {
                        delete next[cId][colId];
                        if (Object.keys(next[cId]).length === 0) delete next[cId];
                    } else {
                        next[cId][colId] = current;
                    }
                });
            });
            localStorage.setItem(getCellMetaStorageKey(process.id), JSON.stringify(next));
            return next;
        });
    }, [process?.id]);

    const getCellMetaFor = useCallback((candidateId: string, colId: string): BulkCellMeta | undefined => {
        return cellMeta[candidateId]?.[colId];
    }, [cellMeta]);

    const buildTdStyle = useCallback((candidateId: string, colId: string): React.CSSProperties | undefined => {
        const meta = getCellMetaFor(candidateId, colId);
        return getStickyColumnStyle(colId, visibleColumns, pinnedColumns, false, meta?.bgColor);
    }, [getCellMetaFor, visibleColumns, pinnedColumns]);

    const buildThStyle = useCallback((colId: string): React.CSSProperties | undefined => {
        return getStickyColumnStyle(colId, visibleColumns, pinnedColumns, true);
    }, [visibleColumns, pinnedColumns]);

    const buildCheckboxStyle = useCallback((isHeader: boolean): React.CSSProperties | undefined => {
        return getStickyColumnStyle('checkbox', visibleColumns, pinnedColumns, isHeader);
    }, [visibleColumns, pinnedColumns]);

    const handleTableContextMenu = useCallback((e: React.MouseEvent) => {
        if (editingCell) return;
        const coord = getCellFromElement(e.target);
        if (!coord) return;
        e.preventDefault();
        e.stopPropagation();
        setCellContextMenu({ x: e.clientX, y: e.clientY, ...coord });
    }, [editingCell]);

    const handleDragStart = (e: React.DragEvent, colId: string) => {
        setDraggedColumn(colId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDragLeave = () => {};

    const handleDrop = async (e: React.DragEvent, targetColId: string) => {
        e.preventDefault();
        if (!draggedColumn || draggedColumn === targetColId) return;

        const newOrder = [...columnOrder];
        const fromIndex = newOrder.indexOf(draggedColumn);
        const toIndex = newOrder.indexOf(targetColId);
        if (fromIndex === -1 || toIndex === -1) return;

        newOrder.splice(fromIndex, 1);
        newOrder.splice(toIndex, 0, draggedColumn);
        setColumnOrder(newOrder);
        setDraggedColumn(null);
        await persistBulkConfig({ columnOrder: newOrder });
    };

    const handleDragEnd = () => {
        setDraggedColumn(null);
    };

    const getColumnValue = (candidateId: string, columnId: string, candidate?: BulkCandidate): any => {
        const stored = columnValues[candidateId]?.[columnId];
        if (stored !== undefined && stored !== '') return stored;
        if (stored === false) return false;
        const col = customColumns.find(c => c.id === columnId);
        if (col && candidate) {
            const mapped = mapImportHeader(col.name.toLowerCase());
            if (mapped === 'age' && candidate.age != null) return candidate.age;
            if (mapped === 'source' && candidate.source) return candidate.source;
            if (mapped === 'province' && candidate.province) return candidate.province;
            if (mapped === 'district' && candidate.district) return candidate.district;
        }
        return '';
    };

    const getCustomFilterKey = (columnId: string) => `custom_${columnId}`;

    const passesCustomColumnFilters = (candidateId: string): boolean => {
        for (const col of customColumns) {
            const filterValue = columnFilters[getCustomFilterKey(col.id)];
            if (!filterValue) continue;

            const cellValue = getColumnValue(candidateId, col.id, candidates.find(c => c.id === candidateId));

            if (col.type === 'checkbox') {
                const isChecked = cellValue === true;
                if (filterValue === 'true' && !isChecked) return false;
                if (filterValue === 'false' && isChecked) return false;
            } else if (col.type === 'select') {
                if (String(cellValue || '') !== filterValue) return false;
            } else if (col.type === 'number') {
                if (!String(cellValue ?? '').includes(filterValue)) return false;
            } else if (col.type === 'date') {
                const formatted = formatBulkDate(String(cellValue || ''));
                if (!formatted.toLowerCase().includes(filterValue.toLowerCase())) return false;
            } else {
                if (!String(cellValue || '').toLowerCase().includes(filterValue.toLowerCase())) return false;
            }
        }
        return true;
    };

    const handleSort = (column: string) => {
        if (sortColumn === column) {
            // Si ya está ordenando por esta columna, cambiar dirección
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            // Nueva columna, empezar con ascendente
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    const sortCandidates = (candidates: BulkCandidate[]): BulkCandidate[] => {
        if (!sortColumn) return candidates;

        return [...candidates].sort((a, b) => {
            const optimisticA = optimisticUpdates.get(a.id);
            const optimisticB = optimisticUpdates.get(b.id);
            const candidateA = optimisticA ? { ...a, ...optimisticA } : a;
            const candidateB = optimisticB ? { ...b, ...optimisticB } : b;

            let valueA: any;
            let valueB: any;

            switch (sortColumn) {
                case 'name':
                    valueA = (candidateA.name || '').toLowerCase();
                    valueB = (candidateB.name || '').toLowerCase();
                    break;
                case 'dni':
                    valueA = (candidateA.dni || '').toLowerCase();
                    valueB = (candidateB.dni || '').toLowerCase();
                    break;
                case 'email':
                    valueA = (candidateA.email || '').toLowerCase();
                    valueB = (candidateB.email || '').toLowerCase();
                    break;
                case 'scoreIa':
                    valueA = candidateA.scoreIa ?? 0;
                    valueB = candidateB.scoreIa ?? 0;
                    break;
                case 'phone':
                    valueA = (candidateA.phone || '').toLowerCase();
                    valueB = (candidateB.phone || '').toLowerCase();
                    break;
                case 'source':
                    valueA = (candidateA.source || '').toLowerCase();
                    valueB = (candidateB.source || '').toLowerCase();
                    break;
                case 'province':
                    valueA = (candidateA.province || '').toLowerCase();
                    valueB = (candidateB.province || '').toLowerCase();
                    break;
                case 'district':
                    valueA = (candidateA.district || '').toLowerCase();
                    valueB = (candidateB.district || '').toLowerCase();
                    break;
                case 'lastInteraction':
                    valueA = candidateA.lastWhatsAppInteractionAt ? new Date(candidateA.lastWhatsAppInteractionAt).getTime() : 0;
                    valueB = candidateB.lastWhatsAppInteractionAt ? new Date(candidateB.lastWhatsAppInteractionAt).getTime() : 0;
                    break;
                case 'nextInterview':
                    valueA = candidateA.nextInterviewAt ? new Date(candidateA.nextInterviewAt).getTime() : 0;
                    valueB = candidateB.nextInterviewAt ? new Date(candidateB.nextInterviewAt).getTime() : 0;
                    break;
                case 'stage':
                    const stageA = process?.stages.find(s => s.id === candidateA.stageId);
                    const stageB = process?.stages.find(s => s.id === candidateB.stageId);
                    valueA = (stageA?.name || '').toLowerCase();
                    valueB = (stageB?.name || '').toLowerCase();
                    break;
                default:
                    return 0;
            }

            // Comparar valores
            let comparison = 0;
            if (valueA < valueB) {
                comparison = -1;
            } else if (valueA > valueB) {
                comparison = 1;
            }

            // Aplicar dirección de ordenamiento
            return sortDirection === 'asc' ? comparison : -comparison;
        });
    };

    const displayCandidates = useMemo(() => {
        return sortCandidates(candidates.filter(candidate => {
            const optimistic = optimisticUpdates.get(candidate.id);
            const displayCandidate = optimistic ? { ...candidate, ...optimistic } : candidate;

            if (columnFilters.name && !displayCandidate.name.toLowerCase().includes(columnFilters.name.toLowerCase())) {
                return false;
            }
            if (columnFilters.dni && !(displayCandidate.dni || '').toLowerCase().includes(columnFilters.dni.toLowerCase())) {
                return false;
            }
            if (columnFilters.email && !(displayCandidate.email || '').toLowerCase().includes(columnFilters.email.toLowerCase())) {
                return false;
            }
            if (scoreIaColumnVisible && columnFilters.scoreIa) {
                const minScore = parseFloat(columnFilters.scoreIa);
                if (isNaN(minScore) || (displayCandidate.scoreIa ?? 0) < minScore) {
                    return false;
                }
            }
            if (columnFilters.phone && !(displayCandidate.phone || '').includes(columnFilters.phone)) {
                return false;
            }
            if (columnFilters.source) {
                const sourceVal = resolveStandardFieldValue('source', candidate.id, displayCandidate, columnValues, customColumns);
                if (!sourceVal.toLowerCase().includes(columnFilters.source.toLowerCase())) return false;
            }
            if (columnFilters.province) {
                const provinceVal = resolveStandardFieldValue('province', candidate.id, displayCandidate, columnValues, customColumns);
                if (!provinceVal.toLowerCase().includes(columnFilters.province.toLowerCase())) return false;
            }
            if (columnFilters.district) {
                const districtVal = resolveStandardFieldValue('district', candidate.id, displayCandidate, columnValues, customColumns);
                if (!districtVal.toLowerCase().includes(columnFilters.district.toLowerCase())) return false;
            }
            if (!passesCustomColumnFilters(candidate.id)) {
                return false;
            }
            return true;
        }));
    }, [
        candidates, columnFilters, optimisticUpdates, scoreIaColumnVisible, columnValues,
        customColumns, sortColumn, sortDirection, process?.stages,
    ]);

    const getCellIndices = useCallback((candidateId: string, colId: string) => ({
        rowIdx: displayCandidates.findIndex(c => c.id === candidateId),
        colIdx: visibleColumns.indexOf(colId),
    }), [displayCandidates, visibleColumns]);

    const getCellAt = useCallback((rowIdx: number, colIdx: number): CellCoord | null => {
        if (rowIdx < 0 || rowIdx >= displayCandidates.length) return null;
        if (colIdx < 0 || colIdx >= visibleColumns.length) return null;
        return { candidateId: displayCandidates[rowIdx].id, colId: visibleColumns[colIdx] };
    }, [displayCandidates, visibleColumns]);

    const buildCellRange = useCallback((anchor: CellCoord, target: CellCoord): Set<string> => {
        const a = getCellIndices(anchor.candidateId, anchor.colId);
        const b = getCellIndices(target.candidateId, target.colId);
        if (a.rowIdx < 0 || b.rowIdx < 0 || a.colIdx < 0 || b.colIdx < 0) {
            return new Set([toCellKey(target)]);
        }
        const minRow = Math.min(a.rowIdx, b.rowIdx);
        const maxRow = Math.max(a.rowIdx, b.rowIdx);
        const minCol = Math.min(a.colIdx, b.colIdx);
        const maxCol = Math.max(a.colIdx, b.colIdx);
        const cells = new Set<string>();
        for (let r = minRow; r <= maxRow; r++) {
            for (let c = minCol; c <= maxCol; c++) {
                const coord = getCellAt(r, c);
                if (coord) cells.add(toCellKey(coord));
            }
        }
        return cells;
    }, [getCellIndices, getCellAt]);

    const scrollCellIntoView = useCallback((coord: CellCoord) => {
        const container = tableContainerRef.current;
        if (!container) return;
        const el = container.querySelector(
            `[data-cell-row="${coord.candidateId}"][data-cell-col="${coord.colId}"]`
        ) as HTMLElement | null;
        el?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }, []);

    const focusTable = useCallback(() => {
        tableContainerRef.current?.focus();
    }, []);

    const selectSingleCell = useCallback((coord: CellCoord) => {
        setActiveCell(coord);
        setSelectionAnchor(coord);
        setSelectedCells(new Set([toCellKey(coord)]));
        focusTable();
    }, [focusTable]);

    const applyCellSelection = useCallback((
        coord: CellCoord,
        e: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean },
        anchor: CellCoord | null
    ) => {
        const key = toCellKey(coord);
        if (e.shiftKey && anchor) {
            setActiveCell(coord);
            setSelectedCells(buildCellRange(anchor, coord));
        } else if (e.ctrlKey || e.metaKey) {
            setActiveCell(coord);
            setSelectionAnchor(coord);
            setSelectedCells(prev => {
                const next = new Set(prev);
                if (next.has(key)) next.delete(key);
                else next.add(key);
                return next;
            });
        } else {
            selectSingleCell(coord);
        }
        focusTable();
    }, [buildCellRange, selectSingleCell, focusTable]);

    const cellDataAttrs = (candidateId: string, colId: string) => ({
        'data-cell-row': candidateId,
        'data-cell-col': colId,
    });

    const beginEditCell = useCallback((candidateId: string, colId: string) => {
        const candidate = displayCandidates.find(c => c.id === candidateId);
        if (!candidate) return;
        const optimistic = optimisticUpdates.get(candidateId);
        const displayCandidate = optimistic ? { ...candidate, ...optimistic } : candidate;

        if (colId.startsWith('custom_')) {
            const customColId = colId.replace('custom_', '');
            handleStartEdit(candidateId, colId, getColumnValue(candidateId, customColId, displayCandidate));
            return;
        }
        if (!isPasteEditableColumn(colId)) return;

        const fieldValues: Record<string, string> = {
            name: displayCandidate.name,
            dni: displayCandidate.dni || '',
            email: getDisplayEmail(displayCandidate.email) ?? '',
            phone: displayCandidate.phone || '',
            source: resolveStandardFieldValue('source', candidateId, displayCandidate, columnValues, customColumns),
            province: resolveStandardFieldValue('province', candidateId, displayCandidate, columnValues, customColumns),
            district: resolveStandardFieldValue('district', candidateId, displayCandidate, columnValues, customColumns),
        };
        handleStartEdit(candidateId, colId, fieldValues[colId] ?? '');
    }, [displayCandidates, optimisticUpdates, columnValues, customColumns]);

    const moveActiveCell = useCallback((
        dRow: number,
        dCol: number,
        extendSelection: boolean
    ) => {
        if (displayCandidates.length === 0 || visibleColumns.length === 0) return;

        let base = activeCell;
        if (!base) {
            base = { candidateId: displayCandidates[0].id, colId: visibleColumns[0] };
        }

        const { rowIdx, colIdx } = getCellIndices(base.candidateId, base.colId);
        const next = getCellAt(rowIdx + dRow, colIdx + dCol);
        if (!next) return;

        const anchor = selectionAnchor || base;
        setActiveCell(next);
        if (extendSelection) {
            setSelectedCells(buildCellRange(anchor, next));
        } else {
            setSelectionAnchor(next);
            setSelectedCells(new Set([toCellKey(next)]));
        }
        scrollCellIntoView(next);
        focusTable();
    }, [
        activeCell, selectionAnchor, displayCandidates, visibleColumns,
        getCellIndices, getCellAt, buildCellRange, scrollCellIntoView, focusTable,
    ]);

    useEffect(() => {
        const stopDrag = () => {
            isDraggingCells.current = false;
            dragAnchorCell.current = null;
        };
        document.addEventListener('mouseup', stopDrag);
        return () => document.removeEventListener('mouseup', stopDrag);
    }, []);

    const handleTableMouseOver = useCallback((e: React.MouseEvent) => {
        if (!isDraggingCells.current || !dragAnchorCell.current || editingCell) return;
        if (e.buttons !== 1) return;
        const coord = getCellFromElement(e.target);
        if (!coord) return;

        didDragSelect.current = true;
        setActiveCell(coord);
        setSelectedCells(buildCellRange(dragAnchorCell.current, coord));
    }, [editingCell, buildCellRange]);

    const handleTableKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (editingCell) return;
        const target = e.target as HTMLElement;
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

        if (!activeCell && displayCandidates.length > 0 && visibleColumns.length > 0) {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter'].includes(e.key)) {
                selectSingleCell({ candidateId: displayCandidates[0].id, colId: visibleColumns[0] });
                e.preventDefault();
            }
            return;
        }
        if (!activeCell) return;

        const extend = e.shiftKey;

        switch (e.key) {
            case 'ArrowUp':
                e.preventDefault();
                moveActiveCell(-1, 0, extend);
                break;
            case 'ArrowDown':
                e.preventDefault();
                moveActiveCell(1, 0, extend);
                break;
            case 'ArrowLeft':
                e.preventDefault();
                moveActiveCell(0, -1, extend);
                break;
            case 'ArrowRight':
                e.preventDefault();
                moveActiveCell(0, 1, extend);
                break;
            case 'Tab': {
                e.preventDefault();
                moveActiveCell(0, e.shiftKey ? -1 : 1, false);
                break;
            }
            case 'Enter':
                e.preventDefault();
                beginEditCell(activeCell.candidateId, activeCell.colId);
                break;
            case 'Escape':
                setSelectedCells(new Set());
                setSelectionAnchor(null);
                break;
            default:
                break;
        }
    }, [
        editingCell, activeCell, displayCandidates, visibleColumns,
        selectSingleCell, moveActiveCell, beginEditCell,
    ]);

    const isActiveCell = (candidateId: string, colId: string) =>
        activeCell?.candidateId === candidateId && activeCell?.colId === colId;

    const isCellSelected = (candidateId: string, colId: string) =>
        selectedCells.has(toCellKey({ candidateId, colId }));

    const cellFocusClass = (candidateId: string, colId: string) => {
        if (isActiveCell(candidateId, colId)) {
            return 'ring-2 ring-primary-600 ring-inset relative z-[2]';
        }
        if (isCellSelected(candidateId, colId)) {
            return 'ring-1 ring-primary-300 ring-inset';
        }
        return '';
    };

    const renderCellCommentIndicator = (candidateId: string, colId: string) => {
        const comment = getCellMetaFor(candidateId, colId)?.comment;
        if (!comment) return null;
        return (
            <span
                className="absolute top-0 right-0 w-2 h-2 bg-amber-400 rounded-bl-sm pointer-events-none"
                title={comment}
            />
        );
    };

    const tdProps = (candidateId: string, colId: string, extra = '') => {
        const meta = getCellMetaFor(candidateId, colId);
        const coord = { candidateId, colId };
        return {
            ...cellDataAttrs(candidateId, colId),
            className: `${COMPACT_TD_CLASS} relative ${cellFocusClass(candidateId, colId)} ${extra}`.trim(),
            style: buildTdStyle(candidateId, colId),
            title: meta?.comment || undefined,
            onMouseDown: (e: React.MouseEvent) => {
                e.stopPropagation();
                if (editingCell || e.button !== 0) return;
                if ((e.target as HTMLElement).closest('input, select, textarea, button, a')) return;
                if (e.shiftKey || e.ctrlKey || e.metaKey) return;
                isDraggingCells.current = true;
                didDragSelect.current = false;
                dragAnchorCell.current = coord;
                selectSingleCell(coord);
            },
            onClick: (e: React.MouseEvent) => {
                e.stopPropagation();
                if ((e.target as HTMLElement).closest('input, select, textarea, button, a')) return;
                if (didDragSelect.current) {
                    didDragSelect.current = false;
                    focusTable();
                    return;
                }
                applyCellSelection(coord, e, selectionAnchor);
            },
            onDoubleClick: (e: React.MouseEvent) => e.stopPropagation(),
        };
    };

    const sortSelectedCellKeys = useCallback((keys: string[]) => {
        return [...keys].sort((a, b) => {
            const ca = parseCellKey(a);
            const cb = parseCellKey(b);
            const ra = displayCandidates.findIndex(c => c.id === ca.candidateId);
            const rb = displayCandidates.findIndex(c => c.id === cb.candidateId);
            if (ra !== rb) return ra - rb;
            return visibleColumns.indexOf(ca.colId) - visibleColumns.indexOf(cb.colId);
        });
    }, [displayCandidates, visibleColumns]);

    const handleBulkPaste = useCallback(async (e: ClipboardEvent) => {
        if (editingCell) return;
        if (selectedCells.size === 0 && !activeCell) return;

        const target = e.target as HTMLElement;
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

        const text = e.clipboardData?.getData('text/plain');
        if (!text?.trim()) return;

        e.preventDefault();
        const grid = parseClipboardGrid(text);
        if (grid.length === 0) return;

        const flatValues = grid.flat();
        let pastedCells = 0;

        if (selectedCells.size > 0) {
            const sortedKeys = sortSelectedCellKeys(Array.from(selectedCells));
            const rowIndices = sortedKeys.map(k => displayCandidates.findIndex(c => c.id === parseCellKey(k).candidateId));
            const colIndices = sortedKeys.map(k => visibleColumns.indexOf(parseCellKey(k).colId));
            const minR = Math.min(...rowIndices);
            const maxR = Math.max(...rowIndices);
            const minC = Math.min(...colIndices);
            const maxC = Math.max(...colIndices);
            const rectRows = maxR - minR + 1;
            const rectCols = maxC - minC + 1;
            const isFullRect = sortedKeys.length === rectRows * rectCols;

            if (isFullRect && grid.length === rectRows && (grid[0]?.length ?? 0) === rectCols) {
                for (let r = 0; r < grid.length; r++) {
                    for (let c = 0; c < grid[r].length; c++) {
                        const candidateId = displayCandidates[minR + r]?.id;
                        const colId = visibleColumns[minC + c];
                        if (!candidateId || !colId || !isPasteEditableColumn(colId)) continue;
                        await setCellValue(candidateId, colId, grid[r][c]);
                        pastedCells++;
                    }
                }
            } else if (flatValues.length === 1) {
                for (const key of sortedKeys) {
                    const { candidateId, colId } = parseCellKey(key);
                    if (!isPasteEditableColumn(colId)) continue;
                    await setCellValue(candidateId, colId, flatValues[0]);
                    pastedCells++;
                }
            } else {
                for (let i = 0; i < sortedKeys.length; i++) {
                    const { candidateId, colId } = parseCellKey(sortedKeys[i]);
                    if (!isPasteEditableColumn(colId)) continue;
                    await setCellValue(candidateId, colId, flatValues[Math.min(i, flatValues.length - 1)]);
                    pastedCells++;
                }
            }

            if (pastedCells > 0) {
                actions.showToast(`Pegado en ${pastedCells} celda(s)`, 'success', 2000);
            }
            return;
        }

        if (!activeCell) return;

        const startColIdx = visibleColumns.indexOf(activeCell.colId);
        if (startColIdx === -1) return;

        let targetCandidateIds: string[];
        if (selectedIds.size > 0) {
            targetCandidateIds = displayCandidates.filter(c => selectedIds.has(c.id)).map(c => c.id);
        } else {
            const startIdx = displayCandidates.findIndex(c => c.id === activeCell.candidateId);
            if (startIdx === -1) return;
            targetCandidateIds = displayCandidates.slice(startIdx).map(c => c.id);
        }

        const rowCount = Math.min(grid.length, targetCandidateIds.length);

        for (let r = 0; r < rowCount; r++) {
            const rowValues = grid[r];
            for (let c = 0; c < rowValues.length; c++) {
                const colIdx = startColIdx + c;
                if (colIdx >= visibleColumns.length) break;
                const colId = visibleColumns[colIdx];
                if (!isPasteEditableColumn(colId)) continue;
                await setCellValue(targetCandidateIds[r], colId, rowValues[c]);
                pastedCells++;
            }
        }

        if (pastedCells > 0) {
            actions.showToast(`Pegado en ${pastedCells} celda(s)`, 'success', 2000);
        }
    }, [activeCell, editingCell, visibleColumns, selectedIds, selectedCells, displayCandidates, setCellValue, actions, sortSelectedCellKeys]);

    useEffect(() => {
        document.addEventListener('paste', handleBulkPaste);
        return () => document.removeEventListener('paste', handleBulkPaste);
    }, [handleBulkPaste]);

    return (
        <div className="h-full flex flex-col bg-white">
            <div className="border-b bg-white p-4 space-y-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-gray-900">Procesos Masivos</h1>
                    <div className="flex items-center gap-4">
                        <div className="text-sm text-gray-500">
                            {selectedProcess ? `${total} candidatos` : `${bulkProcesses.length} procesos`}
                        </div>
                        <button
                            onClick={handleCreateProcess}
                            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Nuevo Proceso Masivo
                        </button>
                    </div>
                </div>

                {!selectedProcess ? (
                    <div className="space-y-2">
                        {isLoadingProcesses ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
                                <span className="ml-2 text-gray-600">Cargando procesos...</span>
                            </div>
                        ) : bulkProcesses.length === 0 ? (
                            <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                                <p className="text-gray-500 mb-4">No hay procesos masivos creados</p>
                                <button
                                    onClick={handleCreateProcess}
                                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                                >
                                    Crear Primer Proceso Masivo
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {bulkProcesses.map(p => (
                                    <BulkProcessCard
                                        key={p.id}
                                        process={p}
                                        attachmentCount={attachmentCounts[p.id] ?? p.attachments?.length ?? 0}
                                        onSelect={() => setSelectedProcess(p.id)}
                                        onEdit={() => handleEditProcess(p)}
                                        onDelete={() => handleDeleteProcess(p.id)}
                                        onDocuments={() => {
                                            setDocsModalProcess(p);
                                            setShowProcessDocsModal(true);
                                        }}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="flex flex-col gap-3 w-full min-w-0">
                            <div className="flex items-center gap-3 min-w-0">
                                <button
                                    onClick={() => {
                                        setSelectedProcess('');
                                        setCandidates([]);
                                        setSelectedStage('');
                                        setSearchQuery('');
                                    }}
                                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 shrink-0"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    Volver a procesos
                                </button>
                                <label
                                    className="block text-sm font-medium text-gray-700 truncate min-w-0"
                                    title={process?.title}
                                >
                                    Proceso: {process?.title}
                                </label>
                            </div>
                            {process && (
                                <div className="flex flex-wrap items-center gap-2 w-full min-w-0">
                                    <button
                                        onClick={() => handleEditProcess(process)}
                                        className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                                        title="Editar proceso"
                                    >
                                        <Settings className="w-4 h-4" />
                                        Editar Proceso
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setDocsModalProcess(process);
                                            setShowProcessDocsModal(true);
                                        }}
                                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-800 rounded-lg hover:bg-gray-50 transition-colors"
                                        title="Documentos del proceso"
                                    >
                                        <Paperclip className="w-4 h-4" />
                                        Documentos
                                        {(attachmentCounts[process.id] ?? 0) > 0 && (
                                            <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary-100 text-primary-700 rounded-full">
                                                {attachmentCounts[process.id]}
                                            </span>
                                        )}
                                    </button>
                                    {psycholaboralActive && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => setShowPsychInventoryModal(true)}
                                                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
                                                title="Inventario de definiciones y plantillas"
                                            >
                                                <BookOpen className="w-4 h-4" />
                                                Inventario Psicolaboral
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const sel = candidates.filter(c => selectedIds.has(c.id));
                                                    if (sel.length === 0) {
                                                        actions.showToast('Seleccione al menos un candidato', 'error', 3000);
                                                        return;
                                                    }
                                                    openPsychBulkEvaluate(sel);
                                                }}
                                                className="flex items-center gap-2 px-4 py-2 bg-cyan-700 text-white rounded-lg hover:bg-cyan-800 transition-colors whitespace-nowrap"
                                                title="Cuadrícula de valores para varios candidatos"
                                            >
                                                <ClipboardList className="w-4 h-4 shrink-0" />
                                                Evaluación masiva
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const sel = candidates.filter(c => selectedIds.has(c.id));
                                                    if (sel.length === 0) {
                                                        actions.showToast('Seleccione al menos un candidato', 'error', 3000);
                                                        return;
                                                    }
                                                    openPsychReport(sel);
                                                }}
                                                className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors whitespace-nowrap"
                                                title="Evaluar y generar informe PDF"
                                            >
                                                <FileText className="w-4 h-4 shrink-0" />
                                                Informe Psicolaboral
                                            </button>
                                        </>
                                    )}
                                    <button
                                        onClick={() => setShowImportModal(true)}
                                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                    >
                                        <Upload className="w-4 h-4" />
                                        Importar desde Excel
                                    </button>
                                    <button
                                        onClick={() => setShowAddColumnModal(true)}
                                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                        title="Agregar columna personalizada"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Agregar Columna
                                    </button>
                                    <button
                                        onClick={() => setShowTemplateModal(true)}
                                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                                        title="Gestionar plantillas de tabla"
                                    >
                                        <Settings className="w-4 h-4" />
                                        Plantillas
                                    </button>
                                    <div className="relative">
                                        <button
                                            onClick={() => setShowColumnConfig(!showColumnConfig)}
                                            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
                                            title="Configurar columnas"
                                        >
                                            <Filter className="w-4 h-4" />
                                            Columnas
                                        </button>
                                        {showColumnConfig && (
                                            <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-xl z-50 p-2 max-h-96 overflow-y-auto">
                                                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 px-2">Columnas</div>
                                                <p className="text-[10px] text-gray-400 px-2 mb-2">📌 = fijar al hacer scroll horizontal</p>
                                                {allColumnIds.map(colId => {
                                                    const colName = getColumnLabel(colId, customColumns);
                                                    const isCustom = colId.startsWith('custom_');
                                                    const customColId = isCustom ? colId.replace('custom_', '') : null;
                                                    const isPinned = pinnedColumns.includes(colId);

                                                    return (
                                                        <div key={colId} className="flex items-center gap-1 px-2 py-1 hover:bg-gray-50 rounded">
                                                            <button
                                                                type="button"
                                                                onClick={() => togglePinColumn(colId)}
                                                                className={`p-0.5 rounded shrink-0 ${isPinned ? 'text-primary-600 bg-primary-50' : 'text-gray-300 hover:text-gray-500'}`}
                                                                title={isPinned ? 'Desfijar columna' : 'Fijar columna'}
                                                            >
                                                                <Pin className="w-3.5 h-3.5" />
                                                            </button>
                                                            <label className="flex items-center gap-2 flex-1 cursor-pointer min-w-0">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={!hiddenColumns.includes(colId)}
                                                                    onChange={() => toggleColumnVisibility(colId)}
                                                                    className="w-3.5 h-3.5 text-primary-600 rounded focus:ring-primary-500"
                                                                />
                                                                <span className="text-xs text-gray-700 truncate" title={colName}>{colName}</span>
                                                            </label>
                                                            {isCustom && customColId && (
                                                                <div className="flex gap-0.5 shrink-0">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const col = customColumns.find(c => c.id === customColId);
                                                                            if (col) {
                                                                                setEditingColumn(col);
                                                                                setShowAddColumnModal(true);
                                                                            }
                                                                        }}
                                                                        className="p-1 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded"
                                                                        title="Editar columna"
                                                                    >
                                                                        <Edit className="w-3.5 h-3.5" />
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleDeleteColumn(customColId)}
                                                                        className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                                                                        title="Eliminar columna"
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        <div className="space-y-3">
                            <div className="flex gap-4 items-end">
                                {process && (
                                    <div className="flex-1">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Etapa</label>
                                        <select
                                            value={selectedStage}
                                            onChange={(e) => setSelectedStage(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                        >
                                            <option value="">Todas las etapas</option>
                                            {process.stages.map(s => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Búsqueda</label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Nombre, teléfono..."
                                            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {selectedProcess && (
                <div className="flex-1 overflow-hidden relative flex flex-col">
                    {quickScheduleCandidate && (
                        <div 
                            className="fixed inset-0 z-30" 
                            onClick={() => setQuickScheduleCandidate(null)}
                        />
                    )}
                    <p className="text-[10px] text-gray-500 px-1 pb-1 shrink-0">
                        Flechas · Shift+arrastrar selección · Ctrl+clic múltiple · Clic derecho: color/comentario · Enter/doble clic editar · Ctrl+V pegar en celdas seleccionadas · Doble clic en fila abre detalle
                    </p>
                    <div
                        ref={tableContainerRef}
                        className="flex-1 overflow-x-auto overflow-y-auto outline-none focus:ring-2 focus:ring-primary-300 focus:ring-inset rounded"
                        style={{ minHeight: 0 }}
                        tabIndex={0}
                        onKeyDown={handleTableKeyDown}
                    >
                        <table className="w-full border-collapse" style={{ tableLayout: 'fixed', width: 'max-content', minWidth: '100%' }}>
                            <thead className="bg-gray-50 sticky top-0 z-10">
                            <tr>
                                <th
                                    className={`${COMPACT_TH_CLASS} bg-gray-50`}
                                    style={{ width: CHECKBOX_COL_WIDTH, ...buildCheckboxStyle(true) }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.size === candidates.length && candidates.length > 0}
                                        onChange={toggleSelectAll}
                                        className="w-3.5 h-3.5 text-primary-600 rounded focus:ring-primary-500"
                                    />
                                </th>
                                {visibleColumns.map(colId => {
                                    const commonProps = {
                                        key: colId,
                                        draggable: true,
                                        onDragStart: (e: React.DragEvent<HTMLTableCellElement>) => handleDragStart(e, colId),
                                        onDragOver: handleDragOver,
                                        onDragLeave: handleDragLeave,
                                        onDrop: (e: React.DragEvent<HTMLTableCellElement>) => handleDrop(e, colId),
                                        onDragEnd: handleDragEnd,
                                        className: `${COMPACT_TH_CLASS} cursor-move transition-colors bg-gray-50`,
                                        style: buildThStyle(colId),
                                    };

                                    if (colId === 'name') {
                                        return (
                                            <th {...commonProps} style={{ minWidth: '150px' }}>
                                                <div className="flex flex-col gap-1">
                                                    <button onClick={() => handleSort('name')} className="flex items-center gap-1 hover:text-primary-600 transition-colors">
                                                        <span>Nombre</span>
                                                        {sortColumn === 'name' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <div className="w-3 h-3 opacity-30"><ArrowUp className="w-3 h-3" /></div>}
                                                    </button>
                                                    <input type="text" placeholder="Filtrar..." value={columnFilters.name || ''} onChange={(e) => setColumnFilters({ ...columnFilters, name: e.target.value })} className="text-xs px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 font-normal normal-case" onClick={(e) => e.stopPropagation()} />
                                                </div>
                                            </th>
                                        );
                                    }
                                    if (colId === 'dni') {
                                        return (
                                            <th {...commonProps} style={{ minWidth: '100px' }}>
                                                <div className="flex flex-col gap-1">
                                                    <button onClick={() => handleSort('dni')} className="flex items-center gap-1 hover:text-primary-600 transition-colors">
                                                        <span>DNI</span>
                                                        {sortColumn === 'dni' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <div className="w-3 h-3 opacity-30"><ArrowUp className="w-3 h-3" /></div>}
                                                    </button>
                                                    <input type="text" placeholder="Filtrar..." value={columnFilters.dni || ''} onChange={(e) => setColumnFilters({ ...columnFilters, dni: e.target.value })} className="text-xs px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 font-normal normal-case" onClick={(e) => e.stopPropagation()} />
                                                </div>
                                            </th>
                                        );
                                    }
                                    if (colId === 'email') {
                                        return (
                                            <th {...commonProps} style={{ minWidth: '180px' }}>
                                                <div className="flex flex-col gap-1">
                                                    <button onClick={() => handleSort('email')} className="flex items-center gap-1 hover:text-primary-600 transition-colors">
                                                        <span>Email</span>
                                                        {sortColumn === 'email' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <div className="w-3 h-3 opacity-30"><ArrowUp className="w-3 h-3" /></div>}
                                                    </button>
                                                    <input type="text" placeholder="Filtrar..." value={columnFilters.email || ''} onChange={(e) => setColumnFilters({ ...columnFilters, email: e.target.value })} className="text-xs px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 font-normal normal-case" onClick={(e) => e.stopPropagation()} />
                                                </div>
                                            </th>
                                        );
                                    }
                                    if (colId === 'scoreIa') {
                                        return (
                                            <th {...commonProps} style={{ minWidth: '100px' }}>
                                                <div className="flex flex-col gap-1">
                                                    <button onClick={() => handleSort('scoreIa')} className="flex items-center gap-1 hover:text-primary-600 transition-colors">
                                                        <span>Score IA</span>
                                                        {sortColumn === 'scoreIa' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <div className="w-3 h-3 opacity-30"><ArrowUp className="w-3 h-3" /></div>}
                                                    </button>
                                                    <input type="text" placeholder="Min..." value={columnFilters.scoreIa || ''} onChange={(e) => setColumnFilters({ ...columnFilters, scoreIa: e.target.value })} className="text-xs px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 font-normal normal-case" onClick={(e) => e.stopPropagation()} />
                                                </div>
                                            </th>
                                        );
                                    }
                                    if (colId === 'status') {
                                        return (
                                            <th {...commonProps} style={{ minWidth: '100px' }}>
                                                <button onClick={() => handleSort('scoreIa')} className="flex items-center gap-1 hover:text-primary-600 transition-colors">
                                                    <span>Status</span>
                                                    {sortColumn === 'scoreIa' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <div className="w-3 h-3 opacity-30"><ArrowUp className="w-3 h-3" /></div>}
                                                </button>
                                            </th>
                                        );
                                    }
                                    if (colId === 'phone') {
                                        return (
                                            <th {...commonProps} style={{ minWidth: '130px' }}>
                                                <div className="flex flex-col gap-1">
                                                    <button onClick={() => handleSort('phone')} className="flex items-center gap-1 hover:text-primary-600 transition-colors">
                                                        <span>Teléfono</span>
                                                        {sortColumn === 'phone' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <div className="w-3 h-3 opacity-30"><ArrowUp className="w-3 h-3" /></div>}
                                                    </button>
                                                    <input type="text" placeholder="Filtrar..." value={columnFilters.phone || ''} onChange={(e) => setColumnFilters({ ...columnFilters, phone: e.target.value })} className="text-xs px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 font-normal normal-case" onClick={(e) => e.stopPropagation()} />
                                                </div>
                                            </th>
                                        );
                                    }
                                    if (colId === 'source') {
                                        return (
                                            <th {...commonProps} style={{ minWidth: '120px' }}>
                                                <div className="flex flex-col gap-1">
                                                    <button onClick={() => handleSort('source')} className="flex items-center gap-1 hover:text-primary-600 transition-colors">
                                                        <span>Fuente</span>
                                                        {sortColumn === 'source' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <div className="w-3 h-3 opacity-30"><ArrowUp className="w-3 h-3" /></div>}
                                                    </button>
                                                    <input type="text" placeholder="Filtrar..." value={columnFilters.source || ''} onChange={(e) => setColumnFilters({ ...columnFilters, source: e.target.value })} className="text-xs px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 font-normal normal-case" onClick={(e) => e.stopPropagation()} />
                                                </div>
                                            </th>
                                        );
                                    }
                                    if (colId === 'province') {
                                        return (
                                            <th {...commonProps} style={{ minWidth: '120px' }}>
                                                <div className="flex flex-col gap-1">
                                                    <button onClick={() => handleSort('province')} className="flex items-center gap-1 hover:text-primary-600 transition-colors">
                                                        <span>Provincia</span>
                                                        {sortColumn === 'province' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <div className="w-3 h-3 opacity-30"><ArrowUp className="w-3 h-3" /></div>}
                                                    </button>
                                                    <input type="text" placeholder="Filtrar..." value={columnFilters.province || ''} onChange={(e) => setColumnFilters({ ...columnFilters, province: e.target.value })} className="text-xs px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 font-normal normal-case" onClick={(e) => e.stopPropagation()} />
                                                </div>
                                            </th>
                                        );
                                    }
                                    if (colId === 'district') {
                                        return (
                                            <th {...commonProps} style={{ minWidth: '120px' }}>
                                                <div className="flex flex-col gap-1">
                                                    <button onClick={() => handleSort('district')} className="flex items-center gap-1 hover:text-primary-600 transition-colors">
                                                        <span>Distrito</span>
                                                        {sortColumn === 'district' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <div className="w-3 h-3 opacity-30"><ArrowUp className="w-3 h-3" /></div>}
                                                    </button>
                                                    <input type="text" placeholder="Filtrar..." value={columnFilters.district || ''} onChange={(e) => setColumnFilters({ ...columnFilters, district: e.target.value })} className="text-xs px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 font-normal normal-case" onClick={(e) => e.stopPropagation()} />
                                                </div>
                                            </th>
                                        );
                                    }
                                    if (colId === 'lastInteraction') {
                                        return (
                                            <th {...commonProps} style={{ minWidth: '140px' }}>
                                                <button onClick={() => handleSort('lastInteraction')} className="flex items-center gap-1 hover:text-primary-600 transition-colors">
                                                    <span>Última Interacción</span>
                                                    {sortColumn === 'lastInteraction' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <div className="w-3 h-3 opacity-30"><ArrowUp className="w-3 h-3" /></div>}
                                                </button>
                                            </th>
                                        );
                                    }
                                    if (colId === 'contact') {
                                        return (
                                            <th {...commonProps} style={{ minWidth: '100px' }}>Contacto</th>
                                        );
                                    }
                                    if (colId === 'nextInterview') {
                                        return (
                                            <th {...commonProps} style={{ minWidth: '150px' }}>
                                                <button onClick={() => handleSort('nextInterview')} className="flex items-center gap-1 hover:text-primary-600 transition-colors">
                                                    <span>Próxima Entrevista</span>
                                                    {sortColumn === 'nextInterview' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <div className="w-3 h-3 opacity-30"><ArrowUp className="w-3 h-3" /></div>}
                                                </button>
                                            </th>
                                        );
                                    }
                                    if (colId === 'schedule') {
                                        return (
                                            <th {...commonProps} style={{ minWidth: '90px' }}>Agendar</th>
                                        );
                                    }
                                    if (colId === 'stage') {
                                        return (
                                            <th {...commonProps} style={{ minWidth: '130px' }}>
                                                <button onClick={() => handleSort('stage')} className="flex items-center gap-1 hover:text-primary-600 transition-colors">
                                                    <span>Etapa</span>
                                                    {sortColumn === 'stage' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <div className="w-3 h-3 opacity-30"><ArrowUp className="w-3 h-3" /></div>}
                                                </button>
                                            </th>
                                        );
                                    }
                                    if (colId.startsWith('custom_')) {
                                        const customColId = colId.replace('custom_', '');
                                        const col = customColumns.find(c => c.id === customColId);
                                        if (!col) return null;
                                        const filterKey = getCustomFilterKey(col.id);
                                        return (
                                            <th
                                                {...commonProps}
                                                className={`${COMPACT_TH_CLASS} normal-case cursor-move transition-colors bg-gray-50`}
                                                style={{ ...buildThStyle(colId), minWidth: '120px' }}
                                            >
                                                <div className="flex flex-col gap-1">
                                                    <span className="normal-case">{col.name}</span>
                                                    {col.type === 'select' && col.options ? (
                                                        <select
                                                            value={columnFilters[filterKey] || ''}
                                                            onChange={(e) => setColumnFilters({ ...columnFilters, [filterKey]: e.target.value })}
                                                            className="text-xs px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 font-normal normal-case"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <option value="">Todos</option>
                                                            {col.options.map(opt => (
                                                                <option key={opt} value={opt}>{opt}</option>
                                                            ))}
                                                        </select>
                                                    ) : col.type === 'checkbox' ? (
                                                        <select
                                                            value={columnFilters[filterKey] || ''}
                                                            onChange={(e) => setColumnFilters({ ...columnFilters, [filterKey]: e.target.value })}
                                                            className="text-xs px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 font-normal normal-case"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <option value="">Todos</option>
                                                            <option value="true">Sí</option>
                                                            <option value="false">No</option>
                                                        </select>
                                                    ) : (
                                                        <input
                                                            type="text"
                                                            placeholder={col.type === 'number' ? 'Filtrar...' : col.type === 'date' ? 'DD/MM/AAAA' : 'Filtrar...'}
                                                            value={columnFilters[filterKey] || ''}
                                                            onChange={(e) => setColumnFilters({ ...columnFilters, [filterKey]: e.target.value })}
                                                            className="text-xs px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 font-normal normal-case"
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                    )}
                                                </div>
                                            </th>
                                        );
                                    }
                                    return null;
                                })}
                                <th className={`${COMPACT_TH_CLASS} bg-gray-50`} style={{ minWidth: '88px' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody
                            className="bg-white divide-y divide-gray-100"
                            onMouseOver={handleTableMouseOver}
                            onContextMenu={handleTableContextMenu}
                        >
                            {displayCandidates.map(candidate => {
                                const isSelected = selectedIds.has(candidate.id);
                                const optimistic = optimisticUpdates.get(candidate.id);
                                const displayCandidate = optimistic ? { ...candidate, ...optimistic } : candidate;
                                const displayEmail = getDisplayEmail(displayCandidate.email);
                                const displaySource = resolveStandardFieldValue('source', candidate.id, displayCandidate, columnValues, customColumns);
                                const displayProvince = resolveStandardFieldValue('province', candidate.id, displayCandidate, columnValues, customColumns);
                                const displayDistrict = resolveStandardFieldValue('district', candidate.id, displayCandidate, columnValues, customColumns);

                                return (
                                    <tr
                                        key={candidate.id}
                                        className={`hover:bg-gray-50 ${isSelected ? 'bg-primary-50' : ''}`}
                                        onDoubleClick={() => openDrawer(candidate)}
                                    >
                                        <td
                                            className={`${COMPACT_TD_CLASS} bg-white`}
                                            style={buildCheckboxStyle(false)}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => toggleSelection(candidate.id)}
                                                className="w-3.5 h-3.5 text-primary-600 rounded focus:ring-primary-500"
                                            />
                                        </td>
                                        {visibleColumns.map(colId => {
                                            if (colId === 'name') {
                                                return (
                                                    <td key="name" {...tdProps(candidate.id, 'name')}>
                                                        {renderCellCommentIndicator(candidate.id, 'name')}
                                                        {editingCell?.candidateId === candidate.id && editingCell?.field === 'name' ? (
                                                            <input type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={() => handleSaveEdit(candidate.id, 'name')} onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(candidate.id, 'name'); if (e.key === 'Escape') handleCancelEdit(); }} autoFocus className="w-full px-1 py-0.5 text-xs border border-primary-500 rounded focus:ring-1 focus:ring-primary-500" />
                                                        ) : (
                                                            <MetadataTooltip metadata={displayCandidate.metadataIa || ''} scoreIa={scoreIaColumnVisible ? displayCandidate.scoreIa : undefined}>
                                                                <span className="cursor-help hover:underline decoration-dotted" onDoubleClick={() => handleStartEdit(candidate.id, 'name', displayCandidate.name)} title="Doble clic para editar">{displayCandidate.name}</span>
                                                            </MetadataTooltip>
                                                        )}
                                                    </td>
                                                );
                                            }
                                            if (colId === 'dni') {
                                                return (
                                                    <td key="dni" {...tdProps(candidate.id, 'dni')}>
                                                        {editingCell?.candidateId === candidate.id && editingCell?.field === 'dni' ? (
                                                            <input type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={() => handleSaveEdit(candidate.id, 'dni')} onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(candidate.id, 'dni'); if (e.key === 'Escape') handleCancelEdit(); }} autoFocus className="w-full px-2 py-1 border border-primary-500 rounded focus:ring-2 focus:ring-primary-500" />
                                                        ) : (
                                                            <span className="text-gray-600 hover:bg-gray-50 px-1 py-0.5 rounded cursor-pointer" onDoubleClick={() => handleStartEdit(candidate.id, 'dni', displayCandidate.dni || '')} title="Doble clic para editar">{displayCandidate.dni || '-'}</span>
                                                        )}
                                                    </td>
                                                );
                                            }
                                            if (colId === 'email') {
                                                return (
                                                    <td key="email" {...tdProps(candidate.id, 'email')}>
                                                        {editingCell?.candidateId === candidate.id && editingCell?.field === 'email' ? (
                                                            <input type="email" value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={() => handleSaveEdit(candidate.id, 'email')} onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(candidate.id, 'email'); if (e.key === 'Escape') handleCancelEdit(); }} autoFocus className="w-full px-2 py-1 border border-primary-500 rounded focus:ring-2 focus:ring-primary-500" />
                                                        ) : displayEmail ? (
                                                            <a href={`mailto:${displayEmail}`} onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => { e.preventDefault(); handleStartEdit(candidate.id, 'email', displayEmail); }} className="text-blue-600 hover:text-blue-700 hover:underline" title="Doble clic para editar">{displayEmail}</a>
                                                        ) : (
                                                            <span className="text-gray-400 hover:bg-gray-50 px-1 py-0.5 rounded cursor-pointer" onDoubleClick={() => handleStartEdit(candidate.id, 'email', '')} title="Doble clic para editar">{displayCandidate.email && isPlaceholderImportEmail(displayCandidate.email) ? 'Sin email' : 'N/A'}</span>
                                                        )}
                                                    </td>
                                                );
                                            }
                                            if (colId === 'scoreIa') {
                                                return (
                                                    <td key="scoreIa" {...tdProps(candidate.id, 'scoreIa')}>
                                                        {displayCandidate.scoreIa !== undefined ? (
                                                            <span className={`font-semibold ${displayCandidate.scoreIa >= 70 ? 'text-green-600' : displayCandidate.scoreIa >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>{displayCandidate.scoreIa}</span>
                                                        ) : (
                                                            <span className="text-gray-400">-</span>
                                                        )}
                                                    </td>
                                                );
                                            }
                                            if (colId === 'status') {
                                                return (
                                                    <td key="status" {...tdProps(candidate.id, 'status')}>
                                                        {(() => {
                                                            if (displayCandidate.scoreIa === undefined) return <span className="text-gray-400">-</span>;
                                                            if (shouldApplyScoreAutoFilter(process?.bulkConfig)) {
                                                                return <span className="inline-flex items-center px-1 py-0 rounded text-xs bg-green-100 text-green-800">✅ Apto</span>;
                                                            }
                                                            if (displayCandidate.scoreIa >= 70) return <span className="inline-flex items-center px-1 py-0 rounded text-xs bg-green-100 text-green-800">✅ Alto</span>;
                                                            else if (displayCandidate.scoreIa >= 50) return <span className="inline-flex items-center px-1 py-0 rounded text-xs bg-yellow-100 text-yellow-800">⚠️ Medio</span>;
                                                            else return <span className="inline-flex items-center px-1 py-0 rounded text-xs bg-red-100 text-red-800">❌ Bajo</span>;
                                                        })()}
                                                    </td>
                                                );
                                            }
                                            if (colId === 'phone') {
                                                return (
                                                    <td key="phone" {...tdProps(candidate.id, 'phone')}>
                                                        {editingCell?.candidateId === candidate.id && editingCell?.field === 'phone' ? (
                                                            <input type="tel" value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={() => handleSaveEdit(candidate.id, 'phone')} onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(candidate.id, 'phone'); if (e.key === 'Escape') handleCancelEdit(); }} autoFocus className="w-full px-2 py-1 border border-primary-500 rounded focus:ring-2 focus:ring-primary-500" />
                                                        ) : (
                                                            <span className="hover:bg-gray-50 px-1 py-0.5 rounded cursor-pointer" onDoubleClick={() => handleStartEdit(candidate.id, 'phone', displayCandidate.phone || '')} title="Doble clic para editar">{displayCandidate.phone || 'N/A'}</span>
                                                        )}
                                                    </td>
                                                );
                                            }
                                            if (colId === 'source') {
                                                return (
                                                    <td key="source" {...tdProps(candidate.id, 'source')}>
                                                        {editingCell?.candidateId === candidate.id && editingCell?.field === 'source' ? (
                                                            <input type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={() => handleSaveEdit(candidate.id, 'source')} onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(candidate.id, 'source'); if (e.key === 'Escape') handleCancelEdit(); }} autoFocus className="w-full px-2 py-1 border border-primary-500 rounded focus:ring-2 focus:ring-primary-500" />
                                                        ) : (
                                                            <span className="hover:bg-gray-50 px-1 py-0.5 rounded cursor-pointer" onDoubleClick={() => handleStartEdit(candidate.id, 'source', displaySource)} title="Doble clic para editar">{displaySource || '-'}</span>
                                                        )}
                                                    </td>
                                                );
                                            }
                                            if (colId === 'province') {
                                                return (
                                                    <td key="province" {...tdProps(candidate.id, 'province')}>
                                                        {editingCell?.candidateId === candidate.id && editingCell?.field === 'province' ? (
                                                            <input type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={() => handleSaveEdit(candidate.id, 'province')} onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(candidate.id, 'province'); if (e.key === 'Escape') handleCancelEdit(); }} autoFocus className="w-full px-2 py-1 border border-primary-500 rounded focus:ring-2 focus:ring-primary-500" />
                                                        ) : (
                                                            <span className="hover:bg-gray-50 px-1 py-0.5 rounded cursor-pointer" onDoubleClick={() => handleStartEdit(candidate.id, 'province', displayProvince)} title="Doble clic para editar">{displayProvince || '-'}</span>
                                                        )}
                                                    </td>
                                                );
                                            }
                                            if (colId === 'district') {
                                                return (
                                                    <td key="district" {...tdProps(candidate.id, 'district')}>
                                                        {editingCell?.candidateId === candidate.id && editingCell?.field === 'district' ? (
                                                            <input type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={() => handleSaveEdit(candidate.id, 'district')} onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(candidate.id, 'district'); if (e.key === 'Escape') handleCancelEdit(); }} autoFocus className="w-full px-2 py-1 border border-primary-500 rounded focus:ring-2 focus:ring-primary-500" />
                                                        ) : (
                                                            <span className="hover:bg-gray-50 px-1 py-0.5 rounded cursor-pointer" onDoubleClick={() => handleStartEdit(candidate.id, 'district', displayDistrict)} title="Doble clic para editar">{displayDistrict || '-'}</span>
                                                        )}
                                                    </td>
                                                );
                                            }
                                            if (colId === 'lastInteraction') {
                                                return (
                                                    <td key="lastInteraction" {...tdProps(candidate.id, 'lastInteraction')}>
                                                        {displayCandidate.lastWhatsAppInteractionAt ? (
                                                            <span className="text-xs" title={new Date(displayCandidate.lastWhatsAppInteractionAt).toLocaleString('es-PE')}>{formatTimeAgo(displayCandidate.lastWhatsAppInteractionAt)}</span>
                                                        ) : (
                                                            <span className="text-gray-400 text-xs">Nunca</span>
                                                        )}
                                                    </td>
                                                );
                                            }
                                            if (colId === 'contact') {
                                                return (
                                                    <td key="contact" {...tdProps(candidate.id, 'contact')}>
                                                        <div className="flex gap-2 items-center">
                                                            {displayCandidate.phone && (
                                                                <>
                                                                    <button onClick={() => handleWhatsAppClick(displayCandidate.id, displayCandidate.phone!)} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-600 hover:text-green-700 hover:bg-green-50 rounded transition-colors" title="Abrir WhatsApp y registrar interacción"><MessageCircle className="w-4 h-4" /></button>
                                                                    {isMobile && <a href={`tel:${displayCandidate.phone.replace(/[^\d]/g, '')}`} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors" title="Llamar"><Phone className="w-4 h-4" /></a>}
                                                                </>
                                                            )}
                                                            {displayCandidate.email && <a href={`mailto:${displayCandidate.email}`} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors" title="Enviar correo"><Mail className="w-4 h-4" /></a>}
                                                            {!displayCandidate.phone && !displayCandidate.email && <span className="text-gray-400 text-xs">-</span>}
                                                        </div>
                                                    </td>
                                                );
                                            }
                                            if (colId === 'nextInterview') {
                                                return (
                                                    <td key="nextInterview" {...tdProps(candidate.id, 'nextInterview')}>
                                                        {displayCandidate.nextInterviewAt ? (
                                                            <div className="flex flex-col">
                                                                <span className="text-xs text-gray-900">{new Date(displayCandidate.nextInterviewAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}</span>
                                                                <span className="text-[10px] text-gray-500">{new Date(displayCandidate.nextInterviewAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-400 text-xs">-</span>
                                                        )}
                                                    </td>
                                                );
                                            }
                                            if (colId === 'schedule') {
                                                return (
                                                    <td key="schedule" {...tdProps(candidate.id, 'schedule')}>
                                                        <div className="relative">
                                                            <button onClick={() => setQuickScheduleCandidate(quickScheduleCandidate === candidate.id ? null : candidate.id)} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded transition-colors" title="Agendar entrevista rápidamente"><Calendar className="w-4 h-4" /></button>
                                                            {quickScheduleCandidate === candidate.id && (
                                                                <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-[280px]">
                                                                    <QuickScheduleInline candidateId={candidate.id} candidateName={candidate.name} onSchedule={async (date, time, interviewerId) => { await handleQuickSchedule(date, time, interviewerId); setQuickScheduleCandidate(null); await loadCandidates(currentPage, true); }} onCancel={() => setQuickScheduleCandidate(null)} />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                );
                                            }
                                            if (colId === 'stage') {
                                                return (
                                                    <td key="stage" {...tdProps(candidate.id, 'stage')}>
                                                        <select
                                                            value={displayCandidate.stageId}
                                                            onChange={(e) => updateCandidateStatus(candidate.id, { stageId: e.target.value }, candidate.stageId)}
                                                            onClick={(e) => e.stopPropagation()}
                                                            onMouseDown={(e) => e.stopPropagation()}
                                                            className="text-xs border border-primary-300 rounded px-1 py-0.5 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 bg-white min-w-[100px] max-w-[120px] cursor-pointer"
                                                            title="Selecciona la etapa del candidato"
                                                        >
                                                            {process?.stages.map(s => (
                                                                <option key={s.id} value={s.id}>{s.name}</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                );
                                            }
                                            if (colId.startsWith('custom_')) {
                                                const customColId = colId.replace('custom_', '');
                                                const col = customColumns.find(c => c.id === customColId);
                                                if (!col) return null;
                                                const fieldKey = `custom_${col.id}`;
                                                const value = getColumnValue(candidate.id, col.id, displayCandidate);
                                                const isEditing = editingCell?.candidateId === candidate.id && editingCell?.field === fieldKey;
                                                return (
                                                    <td
                                                        key={col.id}
                                                        {...tdProps(candidate.id, colId)}
                                                    >
                                                        {renderCellCommentIndicator(candidate.id, colId)}
                                                        {isEditing ? (
                                                            col.type === 'checkbox' ? (
                                                                <select
                                                                    value={editValue}
                                                                    onChange={(e) => setEditValue(e.target.value)}
                                                                    onBlur={() => handleSaveEdit(candidate.id, fieldKey)}
                                                                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(candidate.id, fieldKey); if (e.key === 'Escape') handleCancelEdit(); }}
                                                                    autoFocus
                                                                    className="w-full px-2 py-1 text-xs border border-primary-500 rounded focus:ring-1 focus:ring-primary-500"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    <option value="">-</option>
                                                                    <option value="true">Sí</option>
                                                                    <option value="false">No</option>
                                                                </select>
                                                            ) : col.type === 'select' && col.options ? (
                                                                <select
                                                                    value={editValue}
                                                                    onChange={(e) => setEditValue(e.target.value)}
                                                                    onBlur={() => handleSaveEdit(candidate.id, fieldKey)}
                                                                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(candidate.id, fieldKey); if (e.key === 'Escape') handleCancelEdit(); }}
                                                                    autoFocus
                                                                    className="w-full px-2 py-1 text-xs border border-primary-500 rounded focus:ring-1 focus:ring-primary-500"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    <option value="">-</option>
                                                                    {col.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                                </select>
                                                            ) : (
                                                                <input
                                                                    type={col.type === 'number' ? 'number' : 'text'}
                                                                    value={editValue}
                                                                    onChange={(e) => setEditValue(e.target.value)}
                                                                    onBlur={() => handleSaveEdit(candidate.id, fieldKey)}
                                                                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(candidate.id, fieldKey); if (e.key === 'Escape') handleCancelEdit(); }}
                                                                    autoFocus
                                                                    placeholder={col.type === 'date' ? 'DD/MM/AAAA' : '-'}
                                                                    className="w-full px-2 py-1 text-xs border border-primary-500 rounded focus:ring-1 focus:ring-primary-500"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                />
                                                            )
                                                        ) : (
                                                            <span
                                                                className="text-gray-700 hover:bg-gray-50 px-1 py-0.5 rounded cursor-pointer inline-block min-w-[2rem]"
                                                                onDoubleClick={(e) => { e.stopPropagation(); handleStartEdit(candidate.id, fieldKey, value); }}
                                                                title="Doble clic para editar"
                                                            >
                                                                {formatCustomCellDisplay(value, col)}
                                                            </span>
                                                        )}
                                                    </td>
                                                );
                                            }
                                            return null;
                                        })}
                                        <td className={`${COMPACT_TD_CLASS} bg-white`} onClick={(e) => e.stopPropagation()}>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => updateCandidateStatus(candidate.id, {
                                                        stageId: process?.stages[process.stages.length - 1]?.id,
                                                    }, candidate.stageId)}
                                                    className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                                                    title="Aprobar"
                                                >
                                                    <Check className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => updateCandidateStatus(candidate.id, { discarded: true })}
                                                    className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                    title="Rechazar"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteCandidate(candidate.id, candidate.name)}
                                                    className="p-1 text-gray-600 hover:bg-gray-50 rounded transition-colors"
                                                    title="Eliminar permanentemente"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        </table>
                    </div>

                    {isLoading && (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
                            <span className="ml-2 text-gray-600">Cargando...</span>
                        </div>
                    )}

                    {!isLoading && candidates.length === 0 && (
                        <div className="text-center py-12">
                            <p className="text-gray-500">No hay candidatos para mostrar</p>
                        </div>
                    )}

                    {hasMore && !isLoading && (
                        <div className="text-center py-4">
                            <button
                                onClick={() => loadCandidates(currentPage + 1, false)}
                                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                            >
                                Cargar más ({total - candidates.length} restantes)
                            </button>
                        </div>
                    )}
                </div>
            )}

            <BulkActionsFAB
                selectedIds={Array.from(selectedIds)}
                onApprove={handleBulkApprove}
                onReject={handleBulkReject}
                onArchive={handleBulkArchive}
                onWebhook={handleWebhook}
                onDelete={handleBulkDelete}
                onWhatsApp={() => setShowWhatsAppModal(true)}
                onEmail={() => setShowEmailModal(true)}
                onBulkSchedule={() => setShowBulkScheduleModal(true)}
                showPsychReport={psycholaboralActive}
                onPsychReport={() =>
                    openPsychReport(candidates.filter(c => selectedIds.has(c.id)))
                }
                onPsychBulkEvaluate={() =>
                    openPsychBulkEvaluate(candidates.filter(c => selectedIds.has(c.id)))
                }
            />

            <CandidateDrawer
                candidate={drawerCandidate}
                isOpen={isDrawerOpen}
                onClose={() => {
                    setIsDrawerOpen(false);
                    setDrawerCandidate(null);
                }}
                onLoadDetails={async (candidateId) => {
                    const details = await bulkCandidatesApi.getCandidateDetails(candidateId);
                    setDrawerCandidate(details);
                }}
                process={process}
                showPsychReport={psycholaboralActive}
                onPsychReport={c => openPsychReport([c])}
            />

            {showProcessModal && (
                <BulkProcessEditorModal
                    process={editingProcess}
                    onClose={() => {
                        setShowProcessModal(false);
                        setEditingProcess(null);
                    }}
                    onSave={handleProcessSaved}
                />
            )}

            {cellContextMenu && (
                <BulkCellContextMenu
                    x={cellContextMenu.x}
                    y={cellContextMenu.y}
                    candidateId={cellContextMenu.candidateId}
                    colId={cellContextMenu.colId}
                    meta={getCellMetaFor(cellContextMenu.candidateId, cellContextMenu.colId)}
                    selectedCellKeys={Array.from(selectedCells)}
                    onClose={() => setCellContextMenu(null)}
                    onApply={(candidateIds, colIds, patch) => {
                        applyCellMeta(candidateIds, colIds, patch);
                    }}
                />
            )}

            {showImportModal && process && (
                <BulkProcessImportModal
                    process={process}
                    onClose={() => setShowImportModal(false)}
                    onImportComplete={() => {
                        setShowImportModal(false);
                        if (process?.id) {
                            const savedValues = localStorage.getItem(getColumnValuesStorageKey(process.id));
                            const parsedValues = savedValues ? JSON.parse(savedValues) : {};
                            const repairedValues = repairDateColumnValues(parsedValues, customColumns);
                            setColumnValues(repairedValues);
                            if (repairedValues !== parsedValues) {
                                localStorage.setItem(getColumnValuesStorageKey(process.id), JSON.stringify(repairedValues));
                            }
                        }
                        loadCandidates(0, true);
                    }}
                />
            )}

            {showWhatsAppModal && (
                <BulkWhatsAppModal
                    isOpen={showWhatsAppModal}
                    onClose={() => setShowWhatsAppModal(false)}
                    candidates={candidates.filter(c => selectedIds.has(c.id))}
                    onSend={handleBulkWhatsApp}
                />
            )}

            {showEmailModal && (
                <BulkEmailModal
                    isOpen={showEmailModal}
                    onClose={() => setShowEmailModal(false)}
                    candidates={candidates.filter(c => selectedIds.has(c.id))}
                    onSend={handleBulkEmail}
                />
            )}

            {showScheduleModal && schedulingCandidate && (
                <QuickScheduleModal
                    isOpen={showScheduleModal}
                    onClose={() => {
                        setShowScheduleModal(false);
                        setSchedulingCandidate(null);
                    }}
                    candidateId={schedulingCandidate.id}
                    candidateName={schedulingCandidate.name}
                    onSchedule={handleQuickSchedule}
                />
            )}

            {showBulkScheduleModal && (
                <BulkScheduleModal
                    isOpen={showBulkScheduleModal}
                    onClose={() => setShowBulkScheduleModal(false)}
                    candidateCount={selectedIds.size}
                    onSchedule={handleBulkSchedule}
                />
            )}

            {showAddColumnModal && (
                <AddColumnModal
                    isOpen={showAddColumnModal}
                    onClose={() => {
                        setShowAddColumnModal(false);
                        setEditingColumn(null);
                    }}
                    onAdd={handleAddColumn}
                    editingColumn={editingColumn}
                    onEdit={handleEditColumn}
                />
            )}

            {showTemplateModal && (
                <TableTemplateModal
                    isOpen={showTemplateModal}
                    onClose={() => setShowTemplateModal(false)}
                    currentColumns={customColumns}
                    onLoadTemplate={handleLoadTemplate}
                />
            )}

            {showPsychInventoryModal && (
                <PsycholaboralInventoryModal
                    isOpen={showPsychInventoryModal}
                    onClose={() => setShowPsychInventoryModal(false)}
                    onSaved={setPsychInventory}
                />
            )}

            {showProcessDocsModal && docsModalProcess && (
                <BulkProcessAttachmentsModal
                    isOpen={showProcessDocsModal}
                    onClose={() => {
                        setShowProcessDocsModal(false);
                        setDocsModalProcess(null);
                    }}
                    processId={docsModalProcess.id}
                    processTitle={docsModalProcess.title}
                    initialAttachments={docsModalProcess.attachments}
                    googleDriveFolderId={docsModalProcess.googleDriveFolderId}
                    googleDriveConfig={state.settings?.googleDrive}
                />
            )}

            {showPsychReportModal && process && psychReportCandidates.length > 0 && (
                <PsycholaboralReportModal
                    isOpen={showPsychReportModal}
                    onClose={() => {
                        setShowPsychReportModal(false);
                        setPsychReportCandidates([]);
                    }}
                    candidates={psychReportCandidates}
                    process={process}
                    inventory={psychInventory}
                />
            )}

            {showPsychBulkModal && process && psychBulkCandidates.length > 0 && (
                <PsycholaboralBulkEvaluateModal
                    isOpen={showPsychBulkModal}
                    onClose={() => {
                        setShowPsychBulkModal(false);
                        setPsychBulkCandidates([]);
                    }}
                    candidates={psychBulkCandidates}
                    process={process}
                    inventory={psychInventory}
                />
            )}
        </div>
    );
};
