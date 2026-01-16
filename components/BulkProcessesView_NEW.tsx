import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppState } from '../App';
import { bulkCandidatesApi, BulkCandidate } from '../lib/api/bulkCandidates';
import { processesApi } from '../lib/api/processes';
import { Check, X, Loader2, Send, Archive, Search, ChevronDown, ChevronUp, Plus, Edit, Trash2, ArrowLeft } from 'lucide-react';
import { Process } from '../types';
import { BulkProcessEditorModal } from './BulkProcessEditorModal';

interface BulkProcessesViewProps {}

// Drawer lateral para mostrar detalles del candidato
const CandidateDrawer: React.FC<{
    candidate: BulkCandidate | null;
    isOpen: boolean;
    onClose: () => void;
    onLoadDetails: (candidateId: string) => Promise<void>;
    process?: Process;
}> = ({ candidate, isOpen, onClose, onLoadDetails, process }) => {
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
                                {displayCandidate.scoreIa !== undefined && (
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

// Tooltip para mostrar metadata_ia al hover
const MetadataTooltip: React.FC<{
    metadata: string;
    children: React.ReactNode;
}> = ({ metadata, children }) => {
    const [isVisible, setIsVisible] = useState(false);
    if (!metadata) return <>{children}</>;
    return (
        <div className="relative inline-block" onMouseEnter={() => setIsVisible(true)} onMouseLeave={() => setIsVisible(false)}>
            {children}
            {isVisible && (
                <div className="absolute z-50 w-80 p-3 bg-gray-900 text-white text-sm rounded-lg shadow-xl left-0 top-full mt-2">
                    <p className="whitespace-pre-wrap">{metadata}</p>
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
}> = ({ selectedIds, onApprove, onReject, onArchive, onWebhook }) => {
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
                    <button onClick={() => { onWebhook(); setIsOpen(false); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700 transition-colors">
                        <Send className="w-4 h-4" /> Enviar a n8n ({selectedIds.length})
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

    const pageSize = 50;

    const process = useMemo(() => {
        if (!selectedProcess) return undefined;
        return bulkProcesses.find(p => p.id === selectedProcess);
    }, [selectedProcess, bulkProcesses]);

    // Cargar procesos masivos
    const loadBulkProcesses = useCallback(async () => {
        setIsLoadingProcesses(true);
        try {
            const processes = await processesApi.getAllBulkProcesses();
            setBulkProcesses(processes);
            if (processes.length > 0 && !selectedProcess) {
                setSelectedProcess(processes[0].id);
            }
        } catch (error) {
            console.error('Error cargando procesos masivos:', error);
            actions.showToast('Error al cargar procesos masivos', 'error', 3000);
        } finally {
            setIsLoadingProcesses(false);
        }
    }, [selectedProcess, actions]);

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

    const applyOptimisticUpdate = useCallback((candidateId: string, updates: Partial<BulkCandidate>) => {
        setOptimisticUpdates(prev => new Map(prev).set(candidateId, updates));
        setCandidates(prev => prev.map(c => c.id === candidateId ? { ...c, ...updates } : c));
    }, []);

    const updateCandidateStatus = useCallback(async (candidateId: string, updates: { stageId?: string; discarded?: boolean; archived?: boolean }) => {
        applyOptimisticUpdate(candidateId, updates);
        try {
            await bulkCandidatesApi.updateCandidate(candidateId, updates);
            setOptimisticUpdates(prev => {
                const newMap = new Map(prev);
                newMap.delete(candidateId);
                return newMap;
            });
        } catch (error) {
            console.error('Error actualizando candidato:', error);
            loadCandidates(currentPage, true);
            actions.showToast('Error al actualizar candidato', 'error', 3000);
        }
    }, [applyOptimisticUpdate, loadCandidates, currentPage, actions]);

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
                                    <div
                                        key={p.id}
                                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                                        onClick={() => setSelectedProcess(p.id)}
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <h3 className="font-semibold text-gray-900">{p.title}</h3>
                                            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    onClick={() => handleEditProcess(p)}
                                                    className="p-1 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                                    title="Editar"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteProcess(p.id)}
                                                    className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                        {p.description && (
                                            <p className="text-sm text-gray-600 mb-2 line-clamp-2">{p.description}</p>
                                        )}
                                        <div className="flex items-center gap-4 text-xs text-gray-500">
                                            <span>{p.stages.length} etapas</span>
                                            <span>{p.vacancies} vacante{p.vacancies !== 1 ? 's' : ''}</span>
                                            <span className="capitalize">{p.status}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => {
                                    setSelectedProcess('');
                                    setCandidates([]);
                                    setSelectedStage('');
                                    setSearchQuery('');
                                }}
                                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Volver a procesos
                            </button>
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700">
                                    Proceso: {process?.title}
                                </label>
                            </div>
                        </div>
                        
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
                    </>
                )}
            </div>

            {selectedProcess && (
                <div className="flex-1 overflow-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                            <tr>
                                <th className="px-4 py-3 text-left">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.size === candidates.length && candidates.length > 0}
                                        onChange={toggleSelectAll}
                                        className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                                    />
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teléfono</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score IA</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Etapa</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {candidates.map(candidate => {
                                const stage = process?.stages.find(s => s.id === candidate.stageId);
                                const isSelected = selectedIds.has(candidate.id);
                                const optimistic = optimisticUpdates.get(candidate.id);
                                const displayCandidate = optimistic ? { ...candidate, ...optimistic } : candidate;

                                return (
                                    <tr
                                        key={candidate.id}
                                        className={`hover:bg-gray-50 cursor-pointer ${isSelected ? 'bg-primary-50' : ''}`}
                                        onClick={() => openDrawer(candidate)}
                                    >
                                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => toggleSelection(candidate.id)}
                                                className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <MetadataTooltip metadata={displayCandidate.metadataIa || ''}>
                                                <span className="font-medium text-gray-900">{displayCandidate.name}</span>
                                            </MetadataTooltip>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-500">{displayCandidate.phone || 'N/A'}</td>
                                        <td className="px-4 py-3 text-sm text-gray-500">
                                            {displayCandidate.scoreIa !== undefined ? displayCandidate.scoreIa : 'N/A'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-500">{stage?.name || 'N/A'}</td>
                                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => updateCandidateStatus(candidate.id, {
                                                        stageId: process?.stages[process.stages.length - 1]?.id,
                                                    })}
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
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {isLoading && (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
                            <span className="ml-2 text-gray-600">Cargando...</span>
                        </div>
                    )}

                    {!isLoading && candidates.length === 0 && (
                        <div className="text-center py-12 text-gray-500">No hay candidatos para mostrar</div>
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
        </div>
    );
};
