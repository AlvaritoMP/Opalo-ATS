import React, { useMemo, useState, useRef } from 'react';
import { useAppState } from '../App';
import { Candidate, Process } from '../types';
import { Search, Edit } from 'lucide-react';
import { CandidateDetailsModal } from './CandidateDetailsModal';

export const Candidates: React.FC = () => {
    const { state, getLabel } = useAppState();
    const [query, setQuery] = useState('');
    const [processId, setProcessId] = useState<string>('all');
    const [stageId, setStageId] = useState<string>('all');
    const [selected, setSelected] = useState<Candidate | null>(null);

    const stagesForProcess = useMemo(() => {
        if (processId === 'all') return [];
        const p = state.processes.find(p => p.id === processId);
        return p?.stages || [];
    }, [processId, state.processes]);

    const lower = query.trim().toLowerCase();
    const results = useMemo(() => {
        return state.candidates.filter(c => {
            const matchesText =
                !lower ||
                c.name.toLowerCase().includes(lower) ||
                c.email.toLowerCase().includes(lower) ||
                (c.phone || '').toLowerCase().includes(lower) ||
                (c.dni || '').toLowerCase().includes(lower) ||
                (c.address || '').toLowerCase().includes(lower) ||
                (c.source || '').toString().toLowerCase().includes(lower) ||
                (state.processes.find(p => p.id === c.processId)?.title || '').toLowerCase().includes(lower);
            const matchesProcess = processId === 'all' || c.processId === processId;
            const matchesStage = stageId === 'all' || c.stageId === stageId;
            return matchesText && matchesProcess && matchesStage;
        });
    }, [state.candidates, state.processes, lower, processId, stageId]);

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">{getLabel('menu_candidates', 'Candidatos')}</h1>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Buscar por nombre, email, teléfono, DNI, proceso..."
                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md shadow-sm"
                    />
                </div>
                <div>
                    <select value={processId} onChange={e => { setProcessId(e.target.value); setStageId('all'); }} className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3">
                        <option value="all">Todos los procesos</option>
                        {state.processes.map((p: Process) => <option key={p.id} value={p.id}>{p.title}</option>)}
                    </select>
                </div>
                <div>
                    <select value={stageId} onChange={e => setStageId(e.target.value)} className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" disabled={processId === 'all'}>
                        <option value="all">Todas las etapas</option>
                        {stagesForProcess.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                            <th className="px-6 py-3">Candidato</th>
                            <th className="px-6 py-3">Email</th>
                            <th className="px-6 py-3">Teléfono</th>
                            <th className="px-6 py-3">Proceso</th>
                            <th className="px-6 py-3">Etapa</th>
                            <th className="px-6 py-3">Fuente</th>
                            <th className="px-6 py-3"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {results.map(c => {
                            const process = state.processes.find(p => p.id === c.processId);
                            const stage = process?.stages.find(s => s.id === c.stageId);
                            return (
                                <tr key={c.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-6 py-3 font-medium text-gray-900 whitespace-nowrap">{c.name}</td>
                                    <td className="px-6 py-3">{c.email}</td>
                                    <td className="px-6 py-3">{c.phone || '-'}</td>
                                    <td className="px-6 py-3">{process?.title || '-'}</td>
                                    <td className="px-6 py-3">{stage?.name || '-'}</td>
                                    <td className="px-6 py-3">{c.source || '-'}</td>
                                    <td className="px-6 py-3 text-right">
                                        <button onClick={() => setSelected(c)} className="p-2 rounded-md hover:bg-gray-100" title="Editar">
                                            <Edit className="w-4 h-4 text-gray-600" />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                        {results.length === 0 && (
                            <tr>
                                <td className="px-6 py-8 text-center text-gray-500" colSpan={7}>Sin resultados</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {selected && <CandidateDetailsModal candidate={selected} onClose={() => setSelected(null)} />}
        </div>
    );
};



