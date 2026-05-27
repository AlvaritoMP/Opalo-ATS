import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAppState } from '../App';
import { bulkCandidatesApi, BulkCandidate } from '../lib/api/bulkCandidates';
import { bulkProcessActivityApi, BulkActivityActionType } from '../lib/api/bulkProcessActivity';
import { contactTrackingApi, type ResetContactTrackingResult } from '../lib/api/contactTracking';
import { isContactCooldownActive } from '../lib/contactTracking';
import { supabase } from '../lib/supabase';
import {
    columnIdToAttemptChannel,
    CONTACT_COLUMN_IDS,
    type ContactAttemptChannel,
    type ChannelContactSummary,
    readChannelSummaryFromRow,
} from '../lib/contactChannelConfig';
import { processesApi } from '../lib/api/processes';
import { useDebouncedValue } from '../lib/useDebouncedValue';
import { Check, X, Loader2, Send, Archive, Search, ChevronDown, ChevronUp, Plus, Edit, Trash2, ArrowLeft, MessageCircle, Phone, Upload, Download, Filter, Mail, Calendar, Settings, ArrowUp, ArrowDown, Pin, FileText, BookOpen, Paperclip, ClipboardList, ListPlus, RefreshCw, HardDrive, CaseSensitive, Package, History, Target } from 'lucide-react';
import { BulkCandidateTimeline } from './BulkCandidateTimeline';
import { Process, CustomColumn, BulkProcessConfig, Candidate, IdealProfileConfig } from '../types';
import { candidatesApi } from '../lib/api/candidates';
import {
    BASE_COLUMNS,
    DEFAULT_COLUMN_ORDER,
    buildAllColumnIds,
    getColumnLabel,
    getColumnValuesStorageKey,
    getColumnValuesBackupStorageKey,
    loadLocalColumnValuesForProcess,
    mergeColumnValueSources,
    discoverOrphanKeyAliases,
    persistLocalColumnValues,
    resolveColumnOrder,
    formatBulkDate,
    normalizeBulkDateInput,
    isScoreIaColumnVisible,
    isProfileMatchColumnVisible,
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
    mergeColumnValuesFromCandidates,
    normalizeBulkColumnValueKeys,
    buildLegacyColumnIdToName,
    enrichBulkColumnValuesForStorage,
    resolveColumnValueFromRow,
    hasBulkCellValue,
    normalizeColumnNameKey,
    formatBulkDateTime,
    isoToDatetimeLocalValue,
    datetimeLocalToIso,
    parseBulkDateTimeInput,
    COMPACT_TD_CLASS,
    COMPACT_TH_CLASS,
    getStickyColumnStyle,
    getColumnWidth,
    getColumnWidthStyle,
    CHECKBOX_COL_WIDTH,
    getBulkSelectedProcessId,
    setBulkSelectedProcessId,
} from '../lib/bulkTableColumns';
import { getStageSelectClass } from '../lib/stageColors';
import { getCellMetaStorageKey, BulkCellMeta, BulkCellMetaStore } from '../lib/bulkCellMeta';
import { BulkCellContextMenu } from './BulkCellContextMenu';
import { BulkProcessEditorModal } from './BulkProcessEditorModal';
import { BulkProcessImportModal } from './BulkProcessImportModal';
import { BulkColumnRecoveryModal } from './BulkColumnRecoveryModal';
import { BulkAddRowModal } from './BulkAddRowModal';
import { BulkWhatsAppModal } from './BulkWhatsAppModal';
import { BulkEmailModal } from './BulkEmailModal';
import { QuickScheduleModal } from './QuickScheduleModal';
import { BulkScheduleModal } from './BulkScheduleModal';
import { AddColumnModal } from './AddColumnModal';
import { TableTemplateModal, BulkTableTemplateLayout } from './TableTemplateModal';
import { PsycholaboralReportModal } from './PsycholaboralReportModal';
import { PsycholaboralBulkEvaluateModal } from './PsycholaboralBulkEvaluateModal';
import { PsycholaboralInventoryModal } from './PsycholaboralInventoryModal';
import { BulkIdealProfileModal } from './BulkIdealProfileModal';
import { BulkIdealProfileSummaryPanel } from './BulkIdealProfileSummaryPanel';
import {
    computeProfileMatch,
    computeProfileMatchSummary,
    getProfileMatchGradientStyle,
} from '../lib/bulkIdealProfileMatch';
import { psycholaboralApi } from '../lib/api/psycholaboral';
import { createDefaultPsycholaboralInventory } from '../lib/psycholaboralDefaults';
import { PsycholaboralInventory } from '../types';
import { isPsycholaboralEnabled } from '../lib/psycholaboralUtils';
import { BulkProcessCard } from './BulkProcessCard';
import { BulkProcessAttachmentsModal } from './BulkProcessAttachmentsModal';
import { BulkTableExportModal } from './BulkTableExportModal';
import { buildBulkSelectionClipboardText } from '../lib/bulkTableExport';
import { BulkProcessActivityLog } from './BulkProcessActivityLog';
import { BulkContactStatusCell } from './BulkContactStatusCell';
import { SendToOpsFlowModal } from './SendToOpsFlowModal';
import { BulkCandidateOpsFlowPanel } from './BulkCandidateOpsFlowPanel';
import { BulkRouteCell } from './BulkRouteCell';
import { buildRouteColumnLink } from '../lib/transitRouteLinks';

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

const MIN_BULK_COL_WIDTH = 48;
const MAX_BULK_COL_WIDTH = 600;

const BulkTh: React.FC<{
    colId: string;
    style?: React.CSSProperties;
    headerProps: React.ThHTMLAttributes<HTMLTableCellElement>;
    onResizeStart: (e: React.MouseEvent, colId: string) => void;
    children: React.ReactNode;
}> = ({ colId, style, headerProps, onResizeStart, children }) => (
    <th {...headerProps} style={style} className={`${headerProps.className ?? ''} relative`.trim()}>
        {children}
        <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Redimensionar columna"
            className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-primary-400/80 active:bg-primary-500 z-30 touch-none"
            onMouseDown={(e) => onResizeStart(e, colId)}
            onClick={(e) => e.stopPropagation()}
            onDragStart={(e) => e.preventDefault()}
        />
    </th>
);

type CandidateDrawerTab = 'details' | 'timeline';

// Drawer lateral para mostrar detalles del candidato
const CandidateDrawer: React.FC<{
    candidate: BulkCandidate | null;
    isOpen: boolean;
    onClose: () => void;
    onLoadDetails: (candidateId: string) => Promise<void>;
    process?: Process;
    onPsychReport?: (candidate: BulkCandidate) => void;
    showPsychReport?: boolean;
    showOpsFlow?: boolean;
    onOpsFlowSend?: () => void;
    opsFlowRefreshToken?: number;
    activityLogRefreshToken?: number;
    userNameById?: Map<string, string>;
}> = ({ candidate, isOpen, onClose, onLoadDetails, process, onPsychReport, showPsychReport, showOpsFlow, onOpsFlowSend, opsFlowRefreshToken = 0, activityLogRefreshToken = 0, userNameById }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [fullCandidate, setFullCandidate] = useState<BulkCandidate | null>(null);
    const [activeTab, setActiveTab] = useState<CandidateDrawerTab>('timeline');

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
            setActiveTab('timeline');
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
                <div className="sticky top-0 bg-white border-b z-10">
                    <div className="px-6 py-4 flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-gray-900">{displayCandidate.name}</h2>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>
                    <div className="flex border-t border-gray-100">
                        <button
                            type="button"
                            onClick={() => setActiveTab('timeline')}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                                activeTab === 'timeline'
                                    ? 'border-primary-600 text-primary-700 bg-primary-50/50'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                            <History className="w-4 h-4" />
                            Línea de tiempo
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('details')}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                                activeTab === 'details'
                                    ? 'border-primary-600 text-primary-700 bg-primary-50/50'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                            <FileText className="w-4 h-4" />
                            Detalles
                        </button>
                    </div>
                </div>
                <div className="p-6 space-y-6">
                    {activeTab === 'timeline' && candidate && (
                        <BulkCandidateTimeline
                            candidateId={candidate.id}
                            process={process}
                            userNameById={userNameById}
                            refreshToken={activityLogRefreshToken + opsFlowRefreshToken}
                        />
                    )}
                    {activeTab === 'details' && isLoading && (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
                            <span className="ml-2 text-gray-600">Cargando detalles...</span>
                        </div>
                    )}
                    {activeTab === 'details' && !isLoading && (
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
                            {showOpsFlow && candidate && onOpsFlowSend && (
                                <BulkCandidateOpsFlowPanel
                                    candidateId={candidate.id}
                                    candidateName={displayCandidate.name}
                                    onSend={onOpsFlowSend}
                                    refreshToken={opsFlowRefreshToken}
                                />
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
    onOpsFlow?: () => void;
    showOpsFlow?: boolean;
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
    onOpsFlow,
    showOpsFlow,
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
                    {showOpsFlow && onOpsFlow && (
                    <button onClick={() => { onOpsFlow(); setIsOpen(false); }} className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg shadow-lg hover:bg-orange-700 transition-colors">
                        <Package className="w-4 h-4" /> Enviar a OpsFlow ({selectedIds.length})
                    </button>
                    )}
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
    const [selectedProcess, setSelectedProcess] = useState<string>(() => getBulkSelectedProcessId() ?? '');
    const [selectedStage, setSelectedStage] = useState<string>('');
    const [searchInput, setSearchInput] = useState('');
    const debouncedSearch = useDebouncedValue(searchInput, 400);
    const [drawerCandidate, setDrawerCandidate] = useState<BulkCandidate | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [optimisticUpdates, setOptimisticUpdates] = useState<Map<string, Partial<BulkCandidate>>>(new Map());
    const [showProcessModal, setShowProcessModal] = useState(false);
    const [editingProcess, setEditingProcess] = useState<Process | null>(null);
    const [showImportModal, setShowImportModal] = useState(false);
    const [importRestoreMode, setImportRestoreMode] = useState(false);
    const [showRecoveryModal, setShowRecoveryModal] = useState(false);
    const [showAddRowModal, setShowAddRowModal] = useState(false);
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
    const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
    const columnWidthsRef = useRef<Record<string, number>>({});
    const resizeSessionRef = useRef<{ colId: string; startX: number; startWidth: number } | null>(null);
    const [columnOrder, setColumnOrder] = useState<string[]>(DEFAULT_COLUMN_ORDER);
    const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
    const [columnValues, setColumnValues] = useState<Record<string, Record<string, any>>>({});
    const [cellMeta, setCellMeta] = useState<BulkCellMetaStore>({});
    const [cellContextMenu, setCellContextMenu] = useState<{ x: number; y: number; candidateId: string; colId: string } | null>(null);
    const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
    const [sortColumn, setSortColumn] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [activeCell, setActiveCell] = useState<CellCoord | null>(null);
    const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
    const [selectionAnchor, setSelectionAnchor] = useState<CellCoord | null>(null);
    const tableContainerRef = useRef<HTMLDivElement>(null);
    const columnValuesMigratedRef = useRef<string | null>(null);
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
    const [showExportModal, setShowExportModal] = useState(false);
    const [showIdealProfileModal, setShowIdealProfileModal] = useState(false);
    const [allCandidatesForStats, setAllCandidatesForStats] = useState<BulkCandidate[]>([]);
    const [loadingProfileStats, setLoadingProfileStats] = useState(false);
    const [isNormalizingTextCase, setIsNormalizingTextCase] = useState(false);
    const [activityLogRefreshToken, setActivityLogRefreshToken] = useState(0);
    const [showOpsFlowModal, setShowOpsFlowModal] = useState(false);
    const [opsFlowCandidates, setOpsFlowCandidates] = useState<Candidate[]>([]);
    const [opsFlowRefreshToken, setOpsFlowRefreshToken] = useState(0);
    const [opsFlowModalLoading, setOpsFlowModalLoading] = useState(false);
    const tableKeyboardRef = useRef({
        editingCell: null as { candidateId: string; field: string } | null,
        activeCell: null as CellCoord | null,
        selectionAnchor: null as CellCoord | null,
        displayCandidates: [] as BulkCandidate[],
        visibleColumns: [] as string[],
    });

    const pageSize = 50;

    const process = useMemo(() => {
        if (!selectedProcess) return undefined;
        return bulkProcesses.find(p => p.id === selectedProcess);
    }, [selectedProcess, bulkProcesses]);

    const psycholaboralActive = useMemo(
        () => isPsycholaboralEnabled(process?.bulkConfig?.psycholaboral),
        [process?.bulkConfig?.psycholaboral]
    );

    const canSendToOpsFlow = state.currentUser?.role === 'admin' || state.currentUser?.role === 'recruiter';

    const userNameById = useMemo(() => {
        const map = new Map<string, string>();
        for (const u of state.users) {
            map.set(u.id, u.name);
        }
        return map;
    }, [state.users]);

    const logActivity = useCallback((
        actionType: BulkActivityActionType,
        payload: {
            candidateId?: string;
            candidateName?: string;
            fieldName?: string;
            oldValue?: string;
            newValue?: string;
            details?: Record<string, unknown>;
        } = {}
    ) => {
        if (!process?.id) return;
        void bulkProcessActivityApi.log({
            processId: process.id,
            actionType,
            userId: state.currentUser?.id,
            userName: state.currentUser?.name || state.currentUser?.email,
            ...payload,
        });
        setActivityLogRefreshToken(t => t + 1);
    }, [process?.id, state.currentUser?.id, state.currentUser?.name, state.currentUser?.email]);

    const getFieldLabel = useCallback((fieldOrColId: string) => {
        if (fieldOrColId.startsWith('custom_')) {
            const colId = fieldOrColId.replace('custom_', '');
            return customColumns.find(c => c.id === colId)?.name || fieldOrColId;
        }
        return getColumnLabel(fieldOrColId, customColumns);
    }, [customColumns]);

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
                        counts[p.id] = await processesApi.getAttachmentsCountDb(p.id);
                    } catch {
                        counts[p.id] = p.attachments?.length ?? 0;
                    }
                })
            );
            setAttachmentCounts(counts);
        };
        loadCounts();
    }, [bulkProcesses]);

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
        let mergedUpdates = { ...updates };
        if (updates.customColumns) {
            const aliases: Record<string, string> = {
                ...(process.bulkConfig?.columnKeyAliases || {}),
            };
            for (const col of process.bulkConfig?.customColumns || []) {
                aliases[col.id] = col.name;
            }
            for (const col of updates.customColumns) {
                aliases[col.id] = col.name;
            }
            mergedUpdates = { ...mergedUpdates, columnKeyAliases: aliases };
        }
        const newBulkConfig: BulkProcessConfig = {
            ...process.bulkConfig,
            ...mergedUpdates,
        };
        try {
            await processesApi.update(process.id, { bulkConfig: newBulkConfig });
            setBulkProcesses(prev => prev.map(p =>
                p.id === process.id ? { ...p, bulkConfig: newBulkConfig } : p
            ));
            const configKeys = Object.keys(mergedUpdates);
            if (configKeys.length > 0) {
                logActivity('config_change', {
                    details: { summary: `Configuración: ${configKeys.join(', ')}` },
                });
            }
        } catch (error) {
            console.error('Error guardando configuración de tabla:', error);
            actions.showToast('Error al guardar configuración de columnas', 'error', 3000);
        }
    }, [process, actions, logActivity]);

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
        const savedWidths = config?.columnWidths || {};
        setColumnWidths(savedWidths);
        columnWidthsRef.current = savedWidths;
        setColumnOrder(resolveColumnOrder(config, cols));
        setColumnFilters({});
        columnValuesMigratedRef.current = null;

        // Si hay perfil ideal activo, asegurar columna % Perfil visible en el orden
        if (config?.idealProfile?.enabled && config.columnOrder && !config.columnOrder.includes('profileMatch')) {
            const order = [...config.columnOrder];
            const scoreIdx = order.indexOf('scoreIa');
            if (scoreIdx >= 0) order.splice(scoreIdx + 1, 0, 'profileMatch');
            else order.splice(1, 0, 'profileMatch');
            const hidden = (config.hiddenColumns || []).filter(id => id !== 'profileMatch');
            setColumnOrder(order);
            setHiddenColumns(hidden);
            void persistBulkConfig({ columnOrder: order, hiddenColumns: hidden });
        }

        const legacy = buildLegacyColumnIdToName(config, cols);
        const localValues = loadLocalColumnValuesForProcess(process.id);
        if (Object.keys(localValues).length > 0) {
            const normalized = normalizeBulkColumnValueKeys(localValues, cols, legacy);
            setColumnValues(repairDateColumnValues(normalized, cols));
        } else {
            setColumnValues({});
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

    const idealProfileConfig = process?.bulkConfig?.idealProfile;
    const profileMatchColumnVisible = useMemo(
        () => isProfileMatchColumnVisible(process?.bulkConfig),
        [process?.bulkConfig]
    );

    const profileMatchScores = useMemo(() => {
        const scores = new Map<string, number>();
        const details = new Map<string, string>();
        if (!idealProfileConfig?.enabled) return { scores, details };
        const legacy = buildLegacyColumnIdToName(process?.bulkConfig, customColumns);
        for (const c of candidates) {
            const result = computeProfileMatch(
                c,
                idealProfileConfig,
                customColumns,
                columnValues,
                legacy
            );
            if (result) {
                scores.set(c.id, result.score);
                details.set(
                    c.id,
                    result.fieldScores.map(f => `${f.label}: ${f.score}%`).join('\n')
                );
            }
        }
        return { scores, details };
    }, [candidates, idealProfileConfig, customColumns, columnValues, process?.bulkConfig]);

    useEffect(() => {
        if (!process?.id || !idealProfileConfig?.enabled) {
            setAllCandidatesForStats([]);
            return;
        }
        let cancelled = false;
        setLoadingProfileStats(true);
        bulkCandidatesApi
            .getAllCandidates(process.id)
            .then(all => {
                if (!cancelled) setAllCandidatesForStats(all);
            })
            .catch(() => {
                if (!cancelled) setAllCandidatesForStats([]);
            })
            .finally(() => {
                if (!cancelled) setLoadingProfileStats(false);
            });
        return () => {
            cancelled = true;
        };
    }, [process?.id, idealProfileConfig?.enabled, idealProfileConfig, total, columnValues]);

    const profileMatchSummary = useMemo(() => {
        if (!idealProfileConfig?.enabled) return null;
        const legacy = buildLegacyColumnIdToName(process?.bulkConfig, customColumns);
        const pool = allCandidatesForStats.length > 0 ? allCandidatesForStats : candidates;
        return computeProfileMatchSummary(
            pool,
            idealProfileConfig,
            customColumns,
            columnValues,
            legacy
        );
    }, [
        idealProfileConfig,
        allCandidatesForStats,
        candidates,
        customColumns,
        columnValues,
        process?.bulkConfig,
    ]);

    const handleSaveIdealProfile = useCallback(async (config: IdealProfileConfig) => {
        if (!process) return;
        let newHidden = hiddenColumns.filter(id => id !== 'profileMatch');
        let newOrder = [...columnOrder];
        if (config.enabled && !newOrder.includes('profileMatch')) {
            const scoreIdx = newOrder.indexOf('scoreIa');
            if (scoreIdx >= 0) {
                newOrder.splice(scoreIdx + 1, 0, 'profileMatch');
            } else {
                const nameIdx = newOrder.indexOf('name');
                newOrder.splice(nameIdx >= 0 ? nameIdx + 1 : 0, 0, 'profileMatch');
            }
        }
        setHiddenColumns(newHidden);
        setColumnOrder(newOrder);
        await persistBulkConfig({
            idealProfile: config,
            hiddenColumns: newHidden,
            columnOrder: newOrder,
        });
        setBulkProcesses(prev =>
            prev.map(p =>
                p.id === process.id
                    ? { ...p, bulkConfig: { ...p.bulkConfig, idealProfile: config, hiddenColumns: newHidden, columnOrder: newOrder } }
                    : p
            )
        );
        logActivity('config_change', {
            details: { summary: config.enabled ? 'Perfil ideal activado/actualizado' : 'Perfil ideal desactivado' },
        });
        actions.showToast('Perfil ideal guardado', 'success', 2500);
    }, [process, hiddenColumns, columnOrder, persistBulkConfig, logActivity, actions]);

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
            const savedSelection = getBulkSelectedProcessId();
            if (filteredProcesses.length > 0) {
                if (savedSelection === null && !selectedProcess) {
                    setSelectedProcess(filteredProcesses[0].id);
                    setBulkSelectedProcessId(filteredProcesses[0].id);
                } else if (
                    savedSelection &&
                    filteredProcesses.some(p => p.id === savedSelection) &&
                    selectedProcess !== savedSelection
                ) {
                    setSelectedProcess(savedSelection);
                }
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

    useEffect(() => {
        setBulkSelectedProcessId(selectedProcess);
    }, [selectedProcess]);

    const legacyColumnIdToName = useMemo(
        () => buildLegacyColumnIdToName(process?.bulkConfig, customColumns),
        [process?.bulkConfig, customColumns]
    );

    const syncColumnValuesFromDatabase = useCallback(async (processId: string) => {
        const cols = process?.bulkConfig?.customColumns || [];
        try {
            const fromDb = await bulkCandidatesApi.loadAllBulkColumnValues(processId);
            let legacy = buildLegacyColumnIdToName(process?.bulkConfig, cols);
            legacy = discoverOrphanKeyAliases(fromDb, cols, legacy);

            const newAliases = { ...(process?.bulkConfig?.columnKeyAliases || {}) };
            let aliasesChanged = false;
            for (const [id, name] of Object.entries(legacy)) {
                if (newAliases[id] !== name) {
                    newAliases[id] = name;
                    aliasesChanged = true;
                }
            }
            if (aliasesChanged && process) {
                void persistBulkConfig({ columnKeyAliases: newAliases });
            }

            const localValues = loadLocalColumnValuesForProcess(processId);
            const merged = mergeColumnValueSources(fromDb, localValues, cols, legacy);
            const scopedMerged = Object.fromEntries(
                Object.entries(merged).filter(([id]) => id in fromDb)
            );
            const repaired = repairDateColumnValues(scopedMerged, cols);
            setColumnValues(repaired);
            persistLocalColumnValues(processId, repaired);

            const repairs: Record<string, Record<string, unknown>> = {};
            for (const [candidateId, row] of Object.entries(scopedMerged)) {
                const raw = fromDb[candidateId] || {};
                const needsRepair = cols.some(col => {
                    const resolved = resolveColumnValueFromRow(row, col, legacy);
                    if (resolved === undefined || resolved === '') return false;
                    return raw[col.id] === undefined || raw[col.id] === '';
                });
                if (needsRepair) {
                    repairs[candidateId] = enrichBulkColumnValuesForStorage(row, cols);
                }
            }
            if (Object.keys(repairs).length > 0) {
                void bulkCandidatesApi.batchSetBulkColumnValues(repairs, cols, { replace: true });
            }
        } catch (error) {
            console.error('Error sincronizando columnas personalizadas:', error);
        }
    }, [process?.bulkConfig, persistBulkConfig]);

    // Cargar candidatos (paginado; no escanea todo el proceso)
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
                    search: debouncedSearch || undefined,
                    archived: false,
                    discarded: false,
                }
            );

            const cols = process?.bulkConfig?.customColumns || [];
            const legacy = buildLegacyColumnIdToName(process?.bulkConfig, cols);

            if (reset) {
                setCandidates(result.candidates);
                setColumnValues(prev => mergeColumnValuesFromCandidates(
                    prev,
                    result.candidates,
                    cols,
                    legacy
                ));
            } else {
                setCandidates(prev => [...prev, ...result.candidates]);
                setColumnValues(prev => mergeColumnValuesFromCandidates(
                    prev,
                    result.candidates,
                    cols,
                    legacy
                ));
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
    }, [selectedProcess, selectedStage, debouncedSearch, actions, process?.bulkConfig]);

    const refreshFromDatabase = useCallback(async () => {
        if (!selectedProcess) return;
        await syncColumnValuesFromDatabase(selectedProcess);
        await loadCandidates(0, true);
    }, [selectedProcess, syncColumnValuesFromDatabase, loadCandidates]);

    const handleNormalizeTextCase = useCallback(async () => {
        if (!selectedProcess || !process) return;
        const ok = window.confirm(
            '¿Normalizar mayúsculas en todos los candidatos de este proceso?\n\n' +
            'Ejemplo: "CALLE Italia 325" → "Calle Italia 325".\n' +
            'Los cambios se guardan en la base de datos.'
        );
        if (!ok) return;

        setIsNormalizingTextCase(true);
        try {
            const cols = process.bulkConfig?.customColumns || [];
            const result = await bulkCandidatesApi.normalizeProcessTextCase(
                selectedProcess,
                cols,
                process.bulkConfig
            );
            await syncColumnValuesFromDatabase(selectedProcess);
            await loadCandidates(0, true);
            if (result.candidates === 0) {
                actions.showToast('No había celdas por normalizar', 'info', 3000);
            } else {
                actions.showToast(
                    `Texto normalizado: ${result.candidates} candidato(s), ${result.cells} celda(s)`,
                    'success',
                    4000
                );
            }
        } catch (error) {
            console.error('Error normalizando texto:', error);
            actions.showToast('Error al normalizar texto', 'error', 3000);
        } finally {
            setIsNormalizingTextCase(false);
        }
    }, [selectedProcess, process, syncColumnValuesFromDatabase, loadCandidates, actions]);

    // Al cambiar de proceso: sincronizar columnas completas una sola vez
    useEffect(() => {
        if (!selectedProcess) return;
        let cancelled = false;
        (async () => {
            await syncColumnValuesFromDatabase(selectedProcess);
            if (!cancelled) await loadCandidates(0, true);
        })();
        return () => { cancelled = true; };
    }, [selectedProcess]);

    // Sincronizar semáforo de contacto entre reclutadores en la misma lista
    useEffect(() => {
        if (!selectedProcess) return;

        const patchFromRow = (row: Record<string, unknown>) => {
            const id = row.id as string;
            if (!id) return;
            setCandidates(prev =>
                prev.map(c =>
                    c.id === id
                        ? {
                              ...c,
                              contactPhone: readChannelSummaryFromRow(row, 'call'),
                              contactWhatsapp: readChannelSummaryFromRow(row, 'whatsapp'),
                              contactEmail: readChannelSummaryFromRow(row, 'email'),
                          }
                        : c
                )
            );
        };

        const channel = supabase
            .channel(`bulk-contact-${selectedProcess}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'candidates',
                    filter: `process_id=eq.${selectedProcess}`,
                },
                (payload) => {
                    if (payload.new) patchFromRow(payload.new as Record<string, unknown>);
                }
            )
            .subscribe();

        return () => {
            void supabase.removeChannel(channel);
        };
    }, [selectedProcess]);

    const prevProcessForFilterRef = useRef<string | null>(null);

    // Filtros/búsqueda: solo recargar la página visible (sin escanear todo el proceso)
    useEffect(() => {
        if (!selectedProcess) return;
        if (prevProcessForFilterRef.current !== selectedProcess) {
            prevProcessForFilterRef.current = selectedProcess;
            return;
        }
        loadCandidates(0, true);
    }, [selectedStage, debouncedSearch, selectedProcess]);

    // Migrar valores que quedaron en localStorage hacia Supabase (sin borrar el respaldo local)
    useEffect(() => {
        if (!process?.id || candidates.length === 0) return;
        if (columnValuesMigratedRef.current === process.id) return;

        const storageKey = getColumnValuesStorageKey(process.id);
        const backupKey = getColumnValuesBackupStorageKey(process.id);
        const saved = localStorage.getItem(storageKey);
        if (!saved) {
            columnValuesMigratedRef.current = process.id;
            return;
        }

        localStorage.setItem(backupKey, saved);

        let localValues: Record<string, Record<string, any>>;
        try {
            localValues = JSON.parse(saved);
        } catch {
            columnValuesMigratedRef.current = process.id;
            return;
        }

        const legacy = buildLegacyColumnIdToName(process.bulkConfig, customColumns);
        const validCandidateIds = new Set(candidates.map(c => c.id));
        const toMigrate: Record<string, Record<string, unknown>> = {};
        for (const [candidateId, values] of Object.entries(localValues)) {
            if (!values) continue;
            if (!validCandidateIds.has(candidateId)) continue;
            const candidate = candidates.find(c => c.id === candidateId);
            if (!candidate) continue;
            const dbValues = (candidate?.bulkColumnValues || {}) as Record<string, unknown>;
            const patch: Record<string, unknown> = {};
            let hasNew = false;
            for (const [colId, val] of Object.entries(values)) {
                if (!hasBulkCellValue(val)) continue;
                const col =
                    customColumns.find(c => c.id === colId) ||
                    customColumns.find(c =>
                        legacy[colId] &&
                        normalizeColumnNameKey(c.name) === normalizeColumnNameKey(legacy[colId])
                    );
                if (col) {
                    const dbVal = resolveColumnValueFromRow(dbValues, col, legacy);
                    if (!hasBulkCellValue(dbVal)) {
                        patch[col.id] = val;
                        hasNew = true;
                    }
                } else if (!hasBulkCellValue(dbValues[colId])) {
                    patch[colId] = val;
                    hasNew = true;
                }
            }
            if (hasNew) {
                toMigrate[candidateId] = enrichBulkColumnValuesForStorage(
                    { ...dbValues, ...patch },
                    customColumns
                );
            }
        }

        if (Object.keys(toMigrate).length === 0) {
            const pruned = Object.fromEntries(
                Object.entries(localValues).filter(([id]) => validCandidateIds.has(id))
            );
            if (Object.keys(pruned).length !== Object.keys(localValues).length) {
                localStorage.setItem(storageKey, JSON.stringify(pruned));
            }
            columnValuesMigratedRef.current = process.id;
            return;
        }

        bulkCandidatesApi.batchSetBulkColumnValues(toMigrate, customColumns)
            .then(async () => {
                columnValuesMigratedRef.current = process.id;
                await syncColumnValuesFromDatabase(process.id);
                actions.showToast('Datos de columnas sincronizados a la nube', 'success', 3000);
            })
            .catch(err => {
                console.error('Error migrando columnValues a Supabase:', err);
                actions.showToast('No se pudieron migrar algunos datos de columnas. Ejecute MIGRATION_ADD_BULK_COLUMN_VALUES.sql en Supabase.', 'error', 6000);
            });
    }, [process?.id, process?.bulkConfig, candidates, customColumns, syncColumnValuesFromDatabase, actions]);

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
            const dbPatches: Record<string, Record<string, unknown>> = {};
            candidates.forEach(candidate => {
                if (candidate.age == null) return;
                ageColumns.forEach(col => {
                    const current = newValues[candidate.id]?.[col.id];
                    if (current !== undefined && current !== '' && current !== null) return;
                    if (!newValues[candidate.id]) newValues[candidate.id] = {};
                    newValues[candidate.id][col.id] = candidate.age;
                    if (!dbPatches[candidate.id]) {
                        dbPatches[candidate.id] = { ...(newValues[candidate.id]) };
                    } else {
                        dbPatches[candidate.id][col.id] = candidate.age;
                    }
                    updated = true;
                });
            });
            if (updated) {
                const enrichedPatches = Object.fromEntries(
                    Object.entries(dbPatches).map(([id, vals]) => [
                        id,
                        enrichBulkColumnValuesForStorage(vals, customColumns),
                    ])
                );
                void bulkCandidatesApi.batchSetBulkColumnValues(enrichedPatches, customColumns);
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
                const candidate = candidates.find(c => c.id === candidateId);
                const prevName = process?.stages.find(s => s.id === previousStageId)?.name || previousStageId;
                logActivity('stage_change', {
                    candidateId,
                    candidateName: candidate?.name,
                    fieldName: 'Etapa',
                    oldValue: prevName,
                    newValue: stageName || updates.stageId,
                });
            }
        } catch (error) {
            console.error('Error actualizando candidato:', error);
            loadCandidates(currentPage, true);
            actions.showToast('Error al actualizar candidato', 'error', 3000);
        }
    }, [applyOptimisticUpdate, loadCandidates, currentPage, actions, state.currentUser?.id, process?.stages, candidates, logActivity]);

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
            logActivity('bulk_approve', {
                details: { count: ids.length, summary: `Aprobación masiva de ${ids.length} candidato(s)` },
            });
        } catch (error) {
            console.error('Error aprobando candidatos:', error);
            loadCandidates(currentPage, true);
            actions.showToast('Error al aprobar candidatos', 'error', 3000);
        }
    }, [selectedIds, process, applyOptimisticUpdate, loadCandidates, currentPage, actions, logActivity]);

    const handleBulkReject = useCallback(async () => {
        if (selectedIds.size === 0) return;
        const ids = Array.from(selectedIds);
        ids.forEach(id => { applyOptimisticUpdate(id, { discarded: true }); });
        try {
            await bulkCandidatesApi.updateCandidatesBatch(ids, { discarded: true, discardReason: 'Rechazado en proceso masivo' });
            setSelectedIds(new Set());
            actions.showToast(`${ids.length} candidatos rechazados`, 'success', 3000);
            logActivity('bulk_discard', {
                details: { count: ids.length, summary: `Descarte masivo de ${ids.length} candidato(s)` },
            });
            loadCandidates(currentPage, true);
        } catch (error) {
            console.error('Error rechazando candidatos:', error);
            loadCandidates(currentPage, true);
            actions.showToast('Error al rechazar candidatos', 'error', 3000);
        }
    }, [selectedIds, applyOptimisticUpdate, loadCandidates, currentPage, actions, logActivity]);

    const handleBulkArchive = useCallback(async () => {
        if (selectedIds.size === 0) return;
        const ids = Array.from(selectedIds);
        ids.forEach(id => { applyOptimisticUpdate(id, { archived: true }); });
        try {
            await bulkCandidatesApi.updateCandidatesBatch(ids, { archived: true });
            setSelectedIds(new Set());
            actions.showToast(`${ids.length} candidatos archivados`, 'success', 3000);
            logActivity('bulk_archive', {
                details: { count: ids.length, summary: `Archivado masivo de ${ids.length} candidato(s)` },
            });
            loadCandidates(currentPage, true);
        } catch (error) {
            console.error('Error archivando candidatos:', error);
            loadCandidates(currentPage, true);
            actions.showToast('Error al archivar candidatos', 'error', 3000);
        }
    }, [selectedIds, applyOptimisticUpdate, loadCandidates, currentPage, actions, logActivity]);

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
            logActivity('candidate_delete', {
                details: { count: ids.length, summary: `Eliminación masiva de ${ids.length} candidato(s)` },
            });
        } catch (error) {
            console.error('Error eliminando candidatos:', error);
            loadCandidates(currentPage, true);
            actions.showToast('Error al eliminar candidatos', 'error', 3000);
        }
    }, [selectedIds, candidates, state.settings, loadCandidates, currentPage, actions, logActivity]);

    const CHANNEL_CANDIDATE_KEY: Record<ContactAttemptChannel, 'contactPhone' | 'contactWhatsapp' | 'contactEmail'> = {
        call: 'contactPhone',
        whatsapp: 'contactWhatsapp',
        email: 'contactEmail',
    };

    const handleContactSummaryChange = useCallback(
        (
            candidateId: string,
            candidateName: string | undefined,
            summary: ChannelContactSummary,
            actionType: 'contact_attempt' | 'contact_status',
            channel: ContactAttemptChannel
        ) => {
            const key = CHANNEL_CANDIDATE_KEY[channel];
            applyOptimisticUpdate(candidateId, { [key]: summary });
            const channelLabel = channel === 'call' ? 'Llamadas' : channel === 'whatsapp' ? 'WhatsApp' : 'Correo';
            logActivity(actionType, {
                candidateId,
                candidateName,
                fieldName: channelLabel,
                newValue: `${summary.status} (${summary.attemptCount} intentos)`,
            });
        },
        [applyOptimisticUpdate, logActivity]
    );

    const handleContactReset = useCallback(
        (
            candidateId: string,
            candidateName: string | undefined,
            channel: ContactAttemptChannel,
            result: ResetContactTrackingResult
        ) => {
            const empty: ChannelContactSummary = { status: 'por_contactar', attemptCount: 0 };
            const key = CHANNEL_CANDIDATE_KEY[channel];
            applyOptimisticUpdate(candidateId, { [key]: empty });
            const channelLabel =
                channel === 'call' ? 'Llamadas' : channel === 'whatsapp' ? 'WhatsApp' : 'Correo';
            const who = state.currentUser?.name || state.currentUser?.email || 'Usuario';
            logActivity('contact_reset', {
                candidateId,
                candidateName,
                fieldName: channelLabel,
                oldValue: `${result.clearedAttempts} registro(s) de contacto`,
                newValue: 'Sin seguimiento en este canal',
                details: {
                    summary: `${who} reinició el seguimiento de ${channelLabel}`,
                    clearedAttempts: result.clearedAttempts,
                    channel,
                    performedBy: who,
                    performedByUserId: state.currentUser?.id,
                },
            });
            actions.showToast(`${channelLabel} reiniciado`, 'success', 2500);
        },
        [
            applyOptimisticUpdate,
            logActivity,
            state.currentUser?.id,
            state.currentUser?.name,
            state.currentUser?.email,
            actions,
        ]
    );

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
            logActivity('candidate_delete', {
                candidateId,
                candidateName,
                details: { summary: `Eliminación de candidato` },
            });
        } catch (error) {
            console.error('Error eliminando candidato:', error);
            actions.showToast('Error al eliminar candidato', 'error', 3000);
        }
    }, [actions, logActivity]);

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

                    setTimeout(() => {
                        window.open(`https://wa.me/${cleanPhone}?text=${encodedMessage}`, '_blank');
                    }, openedCount * 500);
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

    const openScheduleModal = useCallback((candidate: BulkCandidate) => {
        setSchedulingCandidate({ id: candidate.id, name: candidate.name });
        setShowScheduleModal(true);
    }, []);

    const resolveNextInterviewEventId = useCallback((candidate: BulkCandidate): string | undefined => {
        if (candidate.nextInterviewEventId) return candidate.nextInterviewEventId;
        const now = Date.now();
        const match = state.interviewEvents
            .filter(e => e.candidateId === candidate.id && new Date(e.start).getTime() >= now)
            .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())[0];
        return match?.id;
    }, [state.interviewEvents]);

    const handleClearInterview = useCallback(async (candidate: BulkCandidate) => {
        const eventId = resolveNextInterviewEventId(candidate);
        if (!eventId) {
            actions.showToast('No hay entrevista agendada para eliminar', 'error', 2500);
            return;
        }
        if (!confirm(`¿Eliminar la entrevista agendada de ${candidate.name}?`)) return;

        applyOptimisticUpdate(candidate.id, {
            nextInterviewAt: undefined,
            nextInterviewerId: undefined,
            nextInterviewEventId: undefined,
        });

        try {
            await actions.deleteInterviewEvent(eventId);
            actions.showToast('Entrevista eliminada', 'success', 2500);
        } catch (error) {
            console.error('Error eliminando entrevista:', error);
            loadCandidates(currentPage, true);
            actions.showToast('Error al eliminar la entrevista', 'error', 3000);
        }
    }, [resolveNextInterviewEventId, applyOptimisticUpdate, actions, loadCandidates, currentPage]);

    const handleQuickSchedule = useCallback(async (date: string, time: string, interviewerId: string, notes?: string) => {
        const candidateId = schedulingCandidate?.id;
        if (!candidateId) return;

        const startDateTime = new Date(`${date}T${time}`);
        const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);

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
            applyOptimisticUpdate(candidateId, {
                nextInterviewAt: startDateTime.toISOString(),
                nextInterviewerId: interviewerId,
            });
            actions.showToast('Entrevista agendada exitosamente', 'success', 3000);
            await loadCandidates(currentPage, true);
        } catch (error) {
            console.error('Error agendando entrevista:', error);
            actions.showToast('Error al agendar la entrevista', 'error', 3000);
            throw error;
        }
    }, [schedulingCandidate, candidates, actions, applyOptimisticUpdate, loadCandidates, currentPage]);

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

    const openOpsFlowModal = useCallback(async (candidateIds: string[]) => {
        if (candidateIds.length === 0) return;
        setOpsFlowModalLoading(true);
        try {
            const loaded = await Promise.all(candidateIds.map(id => candidatesApi.getById(id)));
            const valid = loaded.filter((c): c is Candidate => c !== null);
            if (valid.length === 0) {
                actions.showToast('No se pudieron cargar los candidatos', 'error', 3000);
                return;
            }
            setOpsFlowCandidates(valid);
            setShowOpsFlowModal(true);
        } catch (error) {
            console.error('Error cargando candidatos para OpsFlow:', error);
            actions.showToast('Error al preparar el envío a OpsFlow', 'error', 3000);
        } finally {
            setOpsFlowModalLoading(false);
        }
    }, [actions]);

    const handleOpsFlowSent = useCallback(() => {
        for (const candidate of opsFlowCandidates) {
            logActivity('opsflow_send', {
                candidateId: candidate.id,
                candidateName: candidate.name,
                details: { via: 'bulk_process' },
            });
        }
        setOpsFlowRefreshToken(token => token + 1);
        setSelectedIds(new Set());
    }, [opsFlowCandidates, logActivity]);

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

    const handleEditProcess = async (process: Process) => {
        try {
            const fresh = await processesApi.getById(process.id);
            setEditingProcess(fresh || process);
        } catch {
            setEditingProcess(process);
        }
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

    const handleLoadTemplate = async (template: BulkTableTemplateLayout) => {
        if (!process) {
            actions.showToast('Seleccione un proceso antes de cargar la plantilla', 'error', 3000);
            return;
        }

        const idMap = new Map<string, string>();
        const remappedColumns = template.columns.map((col, index) => {
            const newId = `col_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`;
            idMap.set(col.id, newId);
            return { ...col, id: newId };
        });

        const remapColId = (colId: string): string => {
            if (!colId.startsWith('custom_')) return colId;
            const oldId = colId.slice('custom_'.length);
            const newId = idMap.get(oldId);
            return newId ? `custom_${newId}` : colId;
        };

        const rawOrder = template.columnOrder.map(remapColId);
        const newOrder = resolveColumnOrder({ columnOrder: rawOrder }, remappedColumns);
        const newHidden = template.hiddenColumns.map(remapColId);
        const newPinned = template.pinnedColumns.map(remapColId);
        const newWidths: Record<string, number> = {};
        for (const [colId, width] of Object.entries(template.columnWidths)) {
            newWidths[remapColId(colId)] = width;
        }

        setCustomColumns(remappedColumns);
        setColumnOrder(newOrder);
        setHiddenColumns(newHidden);
        setPinnedColumns(newPinned);
        setColumnWidths(newWidths);
        columnWidthsRef.current = newWidths;

        await persistBulkConfig({
            customColumns: remappedColumns,
            columnOrder: newOrder,
            hiddenColumns: newHidden,
            pinnedColumns: newPinned,
            columnWidths: newWidths,
        });
        actions.showToast('Plantilla aplicada', 'success', 2000);
    };

    const persistCustomColumnValues = useCallback((
        candidateId: string,
        candidatePatch: Record<string, unknown>
    ) => {
        bulkCandidatesApi.patchBulkColumnValues(candidateId, candidatePatch, customColumns)
            .then(ok => {
                if (!ok) {
                    actions.showToast(
                        'No se guardó en Supabase. Ejecute MIGRATION_ADD_BULK_COLUMN_VALUES.sql si aún no lo hizo.',
                        'error',
                        6000
                    );
                }
            })
            .catch(err => {
                console.error('Error guardando columna personalizada:', err);
                actions.showToast('Error al guardar en Supabase', 'error', 4000);
            });
    }, [customColumns, actions]);

    const handleColumnValueChange = (candidateId: string, columnId: string, value: any) => {
        if (!process) return;
        setColumnValues(prev => {
            const candidatePatch = enrichBulkColumnValuesForStorage(
                {
                    ...(prev[candidateId] || {}),
                    [columnId]: value,
                },
                customColumns
            );
            const newValues = {
                ...prev,
                [candidateId]: candidatePatch,
            };
            persistLocalColumnValues(process.id, newValues);
            persistCustomColumnValues(candidateId, candidatePatch);
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
            const candidatePatch = enrichBulkColumnValuesForStorage(
                { ...(prev[candidateId] || {}), [homonymCol.id]: value },
                customColumns
            );
            const newValues = {
                ...prev,
                [candidateId]: candidatePatch,
            };
            persistLocalColumnValues(process.id, newValues);
            persistCustomColumnValues(candidateId, candidatePatch);
            return newValues;
        });
    }, [customColumns, process?.id, persistCustomColumnValues]);

    const handleSaveEdit = (candidateId: string, field: string) => {
        const candidate = candidates.find(c => c.id === candidateId);
        const oldValue = readCandidateFieldValue(candidateId, field);
        const fieldLabel = getFieldLabel(field.startsWith('custom_') ? field : field);

        if (field.startsWith('custom_')) {
            const colId = field.replace('custom_', '');
            const col = customColumns.find(c => c.id === colId);
            if (col) {
                const newVal = parseCustomCellInput(editValue, col);
                handleColumnValueChange(candidateId, colId, newVal);
                logActivity('cell_edit', {
                    candidateId,
                    candidateName: candidate?.name,
                    fieldName: fieldLabel,
                    oldValue,
                    newValue: formatCustomCellDisplay(newVal, col),
                });
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
        logActivity('cell_edit', {
            candidateId,
            candidateName: candidate?.name,
            fieldName: fieldLabel,
            oldValue,
            newValue: trimmed,
        });
    };

    const setCellValue = useCallback(async (candidateId: string, colId: string, rawValue: string) => {
        if (!isPasteEditableColumn(colId, customColumns)) return;

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
        const candidateName = candidates.find(c => c.id === candidateIds[0])?.name;
        const fieldNames = colIds.map(id => getFieldLabel(id)).join(', ');
        const summaryParts: string[] = [];
        if (patch.bgColor !== undefined) summaryParts.push(`color: ${patch.bgColor || 'sin color'}`);
        if (patch.comment !== undefined) summaryParts.push(`comentario: ${patch.comment || '(eliminado)'}`);
        logActivity('cell_meta', {
            candidateId: candidateIds[0],
            candidateName,
            fieldName: fieldNames,
            newValue: summaryParts.join('; '),
            details: { cellCount: candidateIds.length * colIds.length },
        });
    }, [process?.id, candidates, getFieldLabel, logActivity]);

    const getCellMetaFor = useCallback((candidateId: string, colId: string): BulkCellMeta | undefined => {
        return cellMeta[candidateId]?.[colId];
    }, [cellMeta]);

    const buildTdStyle = useCallback((candidateId: string, colId: string): React.CSSProperties => {
        const meta = getCellMetaFor(candidateId, colId);
        const sticky = getStickyColumnStyle(colId, visibleColumns, pinnedColumns, false, meta?.bgColor, columnWidths);
        return { ...getColumnWidthStyle(colId, columnWidths), ...sticky };
    }, [getCellMetaFor, visibleColumns, pinnedColumns, columnWidths]);

    const buildThStyle = useCallback((colId: string): React.CSSProperties | undefined => {
        return getStickyColumnStyle(colId, visibleColumns, pinnedColumns, true, undefined, columnWidths);
    }, [visibleColumns, pinnedColumns, columnWidths]);

    const buildCheckboxStyle = useCallback((isHeader: boolean): React.CSSProperties | undefined => {
        return getStickyColumnStyle('checkbox', visibleColumns, pinnedColumns, isHeader, undefined, columnWidths);
    }, [visibleColumns, pinnedColumns, columnWidths]);

    const handleTableContextMenu = useCallback((e: React.MouseEvent) => {
        if (editingCell) return;
        const coord = getCellFromElement(e.target);
        if (!coord) return;
        e.preventDefault();
        e.stopPropagation();
        setCellContextMenu({ x: e.clientX, y: e.clientY, ...coord });
    }, [editingCell]);

    const buildColThStyle = useCallback((colId: string, extra?: React.CSSProperties): React.CSSProperties => ({
        ...getColumnWidthStyle(colId, columnWidths),
        ...buildThStyle(colId),
        ...extra,
    }), [buildThStyle, columnWidths]);

    useEffect(() => {
        columnWidthsRef.current = columnWidths;
    }, [columnWidths]);

    const handleColumnResizeStart = useCallback((e: React.MouseEvent, colId: string) => {
        e.preventDefault();
        e.stopPropagation();
        const startWidth = getColumnWidth(colId, columnWidthsRef.current);
        resizeSessionRef.current = { colId, startX: e.clientX, startWidth };

        const onMove = (ev: MouseEvent) => {
            const session = resizeSessionRef.current;
            if (!session) return;
            const delta = ev.clientX - session.startX;
            const newWidth = Math.round(
                Math.max(MIN_BULK_COL_WIDTH, Math.min(MAX_BULK_COL_WIDTH, session.startWidth + delta))
            );
            setColumnWidths(prev => {
                const next = { ...prev, [session.colId]: newWidth };
                columnWidthsRef.current = next;
                return next;
            });
        };

        const onUp = () => {
            resizeSessionRef.current = null;
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            void persistBulkConfig({ columnWidths: columnWidthsRef.current });
        };

        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    }, [persistBulkConfig]);

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
        const col = customColumns.find(c => c.id === columnId);
        const row: Record<string, unknown> = {
            ...(candidate?.bulkColumnValues || {}),
            ...(columnValues[candidateId] || {}),
        };

        if (col) {
            const resolved = resolveColumnValueFromRow(row, col, legacyColumnIdToName);
            if (resolved !== undefined && resolved !== '') return resolved;
            if (resolved === false) return false;
        }

        if (col && candidate) {
            const mapped = mapImportHeader(col.name.toLowerCase());
            if (mapped === 'age' && candidate.age != null) return candidate.age;
            if (mapped === 'source' && candidate.source) return candidate.source;
            if (mapped === 'province' && candidate.province) return candidate.province;
            if (mapped === 'district' && candidate.district) return candidate.district;
        }
        return '';
    };

    const readCandidateFieldValue = useCallback((candidateId: string, field: string): string => {
        const candidate = candidates.find(c => c.id === candidateId);
        if (!candidate) return '';
        const optimistic = optimisticUpdates.get(candidateId);
        const displayCandidate = optimistic ? { ...candidate, ...optimistic } : candidate;
        if (field.startsWith('custom_')) {
            const colId = field.replace('custom_', '');
            const col = customColumns.find(c => c.id === colId);
            const raw = getColumnValue(candidateId, colId, displayCandidate);
            return formatCustomCellDisplay(raw, col);
        }
        const direct = (displayCandidate as Record<string, unknown>)[field];
        return direct == null ? '' : String(direct);
    }, [candidates, optimisticUpdates, customColumns, columnValues]);

    const getCustomFilterKey = (columnId: string) => `custom_${columnId}`;

    const passesCustomColumnFilters = (candidateId: string): boolean => {
        for (const col of customColumns) {
            const filterValue = columnFilters[getCustomFilterKey(col.id)];
            if (!filterValue) continue;

            const cellValue = getColumnValue(candidateId, col.id, candidates.find(c => c.id === candidateId));

            if (col.type === 'route') continue;
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
                case 'profileMatch':
                    valueA = profileMatchScores.scores.get(candidateA.id) ?? 0;
                    valueB = profileMatchScores.scores.get(candidateB.id) ?? 0;
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
                case 'createdAt':
                    valueA = candidateA.createdAt ? new Date(candidateA.createdAt).getTime() : 0;
                    valueB = candidateB.createdAt ? new Date(candidateB.createdAt).getTime() : 0;
                    break;
                case 'contactPhone':
                case 'contactWhatsapp':
                case 'contactEmail': {
                    const sortCh = columnIdToAttemptChannel(sortColumn);
                    if (sortCh) {
                        const key = CHANNEL_CANDIDATE_KEY[sortCh];
                        const sa = candidateA[key];
                        const sb = candidateB[key];
                        valueA = sa?.lastAttemptAt ? new Date(sa.lastAttemptAt).getTime() : 0;
                        valueB = sb?.lastAttemptAt ? new Date(sb.lastAttemptAt).getTime() : 0;
                    }
                    break;
                }
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
                    if (sortColumn.startsWith('custom_')) {
                        const customColId = sortColumn.replace('custom_', '');
                        const col = customColumns.find(c => c.id === customColId);
                        const rawA = getColumnValue(candidateA.id, customColId, candidateA);
                        const rawB = getColumnValue(candidateB.id, customColId, candidateB);
                        if (col?.type === 'number') {
                            valueA = Number(rawA) || 0;
                            valueB = Number(rawB) || 0;
                        } else if (col?.type === 'date') {
                            const fmtA = formatBulkDate(rawA);
                            const fmtB = formatBulkDate(rawB);
                            valueA = fmtA ? new Date(fmtA.split('/').reverse().join('-')).getTime() : 0;
                            valueB = fmtB ? new Date(fmtB.split('/').reverse().join('-')).getTime() : 0;
                        } else if (col?.type === 'checkbox') {
                            valueA = rawA === true ? 1 : 0;
                            valueB = rawB === true ? 1 : 0;
                        } else {
                            valueA = String(rawA ?? '').toLowerCase();
                            valueB = String(rawB ?? '').toLowerCase();
                        }
                    } else {
                        return 0;
                    }
                    break;
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
            if (profileMatchColumnVisible && columnFilters.profileMatch) {
                const minMatch = parseFloat(columnFilters.profileMatch);
                if (isNaN(minMatch) || (profileMatchScores.scores.get(candidate.id) ?? 0) < minMatch) {
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
        candidates, columnFilters, optimisticUpdates, scoreIaColumnVisible, profileMatchColumnVisible, profileMatchScores, columnValues,
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
        if (!el) return;

        const thead = container.querySelector('thead');
        const headerHeight = thead?.getBoundingClientRect().height ?? 0;

        let stickyLeft = CHECKBOX_COL_WIDTH;
        for (const colId of visibleColumns) {
            if (colId === coord.colId) break;
            if (pinnedColumns.includes(colId)) {
                stickyLeft += getColumnWidth(colId, columnWidths);
            }
        }

        const containerRect = container.getBoundingClientRect();
        const cellRect = el.getBoundingClientRect();
        const padding = 4;

        const topBound = containerRect.top + headerHeight + padding;
        const bottomBound = containerRect.bottom - padding;
        if (cellRect.top < topBound) {
            container.scrollTop -= topBound - cellRect.top;
        } else if (cellRect.bottom > bottomBound) {
            container.scrollTop += cellRect.bottom - bottomBound;
        }

        const leftBound = containerRect.left + stickyLeft + padding;
        const rightBound = containerRect.right - padding;
        if (cellRect.left < leftBound) {
            container.scrollLeft -= leftBound - cellRect.left;
        } else if (cellRect.right > rightBound) {
            container.scrollLeft += cellRect.right - rightBound;
        }

        requestAnimationFrame(() => tableContainerRef.current?.focus());
    }, [visibleColumns, pinnedColumns, columnWidths]);

    const focusTable = useCallback(() => {
        tableContainerRef.current?.focus();
    }, []);

    const selectSingleCell = useCallback((coord: CellCoord) => {
        setActiveCell(coord);
        setSelectionAnchor(coord);
        setSelectedCells(new Set([toCellKey(coord)]));
        focusTable();
    }, [focusTable]);

    const handleAddRowSuccess = useCallback((newRow: BulkCandidate) => {
        setCandidates(prev => [newRow, ...prev]);
        setTotal(t => t + 1);
        logActivity('add_row', {
            candidateId: newRow.id,
            candidateName: newRow.name,
            details: { source: 'manual_row' },
        });
        actions.showToast('Fila añadida — complete el resto en la tabla', 'success', 2500);

        const firstEditableCol = visibleColumns.find(colId => isPasteEditableColumn(colId, customColumns)) || 'name';
        requestAnimationFrame(() => {
            setTimeout(() => {
                scrollCellIntoView({ candidateId: newRow.id, colId: firstEditableCol });
                selectSingleCell({ candidateId: newRow.id, colId: firstEditableCol });
            }, 50);
        });
    }, [logActivity, actions, visibleColumns, scrollCellIntoView, selectSingleCell]);

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
        if (!isPasteEditableColumn(colId, customColumns)) return;

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
        extendSelection: boolean,
        baseOverride?: CellCoord | null
    ) => {
        if (displayCandidates.length === 0 || visibleColumns.length === 0) return;

        let base = baseOverride ?? tableKeyboardRef.current.activeCell;
        if (!base) {
            base = { candidateId: displayCandidates[0].id, colId: visibleColumns[0] };
        }

        const { rowIdx, colIdx } = getCellIndices(base.candidateId, base.colId);
        const next = getCellAt(rowIdx + dRow, colIdx + dCol);
        if (!next) {
            if (baseOverride) {
                selectSingleCell(base);
            }
            return;
        }

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
        selectionAnchor, displayCandidates, visibleColumns,
        getCellIndices, getCellAt, buildCellRange, scrollCellIntoView, focusTable, selectSingleCell,
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

    const handleTableKeyDown = useCallback((e: React.KeyboardEvent | KeyboardEvent) => {
        const ctx = tableKeyboardRef.current;
        if (ctx.editingCell) return;
        const target = e.target as HTMLElement;
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

        const navKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter', 'Escape'];
        if (!navKeys.includes(e.key)) return;

        const inTable = tableContainerRef.current?.contains(document.activeElement) ?? false;
        if (!ctx.activeCell && !inTable) return;

        if (!ctx.activeCell && ctx.displayCandidates.length > 0 && ctx.visibleColumns.length > 0) {
            e.preventDefault();
            const first = { candidateId: ctx.displayCandidates[0].id, colId: ctx.visibleColumns[0] };
            if (e.key === 'Enter') {
                selectSingleCell(first);
                beginEditCell(first.candidateId, first.colId);
                return;
            }
            if (e.key === 'Escape') return;
            const dRow = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;
            const dCol = e.key === 'ArrowLeft' ? -1 : (e.key === 'ArrowRight' || e.key === 'Tab') ? (e.shiftKey ? -1 : 1) : 0;
            if (dRow === 0 && dCol === 0) {
                selectSingleCell(first);
                return;
            }
            moveActiveCell(dRow, dCol, e.shiftKey, first);
            return;
        }
        if (!ctx.activeCell) return;

        e.preventDefault();
        const extend = e.shiftKey;

        switch (e.key) {
            case 'ArrowUp':
                moveActiveCell(-1, 0, extend);
                break;
            case 'ArrowDown':
                moveActiveCell(1, 0, extend);
                break;
            case 'ArrowLeft':
                moveActiveCell(0, -1, extend);
                break;
            case 'ArrowRight':
                moveActiveCell(0, 1, extend);
                break;
            case 'Tab':
                moveActiveCell(0, e.shiftKey ? -1 : 1, false);
                break;
            case 'Enter':
                beginEditCell(ctx.activeCell.candidateId, ctx.activeCell.colId);
                break;
            case 'Escape':
                setSelectedCells(new Set());
                setSelectionAnchor(null);
                break;
            default:
                break;
        }
    }, [selectSingleCell, moveActiveCell, beginEditCell]);

    tableKeyboardRef.current = {
        editingCell,
        activeCell,
        selectionAnchor,
        displayCandidates,
        visibleColumns,
    };

    useEffect(() => {
        if (!selectedProcess) return;
        const onKeyDown = (e: KeyboardEvent) => handleTableKeyDown(e);
        document.addEventListener('keydown', onKeyDown, true);
        return () => document.removeEventListener('keydown', onKeyDown, true);
    }, [selectedProcess, handleTableKeyDown]);

    // Limpiar selección si la fila activa deja de estar visible (filtros/orden)
    useEffect(() => {
        if (!activeCell) return;
        const rowVisible = displayCandidates.some(c => c.id === activeCell.candidateId);
        const colVisible = visibleColumns.includes(activeCell.colId);
        if (!rowVisible) {
            setActiveCell(null);
            setSelectedCells(new Set());
            setSelectionAnchor(null);
        } else if (!colVisible && visibleColumns.length > 0) {
            const next = { candidateId: activeCell.candidateId, colId: visibleColumns[0] };
            setActiveCell(next);
            setSelectionAnchor(next);
            setSelectedCells(new Set([toCellKey(next)]));
        }
    }, [displayCandidates, visibleColumns]);

    const isActiveCell = (candidateId: string, colId: string) =>
        activeCell?.candidateId === candidateId && activeCell?.colId === colId;

    const isCellSelected = (candidateId: string, colId: string) =>
        selectedCells.has(toCellKey({ candidateId, colId }));

    const cellFocusClass = (candidateId: string, colId: string) => {
        if (isActiveCell(candidateId, colId)) {
            return 'ring-2 ring-primary-600 ring-inset z-[30]';
        }
        if (isCellSelected(candidateId, colId)) {
            return 'ring-1 ring-primary-400 ring-inset z-[25]';
        }
        return '';
    };

    const buildCellDisplayStyle = useCallback((candidateId: string, colId: string): React.CSSProperties => {
        const style: React.CSSProperties = { ...buildTdStyle(candidateId, colId) };
        const active = activeCell?.candidateId === candidateId && activeCell?.colId === colId;
        const selected = selectedCells.has(toCellKey({ candidateId, colId }));
        if (active) {
            style.zIndex = Math.max(typeof style.zIndex === 'number' ? style.zIndex : 0, 30);
            if (!style.position) style.position = 'relative';
        } else if (selected) {
            style.zIndex = Math.max(typeof style.zIndex === 'number' ? style.zIndex : 0, 25);
            if (!style.position) style.position = 'relative';
        }
        return style;
    }, [buildTdStyle, activeCell, selectedCells]);

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
            style: buildCellDisplayStyle(candidateId, colId),
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
                        if (!candidateId || !colId || !isPasteEditableColumn(colId, customColumns)) continue;
                        await setCellValue(candidateId, colId, grid[r][c]);
                        pastedCells++;
                    }
                }
            } else if (flatValues.length === 1) {
                for (const key of sortedKeys) {
                    const { candidateId, colId } = parseCellKey(key);
                    if (!isPasteEditableColumn(colId, customColumns)) continue;
                    await setCellValue(candidateId, colId, flatValues[0]);
                    pastedCells++;
                }
            } else {
                for (let i = 0; i < sortedKeys.length; i++) {
                    const { candidateId, colId } = parseCellKey(sortedKeys[i]);
                    if (!isPasteEditableColumn(colId, customColumns)) continue;
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
                if (!isPasteEditableColumn(colId, customColumns)) continue;
                await setCellValue(targetCandidateIds[r], colId, rowValues[c]);
                pastedCells++;
            }
        }

        if (pastedCells > 0) {
            actions.showToast(`Pegado en ${pastedCells} celda(s)`, 'success', 2000);
            logActivity('paste', {
                details: { count: pastedCells, summary: `Pegado en ${pastedCells} celda(s)` },
            });
        }
    }, [activeCell, editingCell, visibleColumns, selectedIds, selectedCells, displayCandidates, setCellValue, actions, sortSelectedCellKeys, logActivity]);

    const handleBulkCopy = useCallback((e: ClipboardEvent) => {
        if (editingCell) return;

        const target = e.target as HTMLElement;
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

        const cellKeys =
            selectedCells.size > 0
                ? Array.from(selectedCells)
                : activeCell
                  ? [toCellKey(activeCell)]
                  : [];
        if (cellKeys.length === 0) return;

        const inTable =
            tableContainerRef.current?.contains(target) ||
            (document.activeElement != null && tableContainerRef.current?.contains(document.activeElement));
        if (!inTable) return;

        const cells = cellKeys.map(parseCellKey);
        const text = buildBulkSelectionClipboardText(cells, displayCandidates, visibleColumns, {
            columnValues,
            customColumns,
            process,
            bulkConfig: process?.bulkConfig,
        });
        if (!text) return;

        e.preventDefault();
        e.clipboardData?.setData('text/plain', text);
        actions.showToast(
            cellKeys.length === 1 ? 'Celda copiada al portapapeles' : `${cellKeys.length} celdas copiadas al portapapeles`,
            'success',
            2000
        );
    }, [
        editingCell,
        selectedCells,
        activeCell,
        displayCandidates,
        visibleColumns,
        columnValues,
        customColumns,
        process,
        actions,
    ]);

    useEffect(() => {
        document.addEventListener('paste', handleBulkPaste);
        return () => document.removeEventListener('paste', handleBulkPaste);
    }, [handleBulkPaste]);

    useEffect(() => {
        if (!selectedProcess) return;
        document.addEventListener('copy', handleBulkCopy);
        return () => document.removeEventListener('copy', handleBulkCopy);
    }, [selectedProcess, handleBulkCopy]);

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
                                        setSearchInput('');
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
                                        type="button"
                                        onClick={() => setShowIdealProfileModal(true)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
                                            idealProfileConfig?.enabled
                                                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                                                : 'bg-white border border-indigo-300 text-indigo-800 hover:bg-indigo-50'
                                        }`}
                                        title="Definir perfil ideal y comparar candidatos"
                                    >
                                        <Target className="w-4 h-4 shrink-0" />
                                        Perfil ideal
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setImportRestoreMode(true);
                                            setShowImportModal(true);
                                        }}
                                        className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-300 text-amber-900 rounded-lg hover:bg-amber-100 transition-colors"
                                        title="Restaurar columnas desde tu Excel original"
                                    >
                                        <HardDrive className="w-4 h-4" />
                                        Restaurar desde Excel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => refreshFromDatabase()}
                                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-800 rounded-lg hover:bg-gray-50 transition-colors"
                                        title="Recargar candidatos y columnas personalizadas"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                        Actualizar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleNormalizeTextCase}
                                        disabled={isNormalizingTextCase || isLoading}
                                        className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        title='Corregir MAYÚSCULAS en nombres, direcciones y columnas de texto (ej. "CALLE Italia" → "Calle Italia")'
                                    >
                                        {isNormalizingTextCase ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <CaseSensitive className="w-4 h-4" />
                                        )}
                                        Normalizar texto
                                    </button>
                                    <button
                                        onClick={() => setShowAddRowModal(true)}
                                        className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                                        title="Añadir una fila con los campos básicos del proceso masivo"
                                    >
                                        <ListPlus className="w-4 h-4" />
                                        Añadir fila
                                    </button>
                                    <button
                                        onClick={() => {
                                            setImportRestoreMode(false);
                                            setShowImportModal(true);
                                        }}
                                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                    >
                                        <Upload className="w-4 h-4" />
                                        Importar desde Excel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowExportModal(true)}
                                        className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors"
                                        title="Exportar tabla personalizada para el cliente"
                                    >
                                        <Download className="w-4 h-4" />
                                        Exportar tabla
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
                                            value={searchInput}
                                            onChange={(e) => setSearchInput(e.target.value)}
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
                    {idealProfileConfig?.enabled && (
                        <div className="px-4 pt-3 shrink-0">
                            <BulkIdealProfileSummaryPanel
                                summary={profileMatchSummary}
                                config={idealProfileConfig}
                                loading={loadingProfileStats}
                            />
                        </div>
                    )}
                    <p className="text-[10px] text-gray-500 px-1 pb-1 shrink-0">
                        Flechas · Shift+arrastrar selección · Ctrl+clic múltiple · Clic derecho: color/comentario · Enter/doble clic editar · Ctrl+C copiar · Ctrl+V pegar en celdas seleccionadas · Doble clic en fila abre detalle · Arrastre el borde derecho del encabezado para ajustar el ancho de columna
                    </p>
                    <div
                        ref={tableContainerRef}
                        className="flex-1 overflow-x-auto overflow-y-auto outline-none focus:ring-2 focus:ring-primary-300 focus:ring-inset rounded"
                        style={{ minHeight: 0 }}
                        tabIndex={0}
                        onMouseDown={(e) => {
                            if ((e.target as HTMLElement).closest('input, select, textarea, button, a')) return;
                            focusTable();
                        }}
                    >
                        <table className="w-full border-collapse" style={{ tableLayout: 'fixed', width: 'max-content', minWidth: '100%' }}>
                            <thead className="bg-gray-50 sticky top-0 z-20">
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
                                    const thStyle = (extra?: React.CSSProperties) => buildColThStyle(colId, extra);
                                    const commonProps = {
                                        key: colId,
                                        draggable: true,
                                        onDragStart: (e: React.DragEvent<HTMLTableCellElement>) => handleDragStart(e, colId),
                                        onDragOver: handleDragOver,
                                        onDragLeave: handleDragLeave,
                                        onDrop: (e: React.DragEvent<HTMLTableCellElement>) => handleDrop(e, colId),
                                        onDragEnd: handleDragEnd,
                                        className: `${COMPACT_TH_CLASS} cursor-move transition-colors bg-gray-50`,
                                    };

                                    if (colId === 'name') {
                                        return (
                                            <BulkTh colId={colId} headerProps={commonProps} style={thStyle()} onResizeStart={handleColumnResizeStart}>
                                                <div className="flex flex-col gap-1">
                                                    <button onClick={() => handleSort('name')} className="flex items-center gap-1 hover:text-primary-600 transition-colors">
                                                        <span>Nombre</span>
                                                        {sortColumn === 'name' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <div className="w-3 h-3 opacity-30"><ArrowUp className="w-3 h-3" /></div>}
                                                    </button>
                                                    <input type="text" placeholder="Filtrar..." value={columnFilters.name || ''} onChange={(e) => setColumnFilters({ ...columnFilters, name: e.target.value })} className="text-xs px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 font-normal normal-case" onClick={(e) => e.stopPropagation()} />
                                                </div>
                                            </BulkTh>
                                        );
                                    }
                                    if (colId === 'dni') {
                                        return (
                                            <BulkTh colId={colId} headerProps={commonProps} style={thStyle()} onResizeStart={handleColumnResizeStart}>
                                                <div className="flex flex-col gap-1">
                                                    <button onClick={() => handleSort('dni')} className="flex items-center gap-1 hover:text-primary-600 transition-colors">
                                                        <span>DNI</span>
                                                        {sortColumn === 'dni' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <div className="w-3 h-3 opacity-30"><ArrowUp className="w-3 h-3" /></div>}
                                                    </button>
                                                    <input type="text" placeholder="Filtrar..." value={columnFilters.dni || ''} onChange={(e) => setColumnFilters({ ...columnFilters, dni: e.target.value })} className="text-xs px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 font-normal normal-case" onClick={(e) => e.stopPropagation()} />
                                                </div>
                                            </BulkTh>
                                        );
                                    }
                                    if (colId === 'email') {
                                        return (
                                            <BulkTh colId={colId} headerProps={commonProps} style={thStyle()} onResizeStart={handleColumnResizeStart}>
                                                <div className="flex flex-col gap-1">
                                                    <button onClick={() => handleSort('email')} className="flex items-center gap-1 hover:text-primary-600 transition-colors">
                                                        <span>Email</span>
                                                        {sortColumn === 'email' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <div className="w-3 h-3 opacity-30"><ArrowUp className="w-3 h-3" /></div>}
                                                    </button>
                                                    <input type="text" placeholder="Filtrar..." value={columnFilters.email || ''} onChange={(e) => setColumnFilters({ ...columnFilters, email: e.target.value })} className="text-xs px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 font-normal normal-case" onClick={(e) => e.stopPropagation()} />
                                                </div>
                                            </BulkTh>
                                        );
                                    }
                                    if (colId === 'scoreIa') {
                                        return (
                                            <BulkTh colId={colId} headerProps={commonProps} style={thStyle()} onResizeStart={handleColumnResizeStart}>
                                                <div className="flex flex-col gap-1">
                                                    <button onClick={() => handleSort('scoreIa')} className="flex items-center gap-1 hover:text-primary-600 transition-colors">
                                                        <span>Score IA</span>
                                                        {sortColumn === 'scoreIa' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <div className="w-3 h-3 opacity-30"><ArrowUp className="w-3 h-3" /></div>}
                                                    </button>
                                                    <input type="text" placeholder="Min..." value={columnFilters.scoreIa || ''} onChange={(e) => setColumnFilters({ ...columnFilters, scoreIa: e.target.value })} className="text-xs px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 font-normal normal-case" onClick={(e) => e.stopPropagation()} />
                                                </div>
                                            </BulkTh>
                                        );
                                    }
                                    if (colId === 'profileMatch') {
                                        return (
                                            <BulkTh colId={colId} headerProps={commonProps} style={thStyle()} onResizeStart={handleColumnResizeStart}>
                                                <div className="flex flex-col gap-1">
                                                    <button onClick={() => handleSort('profileMatch')} className="flex items-center gap-1 hover:text-primary-600 transition-colors">
                                                        <span>% Perfil</span>
                                                        {sortColumn === 'profileMatch' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <div className="w-3 h-3 opacity-30"><ArrowUp className="w-3 h-3" /></div>}
                                                    </button>
                                                    <input type="text" placeholder="Min..." value={columnFilters.profileMatch || ''} onChange={(e) => setColumnFilters({ ...columnFilters, profileMatch: e.target.value })} className="text-xs px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 font-normal normal-case" onClick={(e) => e.stopPropagation()} />
                                                </div>
                                            </BulkTh>
                                        );
                                    }
                                    if (colId === 'status') {
                                        return (
                                            <BulkTh colId={colId} headerProps={commonProps} style={thStyle()} onResizeStart={handleColumnResizeStart}>
                                                <button onClick={() => handleSort('scoreIa')} className="flex items-center gap-1 hover:text-primary-600 transition-colors">
                                                    <span>Status</span>
                                                    {sortColumn === 'scoreIa' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <div className="w-3 h-3 opacity-30"><ArrowUp className="w-3 h-3" /></div>}
                                                </button>
                                            </BulkTh>
                                        );
                                    }
                                    if (colId === 'phone') {
                                        return (
                                            <BulkTh colId={colId} headerProps={commonProps} style={thStyle()} onResizeStart={handleColumnResizeStart}>
                                                <div className="flex flex-col gap-1">
                                                    <button onClick={() => handleSort('phone')} className="flex items-center gap-1 hover:text-primary-600 transition-colors">
                                                        <span>Teléfono</span>
                                                        {sortColumn === 'phone' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <div className="w-3 h-3 opacity-30"><ArrowUp className="w-3 h-3" /></div>}
                                                    </button>
                                                    <input type="text" placeholder="Filtrar..." value={columnFilters.phone || ''} onChange={(e) => setColumnFilters({ ...columnFilters, phone: e.target.value })} className="text-xs px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 font-normal normal-case" onClick={(e) => e.stopPropagation()} />
                                                </div>
                                            </BulkTh>
                                        );
                                    }
                                    if (CONTACT_COLUMN_IDS.includes(colId)) {
                                        return (
                                            <BulkTh colId={colId} headerProps={commonProps} style={thStyle()} onResizeStart={handleColumnResizeStart}>
                                                <span title="Semáforo y última interacción">{getColumnLabel(colId, customColumns)}</span>
                                            </BulkTh>
                                        );
                                    }
                                    if (colId === 'source') {
                                        return (
                                            <BulkTh colId={colId} headerProps={commonProps} style={thStyle()} onResizeStart={handleColumnResizeStart}>
                                                <div className="flex flex-col gap-1">
                                                    <button onClick={() => handleSort('source')} className="flex items-center gap-1 hover:text-primary-600 transition-colors">
                                                        <span>Fuente</span>
                                                        {sortColumn === 'source' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <div className="w-3 h-3 opacity-30"><ArrowUp className="w-3 h-3" /></div>}
                                                    </button>
                                                    <input type="text" placeholder="Filtrar..." value={columnFilters.source || ''} onChange={(e) => setColumnFilters({ ...columnFilters, source: e.target.value })} className="text-xs px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 font-normal normal-case" onClick={(e) => e.stopPropagation()} />
                                                </div>
                                            </BulkTh>
                                        );
                                    }
                                    if (colId === 'province') {
                                        return (
                                            <BulkTh colId={colId} headerProps={commonProps} style={thStyle()} onResizeStart={handleColumnResizeStart}>
                                                <div className="flex flex-col gap-1">
                                                    <button onClick={() => handleSort('province')} className="flex items-center gap-1 hover:text-primary-600 transition-colors">
                                                        <span>Provincia</span>
                                                        {sortColumn === 'province' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <div className="w-3 h-3 opacity-30"><ArrowUp className="w-3 h-3" /></div>}
                                                    </button>
                                                    <input type="text" placeholder="Filtrar..." value={columnFilters.province || ''} onChange={(e) => setColumnFilters({ ...columnFilters, province: e.target.value })} className="text-xs px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 font-normal normal-case" onClick={(e) => e.stopPropagation()} />
                                                </div>
                                            </BulkTh>
                                        );
                                    }
                                    if (colId === 'district') {
                                        return (
                                            <BulkTh colId={colId} headerProps={commonProps} style={thStyle()} onResizeStart={handleColumnResizeStart}>
                                                <div className="flex flex-col gap-1">
                                                    <button onClick={() => handleSort('district')} className="flex items-center gap-1 hover:text-primary-600 transition-colors">
                                                        <span>Distrito</span>
                                                        {sortColumn === 'district' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <div className="w-3 h-3 opacity-30"><ArrowUp className="w-3 h-3" /></div>}
                                                    </button>
                                                    <input type="text" placeholder="Filtrar..." value={columnFilters.district || ''} onChange={(e) => setColumnFilters({ ...columnFilters, district: e.target.value })} className="text-xs px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 font-normal normal-case" onClick={(e) => e.stopPropagation()} />
                                                </div>
                                            </BulkTh>
                                        );
                                    }
                                    if (colId === 'createdAt') {
                                        return (
                                            <BulkTh colId={colId} headerProps={commonProps} style={thStyle()} onResizeStart={handleColumnResizeStart}>
                                                <button onClick={() => handleSort('createdAt')} className="flex items-center gap-1 hover:text-primary-600 transition-colors">
                                                    <span>Fecha creación</span>
                                                    {sortColumn === 'createdAt' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <div className="w-3 h-3 opacity-30"><ArrowUp className="w-3 h-3" /></div>}
                                                </button>
                                            </BulkTh>
                                        );
                                    }
                                    if (colId === 'nextInterview') {
                                        return (
                                            <BulkTh colId={colId} headerProps={commonProps} style={thStyle()} onResizeStart={handleColumnResizeStart}>
                                                <button onClick={() => handleSort('nextInterview')} className="flex items-center gap-1 hover:text-primary-600 transition-colors">
                                                    <span>Próxima Entrevista</span>
                                                    {sortColumn === 'nextInterview' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <div className="w-3 h-3 opacity-30"><ArrowUp className="w-3 h-3" /></div>}
                                                </button>
                                            </BulkTh>
                                        );
                                    }
                                    if (colId === 'schedule') {
                                        return (
                                            <BulkTh colId={colId} headerProps={commonProps} style={thStyle()} onResizeStart={handleColumnResizeStart}>Agendar</BulkTh>
                                        );
                                    }
                                    if (colId === 'stage') {
                                        return (
                                            <BulkTh colId={colId} headerProps={commonProps} style={thStyle()} onResizeStart={handleColumnResizeStart}>
                                                <button onClick={() => handleSort('stage')} className="flex items-center gap-1 hover:text-primary-600 transition-colors">
                                                    <span>Etapa</span>
                                                    {sortColumn === 'stage' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <div className="w-3 h-3 opacity-30"><ArrowUp className="w-3 h-3" /></div>}
                                                </button>
                                            </BulkTh>
                                        );
                                    }
                                    if (colId.startsWith('custom_')) {
                                        const customColId = colId.replace('custom_', '');
                                        const col = customColumns.find(c => c.id === customColId);
                                        if (!col) return null;
                                        const filterKey = getCustomFilterKey(col.id);
                                        return (
                                            <BulkTh
                                                colId={colId}
                                                headerProps={{
                                                    ...commonProps,
                                                    className: `${COMPACT_TH_CLASS} normal-case cursor-move transition-colors bg-gray-50`,
                                                }}
                                                style={buildColThStyle(colId)}
                                                onResizeStart={handleColumnResizeStart}
                                            >
                                                <div className="flex flex-col gap-1">
                                                    <button onClick={() => handleSort(colId)} className="flex items-center gap-1 hover:text-primary-600 transition-colors">
                                                        <span className="normal-case">{col.name}</span>
                                                        {sortColumn === colId ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <div className="w-3 h-3 opacity-30"><ArrowUp className="w-3 h-3" /></div>}
                                                    </button>
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
                                                    ) : col.type === 'route' ? (
                                                        <span className="text-[10px] text-gray-400 font-normal normal-case">Enlace automático</span>
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
                                            </BulkTh>
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
                                            if (colId === 'profileMatch') {
                                                const matchScore = profileMatchScores.scores.get(candidate.id);
                                                const tooltip = profileMatchScores.details.get(candidate.id);
                                                return (
                                                    <td key="profileMatch" {...tdProps(candidate.id, 'profileMatch')}>
                                                        {matchScore !== undefined ? (
                                                            <span
                                                                className="inline-flex items-center justify-center min-w-[2.5rem] px-1 py-0.5 rounded font-semibold text-xs"
                                                                style={getProfileMatchGradientStyle(matchScore)}
                                                                title={tooltip}
                                                            >
                                                                {matchScore}%
                                                            </span>
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
                                                const phoneCooldown = isContactCooldownActive(
                                                    displayCandidate.contactPhone?.lastAttemptAt
                                                );
                                                return (
                                                    <td
                                                        key="phone"
                                                        {...tdProps(candidate.id, 'phone')}
                                                        className={`${COMPACT_TD_CLASS} ${phoneCooldown ? 'ring-1 ring-inset ring-red-200' : ''}`}
                                                    >
                                                        {editingCell?.candidateId === candidate.id && editingCell?.field === 'phone' ? (
                                                            <input type="tel" value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={() => handleSaveEdit(candidate.id, 'phone')} onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(candidate.id, 'phone'); if (e.key === 'Escape') handleCancelEdit(); }} autoFocus className="w-full px-2 py-1 border border-primary-500 rounded focus:ring-2 focus:ring-primary-500" />
                                                        ) : (
                                                            <span className="hover:bg-gray-50 px-1 py-0.5 rounded cursor-pointer" onDoubleClick={() => handleStartEdit(candidate.id, 'phone', displayCandidate.phone || '')} title="Doble clic para editar">{displayCandidate.phone || 'N/A'}</span>
                                                        )}
                                                    </td>
                                                );
                                            }
                                            if (CONTACT_COLUMN_IDS.includes(colId) && process?.id) {
                                                const channel = columnIdToAttemptChannel(colId)!;
                                                const summaryKey = CHANNEL_CANDIDATE_KEY[channel];
                                                const summary = displayCandidate[summaryKey] ?? {
                                                    status: 'por_contactar' as const,
                                                    attemptCount: 0,
                                                };
                                                const contactAddress =
                                                    channel === 'email'
                                                        ? displayEmail || undefined
                                                        : displayCandidate.phone;
                                                return (
                                                    <td key={colId} {...tdProps(candidate.id, colId)}>
                                                        <BulkContactStatusCell
                                                            channel={channel}
                                                            candidateId={displayCandidate.id}
                                                            candidateName={displayCandidate.name}
                                                            processId={process.id}
                                                            contactAddress={contactAddress}
                                                            summary={summary}
                                                            userId={state.currentUser?.id}
                                                            userName={
                                                                state.currentUser?.name ||
                                                                state.currentUser?.email
                                                            }
                                                            onSummaryChange={(s, actionType, ch) =>
                                                                handleContactSummaryChange(
                                                                    displayCandidate.id,
                                                                    displayCandidate.name,
                                                                    s,
                                                                    actionType,
                                                                    ch
                                                                )
                                                            }
                                                            onResetChannel={(result) =>
                                                                handleContactReset(
                                                                    displayCandidate.id,
                                                                    displayCandidate.name,
                                                                    channel,
                                                                    result
                                                                )
                                                            }
                                                        />
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
                                            if (colId === 'createdAt') {
                                                return (
                                                    <td key="createdAt" {...tdProps(candidate.id, 'createdAt')}>
                                                        <span className="text-xs text-gray-700" title={displayCandidate.createdAt ? new Date(displayCandidate.createdAt).toLocaleString('es-PE') : undefined}>
                                                            {formatBulkDateTime(displayCandidate.createdAt)}
                                                        </span>
                                                    </td>
                                                );
                                            }
                                            if (colId === 'nextInterview') {
                                                const interviewerName = displayCandidate.nextInterviewerId
                                                    ? state.users.find(u => u.id === displayCandidate.nextInterviewerId)?.name
                                                    : undefined;
                                                return (
                                                    <td key="nextInterview" {...tdProps(candidate.id, 'nextInterview')}>
                                                        {displayCandidate.nextInterviewAt ? (
                                                            <div className="flex items-start gap-0.5 group">
                                                                <div
                                                                    className="flex flex-col flex-1 min-w-0 cursor-pointer hover:bg-gray-50 rounded px-1"
                                                                    onDoubleClick={(e) => { e.stopPropagation(); openScheduleModal(displayCandidate); }}
                                                                    title="Doble clic para editar entrevista"
                                                                >
                                                                    <span className="text-xs text-gray-900">{new Date(displayCandidate.nextInterviewAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', weekday: 'short' })}</span>
                                                                    <span className="text-[10px] text-gray-500">{new Date(displayCandidate.nextInterviewAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}{interviewerName ? ` · ${interviewerName}` : ''}</span>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => { e.stopPropagation(); void handleClearInterview(displayCandidate); }}
                                                                    className="shrink-0 p-0.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded opacity-70 group-hover:opacity-100 transition-colors"
                                                                    title="Eliminar entrevista"
                                                                >
                                                                    <X className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <span
                                                                className="text-gray-400 text-xs cursor-pointer hover:text-primary-600 hover:underline"
                                                                onDoubleClick={(e) => { e.stopPropagation(); openScheduleModal(displayCandidate); }}
                                                                title="Doble clic para agendar"
                                                            >
                                                                Agendar…
                                                            </span>
                                                        )}
                                                    </td>
                                                );
                                            }
                                            if (colId === 'schedule') {
                                                return (
                                                    <td key="schedule" {...tdProps(candidate.id, 'schedule')}>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => { e.stopPropagation(); openScheduleModal(displayCandidate); }}
                                                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded transition-colors"
                                                            title="Agendar entrevista"
                                                        >
                                                            <Calendar className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                );
                                            }
                                            if (colId === 'stage') {
                                                const currentStage = process?.stages.find(s => s.id === displayCandidate.stageId);
                                                const stageColorClass = getStageSelectClass(currentStage?.color);
                                                return (
                                                    <td key="stage" {...tdProps(candidate.id, 'stage')}>
                                                        <select
                                                            value={displayCandidate.stageId}
                                                            onChange={(e) => updateCandidateStatus(candidate.id, { stageId: e.target.value }, candidate.stageId)}
                                                            onClick={(e) => e.stopPropagation()}
                                                            onMouseDown={(e) => e.stopPropagation()}
                                                            className={`text-xs border rounded px-1 py-0.5 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 min-w-[100px] max-w-[120px] cursor-pointer font-medium ${stageColorClass}`}
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

                                                if (col.type === 'route') {
                                                    const routeUrl = buildRouteColumnLink(
                                                        displayCandidate,
                                                        col,
                                                        customColumns,
                                                        columnValues
                                                    );
                                                    return (
                                                        <td
                                                            key={col.id}
                                                            {...tdProps(candidate.id, colId)}
                                                        >
                                                            {renderCellCommentIndicator(candidate.id, colId)}
                                                            <BulkRouteCell
                                                                url={routeUrl}
                                                                missingDestination={!col.routeDestination?.trim()}
                                                                missingOrigin={!routeUrl && !!col.routeDestination?.trim()}
                                                                onCopy={(url) => {
                                                                    void navigator.clipboard.writeText(url);
                                                                    actions.showToast('Enlace copiado', 'success', 2000);
                                                                }}
                                                            />
                                                        </td>
                                                    );
                                                }

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

                    {process && (
                        <BulkProcessActivityLog
                            processId={process.id}
                            refreshToken={activityLogRefreshToken}
                        />
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
                showOpsFlow={canSendToOpsFlow}
                onOpsFlow={() => void openOpsFlowModal(Array.from(selectedIds))}
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
                showOpsFlow={canSendToOpsFlow}
                onOpsFlowSend={() => {
                    if (drawerCandidate) void openOpsFlowModal([drawerCandidate.id]);
                }}
                opsFlowRefreshToken={opsFlowRefreshToken}
                activityLogRefreshToken={activityLogRefreshToken}
                userNameById={userNameById}
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

            {showAddRowModal && process && (
                <BulkAddRowModal
                    process={process}
                    rowNumber={total + 1}
                    onClose={() => setShowAddRowModal(false)}
                    onSuccess={handleAddRowSuccess}
                />
            )}

            {showImportModal && process && (
                <BulkProcessImportModal
                    process={process}
                    restoreMode={importRestoreMode}
                    onClose={() => {
                        setShowImportModal(false);
                        setImportRestoreMode(false);
                    }}
                    onImportComplete={() => {
                        setShowImportModal(false);
                        setImportRestoreMode(false);
                        loadCandidates(0, true);
                        logActivity('import', {
                            details: { summary: importRestoreMode ? 'Restauración desde Excel' : 'Importación de candidatos' },
                        });
                    }}
                />
            )}

            {showRecoveryModal && process && (
                <BulkColumnRecoveryModal
                    process={process}
                    customColumns={customColumns}
                    candidateIds={new Set(candidates.map(c => c.id))}
                    onClose={() => setShowRecoveryModal(false)}
                    onRecovered={() => {
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

            {opsFlowModalLoading && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
                    <div className="bg-white rounded-lg px-6 py-4 flex items-center gap-3 shadow-xl">
                        <Loader2 className="w-5 h-5 animate-spin text-primary-600" />
                        <span className="text-sm text-gray-700">Preparando envío a OpsFlow…</span>
                    </div>
                </div>
            )}

            {showOpsFlowModal && (
                <SendToOpsFlowModal
                    isOpen={showOpsFlowModal}
                    onClose={() => {
                        setShowOpsFlowModal(false);
                        setOpsFlowCandidates([]);
                    }}
                    candidates={opsFlowCandidates}
                    onSent={handleOpsFlowSent}
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
                    currentLayout={{
                        columns: customColumns,
                        columnOrder,
                        hiddenColumns,
                        pinnedColumns,
                        columnWidths,
                    }}
                    onLoadTemplate={handleLoadTemplate}
                />
            )}

            {showExportModal && process && (
                <BulkTableExportModal
                    isOpen={showExportModal}
                    onClose={() => setShowExportModal(false)}
                    process={process}
                    columnOrder={columnOrder}
                    visibleColumns={visibleColumns}
                    customColumns={customColumns}
                    columnValues={columnValues as Record<string, Record<string, unknown>>}
                    displayCandidates={displayCandidates}
                    hasMore={hasMore}
                    total={total}
                    searchQuery={debouncedSearch}
                    selectedIds={Array.from(selectedIds)}
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
                    customColumns={customColumns}
                    columnValues={columnValues}
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
                    customColumns={customColumns}
                    columnValues={columnValues}
                />
            )}

            {showIdealProfileModal && process && (
                <BulkIdealProfileModal
                    isOpen={showIdealProfileModal}
                    onClose={() => setShowIdealProfileModal(false)}
                    process={process}
                    customColumns={customColumns}
                    columnOrder={columnOrder}
                    onSave={handleSaveIdealProfile}
                />
            )}
        </div>
    );
};
