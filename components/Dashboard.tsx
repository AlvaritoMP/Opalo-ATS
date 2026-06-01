import React, { useState, useMemo, useEffect } from 'react';
import { useAppState } from '../App';
import { Briefcase, Users, FileText, CheckCircle, Calendar, Grid3x3, Phone, TrendingUp, UserCheck, Headphones, UserPlus, MessageCircle, Mail } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, CartesianGrid, XAxis, YAxis, Bar, LineChart, Line } from 'recharts';
import { Candidate, Process } from '../types';
import { resolveCandidateAgeForProcess } from '../lib/bulkTableColumns';
import { bulkCandidatesApi } from '../lib/api/bulkCandidates';
import { contactTrackingApi } from '../lib/api/contactTracking';
import {
    computeContactDashboardStats,
    buildChannelDailyTrendByUser,
    type ContactConsultantPeriod,
    type ContactDailyTrendSeries,
} from '../lib/contactDashboardStats';
import { computeHiringStageConsultantStats } from '../lib/hiringStageTracking';
import {
    buildUserLookupForStats,
    enrichContactAttemptsForStats,
} from '../lib/dashboardActorNames';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#6366f1', '#14b8a6', '#f97316'];

const StatCard: React.FC<{
    icon: React.ElementType;
    title: string;
    value: number | string;
    subtitle: string;
    color: string;
}> = ({ icon: Icon, title, value, subtitle, color }) => (
    <div className="bg-white p-4 md:p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-start gap-3 md:gap-4">
            <div className={`p-2 md:p-3 rounded-full flex-shrink-0 ${color}`}>
                <Icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-xs md:text-sm text-gray-500">{title}</p>
                <p className="text-xl md:text-2xl font-bold text-gray-800">{value}</p>
                <p className="text-xs text-gray-400 mt-1 leading-snug">{subtitle}</p>
            </div>
        </div>
    </div>
);

const ChartContainer: React.FC<{
    title: string;
    description?: string;
    children: React.ReactNode;
    hasData: boolean;
    className?: string;
    height?: number;
}> = ({ title, description, children, hasData, className = '', height = 280 }) => (
    <div className={`bg-white p-4 md:p-6 rounded-xl border border-gray-200 shadow-sm ${className}`}>
        <h2 className="text-lg md:text-xl font-semibold text-gray-800">{title}</h2>
        {description && <p className="text-xs md:text-sm text-gray-500 mt-1 mb-3">{description}</p>}
        {!description && <div className="mb-3 md:mb-4" />}
        {hasData ? (
            <ResponsiveContainer width="100%" height={height}>
                {children}
            </ResponsiveContainer>
        ) : (
            <div className="flex items-center justify-center text-gray-500 text-sm md:text-base" style={{ height }}>
                Sin datos para los filtros seleccionados.
            </div>
        )}
    </div>
);

const translateSource = (source: string) => {
    switch (source.toLowerCase()) {
        case 'linkedin': return 'LinkedIn';
        case 'referral': return 'Referido';
        case 'website': return 'Sitio web';
        case 'other': return 'Otro';
        default: return source;
    }
};

const normalizeDistrictName = (raw?: string): string | null => {
    if (!raw?.trim()) return null;
    return raw
        .trim()
        .replace(/\s+/g, ' ')
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
};

const isHiredInProcess = (candidate: Candidate, process?: Process): boolean => {
    if (!process?.stages?.length) return false;
    const lastStageId = process.stages[process.stages.length - 1].id;
    return candidate.stageId === lastStageId && !candidate.discarded;
};

const getStageName = (candidate: Candidate, processes: Process[]): string => {
    const process = processes.find(p => p.id === candidate.processId);
    return process?.stages.find(s => s.id === candidate.stageId)?.name || 'Sin etapa';
};

const truncateLabel = (label: string, max = 28): string =>
    label.length > max ? `${label.slice(0, max - 1)}…` : label;

const topNWithOthers = (
    entries: [string, number][],
    limit: number
): { name: string; Candidatos: number }[] => {
    const sorted = [...entries].sort((a, b) => b[1] - a[1]);
    if (sorted.length <= limit) {
        return sorted.map(([name, Candidatos]) => ({ name, Candidatos }));
    }
    const top = sorted.slice(0, limit);
    const others = sorted.slice(limit).reduce((sum, [, count]) => sum + count, 0);
    return [
        ...top.map(([name, Candidatos]) => ({ name, Candidatos })),
        { name: 'Otros', Candidatos: others },
    ];
};

const ContactDailyTrendChart: React.FC<{ series: ContactDailyTrendSeries }> = ({ series }) => {
    const hasData = series.data.some(row => series.users.some(u => Number(row[u]) > 0));
    const isDaily = series.granularity === 'day';
    const unitSingular = series.unitLabel.replace(/s$/, '') || series.unitLabel;

    return (
        <ChartContainer
            title={
                isDaily
                    ? `${series.channelLabel} por día por usuario`
                    : `${series.channelLabel} por mes por usuario`
            }
            description={
                isDaily
                    ? `Cantidad ejecutada cada día en ${series.periodLabel.toLowerCase()} (no acumulativa). Hasta ${series.users.length} usuarios con más actividad.`
                    : `Cantidad ejecutada cada mes en ${series.periodLabel.toLowerCase()} (no acumulativa).`
            }
            hasData={hasData}
            height={320}
            className="mb-6"
        >
            <LineChart data={series.data} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10 }}
                    interval={isDaily ? 'preserveStartEnd' : 0}
                />
                <YAxis allowDecimals={false} />
                <Tooltip
                    formatter={(value: number, name: string) => [
                        `${value} ${value === 1 ? unitSingular : series.unitLabel}`,
                        truncateLabel(name, 24),
                    ]}
                />
                <Legend formatter={(value: string) => truncateLabel(value, 20)} />
                {series.users.map((userName, index) => (
                    <Line
                        key={userName}
                        type="monotone"
                        dataKey={userName}
                        name={userName}
                        stroke={COLORS[index % COLORS.length]}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                    />
                ))}
            </LineChart>
        </ChartContainer>
    );
};

export const Dashboard: React.FC = () => {
    const { state, getLabel, actions } = useAppState();
    const { processes, candidates: allCandidates, interviewEvents, users, currentUser, dashboardFilters } = state;

    const {
        processFilter,
        processScopeFilter,
        dateFilter,
        contactConsultantPeriod,
    } = dashboardFilters;

    const setProcessFilter = (value: string) => actions.setDashboardFilters({ processFilter: value });
    const setProcessScopeFilter = (value: 'all' | 'bulk' | 'standard') =>
        actions.setDashboardFilters({ processScopeFilter: value, processFilter: 'all' });
    const setDateFilter = (patch: Partial<{ start: string; end: string }>) =>
        actions.setDashboardFilters({ dateFilter: { ...dateFilter, ...patch } });
    const setContactConsultantPeriod = (value: ContactConsultantPeriod) =>
        actions.setDashboardFilters({ contactConsultantPeriod: value });

    const statsUsers = useMemo(
        () => buildUserLookupForStats(users, currentUser),
        [users, currentUser]
    );

    const scopedProcesses = useMemo(() => {
        if (processScopeFilter === 'bulk') return processes.filter(p => p.isBulkProcess);
        if (processScopeFilter === 'standard') return processes.filter(p => !p.isBulkProcess);
        return processes;
    }, [processes, processScopeFilter]);

    useEffect(() => {
        const validIds = new Set(scopedProcesses.map(p => p.id));
        if (processFilter !== 'all' && !validIds.has(processFilter)) {
            actions.setDashboardFilters({ processFilter: 'all' });
        }
    }, [scopedProcesses, processFilter, actions]);

    const processMap = useMemo(() => new Map(processes.map(p => [p.id, p])), [processes]);

    /** Datos masivos por candidato (columnas + edad desde API de procesos masivos) */
    const [bulkCandidateFields, setBulkCandidateFields] = useState<
        Record<string, { bulkColumnValues?: Record<string, unknown>; age?: number }>
    >({});

    const [contactAttempts, setContactAttempts] = useState<Awaited<ReturnType<typeof contactTrackingApi.getAttemptsForProcesses>>>([]);
    const [contactStatsLoading, setContactStatsLoading] = useState(false);

    useEffect(() => {
        const bulkProcessIds = [
            ...new Set(
                scopedProcesses.filter(p => p.isBulkProcess).map(p => p.id)
            ),
        ];
        if (bulkProcessIds.length === 0) {
            setBulkCandidateFields({});
            return;
        }

        let cancelled = false;
        (async () => {
            const merged: Record<string, { bulkColumnValues?: Record<string, unknown>; age?: number }> = {};
            for (const processId of bulkProcessIds) {
                try {
                    const all = await bulkCandidatesApi.getAllCandidates(processId);
                    for (const c of all) {
                        const prev = merged[c.id] || {};
                        merged[c.id] = {
                            age: c.age ?? prev.age,
                            bulkColumnValues: {
                                ...(prev.bulkColumnValues || {}),
                                ...(c.bulkColumnValues || {}),
                            },
                        };
                    }
                } catch {
                    /* continuar con localStorage vía resolveCandidateAgeForProcess */
                }
            }
            if (!cancelled) setBulkCandidateFields(merged);
        })();

        return () => {
            cancelled = true;
        };
    }, [scopedProcesses, processMap]);

    const targetProcessIds = useMemo(() => {
        if (processFilter !== 'all') return [processFilter];
        return scopedProcesses.map(p => p.id);
    }, [processFilter, scopedProcesses]);

    useEffect(() => {
        if (targetProcessIds.length === 0) {
            setContactAttempts([]);
            return;
        }

        let cancelled = false;
        setContactStatsLoading(true);
        (async () => {
            try {
                const attempts = await contactTrackingApi.getAttemptsForProcesses(targetProcessIds);
                if (!cancelled) setContactAttempts(attempts);
            } catch {
                if (!cancelled) setContactAttempts([]);
            } finally {
                if (!cancelled) setContactStatsLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [targetProcessIds]);

    const filteredCandidates = useMemo(() => {
        const userRole = state.currentUser?.role;
        const isClientOrViewer = userRole === 'client' || userRole === 'viewer';
        const scopedProcessIds = new Set(scopedProcesses.map(p => p.id));

        return allCandidates.filter(candidate => {
            if (isClientOrViewer && !candidate.visibleToClients) return false;
            if (!scopedProcessIds.has(candidate.processId)) return false;

            const processMatch = processFilter === 'all' || candidate.processId === processFilter;

            const firstMove = candidate.history[0]?.movedAt;
            if (!firstMove) return processMatch;

            const applicationDate = new Date(firstMove);
            const startDate = dateFilter.start ? new Date(dateFilter.start) : null;
            const endDate = dateFilter.end ? new Date(dateFilter.end) : null;
            if (startDate) startDate.setHours(0, 0, 0, 0);
            if (endDate) endDate.setHours(23, 59, 59, 999);

            const dateMatch =
                (!startDate || applicationDate >= startDate) &&
                (!endDate || applicationDate <= endDate);

            return processMatch && dateMatch;
        });
    }, [allCandidates, processFilter, dateFilter, scopedProcesses, state.currentUser?.role]);

    const activeProcesses = scopedProcesses.filter(p => p.status === 'en_proceso');
    const bulkActiveCount = activeProcesses.filter(p => p.isBulkProcess).length;
    const standardActiveCount = activeProcesses.length - bulkActiveCount;

    const bulkCandidates = filteredCandidates.filter(c => processMap.get(c.processId)?.isBulkProcess).length;
    const standardCandidates = filteredCandidates.length - bulkCandidates;

    const discardedCandidates = filteredCandidates.filter(c => c.discarded === true).length;
    const activeCandidates = filteredCandidates.filter(c => !c.discarded).length;

    const hiredCandidates = filteredCandidates.filter(c =>
        isHiredInProcess(c, processMap.get(c.processId))
    ).length;

    const conversionRate = activeCandidates > 0
        ? Math.round((hiredCandidates / activeCandidates) * 1000) / 10
        : null;

    const candidateSources = useMemo(() => {
        const sourceMap = new Map<string, number>();
        filteredCandidates.forEach(c => {
            const source = translateSource(c.source || 'Otro');
            sourceMap.set(source, (sourceMap.get(source) || 0) + 1);
        });
        return Array.from(sourceMap, ([name, value]) => ({ name, value }));
    }, [filteredCandidates]);

    const candidateDistricts = useMemo(() => {
        const districtMap = new Map<string, number>();
        filteredCandidates.forEach(c => {
            const district = normalizeDistrictName(c.district);
            const key = district || 'Sin distrito';
            districtMap.set(key, (districtMap.get(key) || 0) + 1);
        });
        return topNWithOthers(Array.from(districtMap.entries()), 10);
    }, [filteredCandidates]);

    const candidatesByStage = useMemo(() => {
        const stageMap = new Map<string, number>();
        filteredCandidates.forEach(c => {
            const stageName = getStageName(c, processes);
            stageMap.set(stageName, (stageMap.get(stageName) || 0) + 1);
        });

        if (processFilter !== 'all') {
            const process = processMap.get(processFilter);
            if (process?.stages?.length) {
                return process.stages
                    .map(stage => ({
                        name: stage.name,
                        Candidatos: stageMap.get(stage.name) || 0,
                    }))
                    .filter(d => d.Candidatos > 0);
            }
        }

        return topNWithOthers(Array.from(stageMap.entries()), 12);
    }, [filteredCandidates, processes, processFilter, processMap]);

    const candidatesByPosition = useMemo(() => {
        const positionMap = new Map<string, number>();
        filteredCandidates.forEach(c => {
            const process = processMap.get(c.processId);
            const label = process?.title?.trim() || 'Sin puesto asignado';
            positionMap.set(label, (positionMap.get(label) || 0) + 1);
        });
        return topNWithOthers(Array.from(positionMap.entries()), 8);
    }, [filteredCandidates, processMap]);

    const ageDistribution = useMemo(() => {
        const ageBrackets: Record<string, number> = {
            '<20': 0,
            '20-29': 0,
            '30-39': 0,
            '40-49': 0,
            '50+': 0,
            'Sin dato': 0,
        };
        filteredCandidates.forEach(c => {
            const process = processMap.get(c.processId);
            const bulkExtra = bulkCandidateFields[c.id];
            const enrichedRow = {
                ...(c.bulkColumnValues || {}),
                ...(bulkExtra?.bulkColumnValues || {}),
            };
            const age = resolveCandidateAgeForProcess(
                {
                    id: c.id,
                    age: bulkExtra?.age ?? c.age,
                    bulkColumnValues: Object.keys(enrichedRow).length > 0 ? enrichedRow : undefined,
                },
                process,
                bulkExtra?.bulkColumnValues
                    ? { [c.id]: bulkExtra.bulkColumnValues }
                    : {}
            );
            if (age == null) {
                ageBrackets['Sin dato']++;
            } else if (age < 20) ageBrackets['<20']++;
            else if (age <= 29) ageBrackets['20-29']++;
            else if (age <= 39) ageBrackets['30-39']++;
            else if (age <= 49) ageBrackets['40-49']++;
            else ageBrackets['50+']++;
        });
        return Object.entries(ageBrackets)
            .filter(([, count]) => count > 0)
            .map(([name, Candidatos]) => ({ name, Candidatos }));
    }, [filteredCandidates, processMap, bulkCandidateFields]);

    const upcomingInterviews = useMemo(() => {
        const now = new Date();
        const filteredIds = new Set(filteredCandidates.map(c => c.id));
        return interviewEvents
            .filter(event => event.start > now && filteredIds.has(event.candidateId))
            .sort((a, b) => a.start.getTime() - b.start.getTime())
            .slice(0, 5);
    }, [interviewEvents, filteredCandidates]);

    const timeToHire = useMemo(() => {
        const hiredCandidatesWithDates = filteredCandidates
            .filter(c => {
                const process = processMap.get(c.processId);
                if (!process?.stages?.length) return false;
                const lastStageId = process.stages[process.stages.length - 1]?.id;
                return c.stageId === lastStageId && (c.offerAcceptedDate || c.hireDate);
            })
            .map(c => {
                const process = processMap.get(c.processId);
                const publishedDate = process?.publishedDate || process?.startDate;
                const acceptedDate = c.offerAcceptedDate || c.hireDate;
                if (!publishedDate || !acceptedDate) return null;
                const published = new Date(publishedDate);
                const accepted = new Date(acceptedDate);
                const days = Math.ceil((accepted.getTime() - published.getTime()) / (1000 * 60 * 60 * 24));
                return days >= 0 ? days : null;
            })
            .filter((days): days is number => days !== null);

        if (hiredCandidatesWithDates.length === 0) return null;
        const average = hiredCandidatesWithDates.reduce((sum, days) => sum + days, 0) / hiredCandidatesWithDates.length;
        return Math.round(average * 10) / 10;
    }, [filteredCandidates, processMap]);

    const timeToFill = useMemo(() => {
        const filledProcesses = scopedProcesses
            .filter(p => {
                if (!p.needIdentifiedDate) return false;
                const processCandidates = filteredCandidates.filter(c => c.processId === p.id);
                if (!p.stages?.length) return false;
                const lastStageId = p.stages[p.stages.length - 1]?.id;
                const hiredCount = processCandidates.filter(c => c.stageId === lastStageId).length;
                return hiredCount >= p.vacancies;
            })
            .map(p => {
                const processCandidates = filteredCandidates.filter(c => c.processId === p.id);
                if (!p.stages?.length) return null;
                const lastStageId = p.stages[p.stages.length - 1]?.id;
                const lastHired = processCandidates
                    .filter(c => c.stageId === lastStageId)
                    .sort((a, b) => {
                        const dateA = a.offerAcceptedDate || a.hireDate || '';
                        const dateB = b.offerAcceptedDate || b.hireDate || '';
                        return dateB.localeCompare(dateA);
                    })[0];

                if (!lastHired || !p.needIdentifiedDate) return null;

                const needDate = new Date(p.needIdentifiedDate);
                const fillDate = new Date(lastHired.offerAcceptedDate || lastHired.hireDate || '');
                const days = Math.ceil((fillDate.getTime() - needDate.getTime()) / (1000 * 60 * 60 * 24));
                return days >= 0 ? days : null;
            })
            .filter((days): days is number => days !== null);

        if (filledProcesses.length === 0) return null;
        const average = filledProcesses.reduce((sum, days) => sum + days, 0) / filledProcesses.length;
        return Math.round(average * 10) / 10;
    }, [filteredCandidates, scopedProcesses]);

    const stageDuration = useMemo(() => {
        const stageDurations: Record<string, number[]> = {};
        const stageNames: Record<string, string> = {};

        filteredCandidates.forEach(candidate => {
            if (!candidate.history || candidate.history.length < 2) return;

            for (let i = 1; i < candidate.history.length; i++) {
                const prevStage = candidate.history[i - 1];
                const currentStage = candidate.history[i];

                const prevDate = new Date(prevStage.movedAt);
                const currentDate = new Date(currentStage.movedAt);
                const days = Math.ceil((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

                if (days >= 0) {
                    if (!stageDurations[prevStage.stageId]) stageDurations[prevStage.stageId] = [];
                    stageDurations[prevStage.stageId].push(days);

                    const process = processMap.get(candidate.processId);
                    const stageName = process?.stages.find(s => s.id === prevStage.stageId)?.name;
                    if (stageName) stageNames[prevStage.stageId] = stageName;
                }
            }
        });

        const byName = new Map<string, number[]>();
        for (const [stageId, durations] of Object.entries(stageDurations)) {
            const name = stageNames[stageId] || stageId;
            const existing = byName.get(name) || [];
            byName.set(name, [...existing, ...durations]);
        }

        return Array.from(byName.entries())
            .map(([stageName, durations]) => ({
                name: stageName,
                dias: Math.round((durations.reduce((s, d) => s + d, 0) / durations.length) * 10) / 10,
                muestras: durations.length,
            }))
            .sort((a, b) => b.dias - a.dias);
    }, [filteredCandidates, processMap]);

    const applicationCompletionRate = useMemo(() => {
        const started = filteredCandidates.filter(c => c.applicationStartedDate).length;
        const completed = filteredCandidates.filter(c => c.applicationCompletedDate).length;
        if (started === 0) return null;
        return Math.round((completed / started) * 1000) / 10;
    }, [filteredCandidates]);

    const scopedProcessIds = useMemo(
        () => new Set(targetProcessIds),
        [targetProcessIds]
    );

    const scopedContactAttempts = useMemo(
        () => contactAttempts.filter(a => scopedProcessIds.has(a.processId)),
        [contactAttempts, scopedProcessIds]
    );

    const enrichedContactAttempts = useMemo(
        () => enrichContactAttemptsForStats(scopedContactAttempts, statsUsers),
        [scopedContactAttempts, statsUsers]
    );

    const contactStats = useMemo(
        () => computeContactDashboardStats(enrichedContactAttempts, contactConsultantPeriod),
        [enrichedContactAttempts, contactConsultantPeriod]
    );

    const contactTrendOpts = useMemo(() => {
        const names: string[] = [];
        if (currentUser?.name?.trim()) names.push(currentUser.name.trim());
        return names;
    }, [currentUser?.name]);

    const callTrendSeries = useMemo(
        () => buildChannelDailyTrendByUser(enrichedContactAttempts, contactConsultantPeriod, 'call', 6, contactTrendOpts),
        [enrichedContactAttempts, contactConsultantPeriod, contactTrendOpts]
    );

    const whatsappTrendSeries = useMemo(
        () => buildChannelDailyTrendByUser(enrichedContactAttempts, contactConsultantPeriod, 'whatsapp', 6, contactTrendOpts),
        [enrichedContactAttempts, contactConsultantPeriod, contactTrendOpts]
    );

    const emailTrendSeries = useMemo(
        () => buildChannelDailyTrendByUser(enrichedContactAttempts, contactConsultantPeriod, 'email', 6, contactTrendOpts),
        [enrichedContactAttempts, contactConsultantPeriod, contactTrendOpts]
    );

    const hiringConsultantStats = useMemo(
        () =>
            computeHiringStageConsultantStats(
                filteredCandidates.map(c => ({
                    id: c.id,
                    processId: c.processId,
                    history: c.history,
                })),
                processMap,
                statsUsers
            ),
        [filteredCandidates, processMap, statsUsers]
    );

    const stageChartHeight = Math.max(280, candidatesByStage.length * 36);

    return (
        <div className="p-4 md:p-8 bg-gray-50/50 min-h-full overflow-y-auto">
            <div className="flex justify-between items-center mb-4 md:mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800">{getLabel('sidebar_dashboard', 'Panel')}</h1>
            </div>

            <div className="bg-white p-3 md:p-4 rounded-xl border border-gray-200 shadow-sm mb-6 md:mb-8 flex flex-col lg:flex-row lg:flex-wrap lg:items-end gap-3 md:gap-4">
                <div>
                    <label htmlFor="processScopeFilter" className="block text-sm font-medium text-gray-700 mb-1">Tipo de proceso</label>
                    <select
                        id="processScopeFilter"
                        value={processScopeFilter}
                        onChange={(e) => {
                            setProcessScopeFilter(e.target.value as 'all' | 'bulk' | 'standard');
                        }}
                        className="border-gray-300 rounded-md shadow-sm text-sm w-full md:w-auto"
                    >
                        <option value="all">Todos (regulares + masivos)</option>
                        <option value="bulk">Solo procesos masivos</option>
                        <option value="standard">Solo procesos regulares</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="processFilter" className="block text-sm font-medium text-gray-700 mb-1">Proceso</label>
                    <select
                        id="processFilter"
                        value={processFilter}
                        onChange={(e) => setProcessFilter(e.target.value)}
                        className="border-gray-300 rounded-md shadow-sm text-sm w-full md:w-auto max-w-xs"
                    >
                        <option value="all">Todos los procesos</option>
                        {scopedProcesses.map(p => (
                            <option key={p.id} value={p.id}>
                                {p.isBulkProcess ? `[Masivo] ${p.title}` : p.title}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">Postulación desde</label>
                    <input
                        type="date"
                        id="startDate"
                        value={dateFilter.start}
                        onChange={(e) => setDateFilter({ start: e.target.value })}
                        className="border-gray-300 rounded-md shadow-sm text-sm"
                    />
                </div>
                <div>
                    <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">Postulación hasta</label>
                    <input
                        type="date"
                        id="endDate"
                        value={dateFilter.end}
                        onChange={(e) => setDateFilter({ end: e.target.value })}
                        className="border-gray-300 rounded-md shadow-sm text-sm"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard
                    icon={Briefcase}
                    title="Procesos activos"
                    value={activeProcesses.length}
                    subtitle={`${bulkActiveCount} masivos · ${standardActiveCount} regulares en curso`}
                    color="bg-blue-500"
                />
                <StatCard
                    icon={Users}
                    title="Candidatos en alcance"
                    value={filteredCandidates.length}
                    subtitle={`${bulkCandidates} en masivos · ${standardCandidates} en regulares · ${activeCandidates} activos`}
                    color="bg-green-500"
                />
                <StatCard
                    icon={FileText}
                    title="Descartados"
                    value={discardedCandidates}
                    subtitle={
                        filteredCandidates.length > 0
                            ? `${Math.round((discardedCandidates / filteredCandidates.length) * 1000) / 10}% del total filtrado`
                            : 'Sin candidatos en el filtro actual'
                    }
                    color="bg-purple-500"
                />
                <StatCard
                    icon={CheckCircle}
                    title="Contratados"
                    value={hiredCandidates}
                    subtitle={
                        conversionRate !== null
                            ? `${conversionRate}% de conversión sobre candidatos activos`
                            : 'Sin candidatos activos en el filtro'
                    }
                    color="bg-teal-500"
                />
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-8">
                <h2 className="text-xl font-semibold text-gray-800 mb-1">Indicadores de Eficiencia</h2>
                <p className="text-sm text-gray-500 mb-4">Métricas calculadas sobre los candidatos y procesos del filtro actual.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <h3 className="text-sm font-medium text-blue-800 mb-1">Time to Hire</h3>
                        <p className="text-2xl font-bold text-blue-900">{timeToHire !== null ? `${timeToHire} días` : 'N/D'}</p>
                        <p className="text-xs text-blue-600 mt-1">Promedio desde publicación del proceso hasta aceptación de oferta</p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                        <h3 className="text-sm font-medium text-green-800 mb-1">Time to Fill</h3>
                        <p className="text-2xl font-bold text-green-900">{timeToFill !== null ? `${timeToFill} días` : 'N/D'}</p>
                        <p className="text-xs text-green-600 mt-1">Promedio desde identificación de necesidad hasta cubrir vacantes</p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                        <h3 className="text-sm font-medium text-purple-800 mb-1">Tasa de Finalización</h3>
                        <p className="text-2xl font-bold text-purple-900">
                            {applicationCompletionRate !== null ? `${applicationCompletionRate}%` : 'N/D'}
                        </p>
                        <p className="text-xs text-purple-600 mt-1">Postulaciones completadas vs. iniciadas (formularios Tally)</p>
                    </div>
                    <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                        <h3 className="text-sm font-medium text-orange-800 mb-1">Tasa de Conversión</h3>
                        <p className="text-2xl font-bold text-orange-900">
                            {conversionRate !== null ? `${conversionRate}%` : 'N/D'}
                        </p>
                        <p className="text-xs text-orange-600 mt-1">Contratados sobre candidatos activos (no descartados)</p>
                    </div>
                </div>

                {stageDuration.length > 0 && (
                    <div className="mt-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-1">Duración promedio por etapa</h3>
                        <p className="text-sm text-gray-500 mb-3">Días que los candidatos permanecen en cada etapa antes de avanzar.</p>
                        <ResponsiveContainer width="100%" height={Math.max(200, stageDuration.length * 40)}>
                            <BarChart data={stageDuration} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" unit=" d" />
                                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
                                <Tooltip
                                    formatter={(value: number, _name, item) => [
                                        `${value} días (${item.payload.muestras} movimientos)`,
                                        'Promedio',
                                    ]}
                                />
                                <Bar dataKey="dias" fill="#f97316" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-8">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-800 mb-1">Canales de atención</h2>
                        <p className="text-sm text-gray-500">
                            Uso y efectividad de llamadas, WhatsApp y correo sobre los candidatos del filtro actual.
                            La efectividad se mide cuando se marca &quot;Interesado&quot; al contactar.
                        </p>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                        <span className="text-xs font-medium text-gray-600">Rango (consultores y admin)</span>
                        <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-50">
                            {([
                                ['week', 'Semanal'],
                                ['month', 'Mensual'],
                                ['year', 'Anual'],
                            ] as const).map(([value, label]) => (
                                <button
                                    key={value}
                                    type="button"
                                    onClick={() => setContactConsultantPeriod(value)}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                        contactConsultantPeriod === value
                                            ? 'bg-white text-primary-700 shadow-sm border border-gray-200'
                                            : 'text-gray-600 hover:text-gray-900'
                                    }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {contactStatsLoading ? (
                    <p className="text-sm text-gray-500 py-6 text-center">Cargando datos de contacto…</p>
                ) : contactStats.totalActions === 0 ? (
                    <p className="text-sm text-gray-500 py-6 text-center">
                        Sin acciones de contacto en {contactStats.periodLabel.toLowerCase()} para los procesos y candidatos del filtro actual.
                    </p>
                ) : (
                    <>
                        <p className="text-xs text-gray-400 mb-4">{contactStats.periodLabel}</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
                            <StatCard
                                icon={Phone}
                                title="Más llamadas"
                                value={contactStats.topCaller?.userName ?? 'N/D'}
                                subtitle={
                                    contactStats.topCaller
                                        ? `${contactStats.topCaller.callCount} llamada${contactStats.topCaller.callCount !== 1 ? 's' : ''}`
                                        : 'Sin llamadas'
                                }
                                color="bg-violet-500"
                            />
                            <StatCard
                                icon={MessageCircle}
                                title="Más WhatsApp"
                                value={contactStats.topWhatsappUser?.userName ?? 'N/D'}
                                subtitle={
                                    contactStats.topWhatsappUser
                                        ? `${contactStats.topWhatsappUser.count} contacto${contactStats.topWhatsappUser.count !== 1 ? 's' : ''}`
                                        : 'Sin WhatsApp'
                                }
                                color="bg-emerald-500"
                            />
                            <StatCard
                                icon={Mail}
                                title="Más correos"
                                value={contactStats.topEmailUser?.userName ?? 'N/D'}
                                subtitle={
                                    contactStats.topEmailUser
                                        ? `${contactStats.topEmailUser.count} correo${contactStats.topEmailUser.count !== 1 ? 's' : ''}`
                                        : 'Sin correos'
                                }
                                color="bg-sky-500"
                            />
                            <StatCard
                                icon={UserCheck}
                                title="Llamadas efectivas"
                                value={contactStats.topEffectiveCaller?.userName ?? 'N/D'}
                                subtitle={
                                    contactStats.topEffectiveCaller
                                        ? `${contactStats.topEffectiveCaller.effectiveCalls} interesado${contactStats.topEffectiveCaller.effectiveCalls !== 1 ? 's' : ''} · ${contactStats.topEffectiveCaller.rate}%`
                                        : 'Sin interés por llamada'
                                }
                                color="bg-amber-500"
                            />
                            <StatCard
                                icon={TrendingUp}
                                title="Canal más usado"
                                value={contactStats.mostUsedChannel?.label ?? 'N/D'}
                                subtitle={
                                    contactStats.mostUsedChannel
                                        ? `${contactStats.mostUsedChannel.count} · ${contactStats.mostUsedChannel.pct}%`
                                        : 'Sin datos'
                                }
                                color="bg-indigo-500"
                            />
                            <StatCard
                                icon={Headphones}
                                title="Mayor efectividad"
                                value={contactStats.mostEffectiveChannel?.label ?? 'N/D'}
                                subtitle={
                                    contactStats.mostEffectiveChannel
                                        ? `${contactStats.mostEffectiveChannel.rate}% interesado`
                                        : 'Sin datos'
                                }
                                color="bg-teal-500"
                            />
                        </div>

                        <ContactDailyTrendChart series={callTrendSeries} />
                        <ContactDailyTrendChart series={whatsappTrendSeries} />
                        <ContactDailyTrendChart series={emailTrendSeries} />

                        <ChartContainer
                            title="Acciones por canal"
                            description="Total de contactos vs. los que terminaron en interesado en el periodo seleccionado."
                            hasData={contactStats.channelVolume.length > 0}
                            className="mt-2"
                        >
                            <BarChart data={contactStats.channelVolume} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis allowDecimals={false} />
                                <Tooltip
                                    formatter={(value: number, name: string) => {
                                        if (name === 'total') return [`${value} acciones`, 'Total'];
                                        if (name === 'effective') return [`${value} interesado${value !== 1 ? 's' : ''}`, 'Efectivas'];
                                        return [value, name];
                                    }}
                                />
                                <Legend />
                                <Bar dataKey="total" name="Total" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="effective" name="Interesado" fill="#10b981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ChartContainer>
                    </>
                )}
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-8">
                <h2 className="text-xl font-semibold text-gray-800 mb-1">Ingresos a contratación</h2>
                <p className="text-sm text-gray-500 mb-4">
                    Usuarios del equipo (consultores y administrador) que movieron candidatos a la última etapa del proceso, según el historial de etapas.
                </p>

                {hiringConsultantStats.totalHires === 0 ? (
                    <p className="text-sm text-gray-500 py-6 text-center">
                        Sin ingresos registrados a la etapa final para los candidatos del filtro actual.
                    </p>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                            <StatCard
                                icon={UserPlus}
                                title="Usuario con más ingresos"
                                value={hiringConsultantStats.topConsultant?.userName ?? 'N/D'}
                                subtitle={
                                    hiringConsultantStats.topConsultant
                                        ? `${hiringConsultantStats.topConsultant.hires} ingreso${hiringConsultantStats.topConsultant.hires !== 1 ? 's' : ''} a contratación`
                                        : 'Sin datos'
                                }
                                color="bg-indigo-500"
                            />
                            <StatCard
                                icon={TrendingUp}
                                title="Participación del líder"
                                value={
                                    hiringConsultantStats.topConsultant
                                        ? `${hiringConsultantStats.topConsultant.sharePct}%`
                                        : 'N/D'
                                }
                                subtitle={
                                    hiringConsultantStats.topConsultant
                                        ? `Del total de ${hiringConsultantStats.totalHires} ingreso${hiringConsultantStats.totalHires !== 1 ? 's' : ''} en el filtro`
                                        : 'Sin ingresos en el filtro'
                                }
                                color="bg-teal-500"
                            />
                            <StatCard
                                icon={CheckCircle}
                                title="Total ingresos"
                                value={hiringConsultantStats.totalHires}
                                subtitle="Candidatos movidos a la etapa final del proceso"
                                color="bg-blue-500"
                            />
                            <StatCard
                                icon={Users}
                                title="Usuarios activos"
                                value={hiringConsultantStats.rankings.length}
                                subtitle="Consultores y administrador con al menos un ingreso"
                                color="bg-violet-500"
                            />
                        </div>

                        <ChartContainer
                            title="Ingresos por usuario"
                            description="Candidatos que cada consultor o administrador movió a la etapa de contratación."
                            hasData={hiringConsultantStats.rankings.length > 0}
                            height={Math.max(280, hiringConsultantStats.rankings.length * 44)}
                        >
                            <BarChart
                                data={hiringConsultantStats.rankings}
                                layout="vertical"
                                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" allowDecimals={false} />
                                <YAxis
                                    type="category"
                                    dataKey="name"
                                    width={120}
                                    tick={{ fontSize: 11 }}
                                    tickFormatter={(v: string) => truncateLabel(v, 18)}
                                />
                                <Tooltip
                                    formatter={(value: number, _name, item) => [
                                        `${value} ingreso${value !== 1 ? 's' : ''} (${item.payload.share}% del total)`,
                                        'Contratación',
                                    ]}
                                />
                                <Bar dataKey="ingresos" name="Ingresos" fill="#6366f1" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ChartContainer>
                    </>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <ChartContainer
                    title="Candidatos por etapa"
                    description={
                        processFilter !== 'all'
                            ? 'Distribución actual según el pipeline del proceso seleccionado.'
                            : 'Agrupado por nombre de etapa. Al filtrar un proceso se respeta el orden del pipeline.'
                    }
                    hasData={candidatesByStage.some(d => d.Candidatos > 0)}
                    height={stageChartHeight}
                >
                    <BarChart data={candidatesByStage} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" allowDecimals={false} />
                        <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(value: number) => [`${value} candidato${value !== 1 ? 's' : ''}`, 'Total']} />
                        <Bar dataKey="Candidatos" fill="#6366f1" radius={[0, 4, 4, 0]} />
                    </BarChart>
                </ChartContainer>

                <ChartContainer
                    title={getLabel('dashboard_candidate_source', 'Fuentes de candidatos')}
                    description="Origen de postulación de los candidatos en el filtro actual."
                    hasData={candidateSources.length > 0}
                >
                    <PieChart>
                        <Pie
                            data={candidateSources}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={90}
                            fill="#8884d8"
                            dataKey="value"
                            nameKey="name"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                            {candidateSources.map((_entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip formatter={(value: number, name: string) => [`${value} candidatos`, name]} />
                        <Legend />
                    </PieChart>
                </ChartContainer>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <ChartContainer
                    title="Candidatos por puesto"
                    description="Cantidad de candidatos según el proceso o puesto al que postularon (incluye procesos masivos)."
                    hasData={candidatesByPosition.some(d => d.Candidatos > 0)}
                    height={Math.max(280, candidatesByPosition.length * 44)}
                >
                    <BarChart data={candidatesByPosition} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" allowDecimals={false} />
                        <YAxis
                            type="category"
                            dataKey="name"
                            width={150}
                            tick={{ fontSize: 11 }}
                            tickFormatter={(v: string) => truncateLabel(v, 22)}
                        />
                        <Tooltip formatter={(value: number) => [`${value} candidato${value !== 1 ? 's' : ''}`, 'Total']} />
                        <Bar dataKey="Candidatos" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
                    </BarChart>
                </ChartContainer>

                <ChartContainer
                    title={getLabel('dashboard_age_distribution', 'Distribución por edad')}
                    description="Rangos etarios de los candidatos filtrados."
                    hasData={ageDistribution.some(d => d.Candidatos > 0)}
                >
                    <BarChart data={ageDistribution} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis allowDecimals={false} />
                        <Tooltip formatter={(value: number) => [`${value} candidato${value !== 1 ? 's' : ''}`, 'Total']} />
                        <Bar dataKey="Candidatos" fill="#82ca9d" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ChartContainer>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <ChartContainer
                    title="Candidatos por distrito"
                    description="Solo se considera el campo distrito del candidato (no direcciones). Muestra los 10 distritos con más postulantes."
                    hasData={candidateDistricts.some(d => d.Candidatos > 0 && d.name !== 'Sin distrito') || candidateDistricts.some(d => d.name === 'Sin distrito' && d.Candidatos > 0)}
                    height={Math.max(280, candidateDistricts.length * 36)}
                >
                    <BarChart data={candidateDistricts} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" allowDecimals={false} />
                        <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(value: number) => [`${value} candidato${value !== 1 ? 's' : ''}`, 'Total']} />
                        <Bar dataKey="Candidatos" fill="#9333ea" radius={[0, 4, 4, 0]} />
                    </BarChart>
                </ChartContainer>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h2 className="text-xl font-semibold text-gray-800 mb-1 flex items-center">
                        <Calendar className="w-5 h-5 mr-2 text-primary-500" />
                        {getLabel('dashboard_upcoming_interviews', 'Próximas entrevistas')}
                    </h2>
                    <p className="text-sm text-gray-500 mb-4">Entrevistas programadas de candidatos incluidos en el filtro actual.</p>
                    <div className="space-y-3">
                        {upcomingInterviews.length > 0 ? (
                            upcomingInterviews.map(event => {
                                const candidate = allCandidates.find(c => c.id === event.candidateId);
                                const process = candidate ? processMap.get(candidate.processId) : undefined;
                                const interviewer = users.find(u => u.id === event.interviewerId);
                                return (
                                    <div key={event.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <div className="min-w-0">
                                            <p className="font-medium text-gray-900 truncate">{candidate?.name || 'Candidato desconocido'}</p>
                                            <p className="text-sm text-gray-500 truncate">
                                                {process?.title || 'Sin proceso'} · con {interviewer?.name || 'Entrevistador'}
                                            </p>
                                        </div>
                                        <div className="text-right flex-shrink-0 ml-4">
                                            <p className="text-sm font-medium text-gray-700">
                                                {event.start.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {event.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <p className="text-center text-gray-500 py-8">No hay entrevistas próximas para los candidatos filtrados.</p>
                        )}
                    </div>
                </div>
            </div>

            {(processScopeFilter === 'bulk' || bulkCandidates > 0) && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-start gap-3">
                    <Grid3x3 className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-indigo-900">Procesos masivos incluidos en el análisis</p>
                        <p className="text-xs text-indigo-700 mt-1">
                            {bulkCandidates} candidato{bulkCandidates !== 1 ? 's' : ''} de procesos masivos en el filtro actual.
                            Usa el filtro &quot;Solo procesos masivos&quot; para analizar únicamente reclutamiento de alto volumen.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};
