import React, { useEffect, useState } from 'react';
import { PersuasionConsole } from './PersuasionConsole';
import {
    LIENZO_CHANNEL,
    lienzoToBulkCandidate,
    loadLienzoLaunch,
    type LienzoLaunch,
} from '../../lib/persuasion/popup';
import { persuasionScriptStorageKey } from '../../lib/persuasion/storage';
import { persuasionProcessRevision } from '../../lib/api/persuasion';

function readProcessId(): string {
    return new URLSearchParams(window.location.search).get('proceso') || '';
}

export const PersuasionPopup: React.FC = () => {
    const processId = readProcessId();
    const [launch, setLaunch] = useState<LienzoLaunch | null>(() => loadLienzoLaunch(processId));
    const [candidateId, setCandidateId] = useState(
        () => new URLSearchParams(window.location.search).get('candidato') || loadLienzoLaunch(processId)?.candidateId || ''
    );
    const [scriptTick, setScriptTick] = useState(0);

    useEffect(() => {
        const channel = new BroadcastChannel(LIENZO_CHANNEL);
        channel.onmessage = (event: MessageEvent<LienzoLaunch & { type?: string }>) => {
            const data = event.data;
            if (!data || data.type !== 'open' || data.processId !== processId) return;
            setLaunch({
                processId: data.processId,
                processTitle: data.processTitle,
                candidateId: data.candidateId,
                candidates: Array.isArray(data.candidates) ? data.candidates : [],
            });
            setCandidateId(data.candidateId);
        };
        const onStorage = (event: StorageEvent) => {
            if (event.key === persuasionScriptStorageKey(processId)) setScriptTick(tick => tick + 1);
        };
        window.addEventListener('storage', onStorage);
        let revision = '';
        const look = () => {
            void persuasionProcessRevision(processId).then(at => {
                if (!at) return;
                if (!revision) {
                    revision = at;
                    return;
                }
                if (at === revision) return;
                revision = at;
                setScriptTick(tick => tick + 1);
            });
        };
        look();
        const poll = window.setInterval(look, 20000);
        return () => {
            channel.close();
            window.removeEventListener('storage', onStorage);
            window.clearInterval(poll);
        };
    }, [processId]);

    const candidates = (launch?.candidates ?? []).map(lienzoToBulkCandidate);
    const candidate = candidates.find(item => item.id === candidateId) ?? candidates[0];

    useEffect(() => {
        if (!candidate) return;
        document.title = `Lienzo · ${candidate.name}`;
        const url = new URL(window.location.href);
        if (url.searchParams.get('candidato') === candidate.id) return;
        url.searchParams.set('candidato', candidate.id);
        window.history.replaceState({}, '', url.toString());
    }, [candidate]);

    if (!launch || !candidate) {
        return (
            <div className="flex h-screen items-center justify-center bg-white p-8 text-center">
                <p className="max-w-sm text-sm text-gray-600">
                    Abre el lienzo desde el icono de una fila en la tabla de candidatos.
                </p>
            </div>
        );
    }

    return (
        <PersuasionConsole
            candidate={candidate}
            processId={processId}
            processTitle={launch.processTitle}
            candidates={candidates}
            scriptTick={scriptTick}
            onClose={() => window.close()}
            onCandidateChange={next => setCandidateId(next.id)}
        />
    );
};
