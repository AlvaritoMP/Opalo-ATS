import React, { useMemo, useState } from 'react';
import {
    SHORTLIST_COLUMNS,
    canMoveShortlistColumn,
    formatShortlistWhen,
    nextShortlistColumn,
    shortlistColumnLabel,
    shortlistEventText,
} from '../lib/shortlists';
import { openAttachment } from '../lib/openAttachment';
import type { Shortlist, ShortlistColumnKey, ShortlistEvent, ShortlistMember } from '../types';

interface ShortlistBoardProps {
    shortlist: Shortlist;
    members: ShortlistMember[];
    events: ShortlistEvent[];
    mode: 'staff' | 'client';
    busy?: boolean;
    onMove: (memberId: string, column: ShortlistColumnKey) => void;
    onReject: (memberId: string, reason: string) => void;
    onComment: (memberId: string, body: string) => void;
    onCommentRoom: (body: string) => void;
    onProposeInterview: (memberId: string, proposal: InterviewProposal) => void;
    onRemove?: (memberId: string) => void;
    onOpenProcess?: (processId: string) => void;
}

export interface InterviewProposal {
    modality: 'presencial' | 'virtual';
    place: string;
    slots: { date: string; start: string; end: string }[];
}

function memberName(member: ShortlistMember): string {
    return member.candidate?.name || 'Candidato no disponible';
}

export const ShortlistBoard: React.FC<ShortlistBoardProps> = ({
    shortlist,
    members,
    events,
    mode,
    busy,
    onMove,
    onReject,
    onComment,
    onCommentRoom,
    onProposeInterview,
    onRemove,
    onOpenProcess,
}) => {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const closed = shortlist.status === 'closed';
    const roomComments = events.filter(event => event.eventType === 'comment' && event.payload?.scope === 'room').slice().reverse();
    const active = members.filter(member => member.status === 'active');
    const rejected = members.filter(member => member.status === 'rejected');
    const selected = members.find(member => member.id === selectedId) || null;

    const commentsByMember = useMemo(() => {
        const map = new Map<string, ShortlistEvent[]>();
        for (const event of events) {
            if (event.eventType !== 'comment' || !event.memberId) continue;
            if (event.payload?.kind === 'interview') continue;
            const list = map.get(event.memberId) || [];
            list.push(event);
            map.set(event.memberId, list);
        }
        return map;
    }, [events]);

    const dropOn = (column: ShortlistColumnKey) => {
        if (!draggingId || closed) return;
        const member = active.find(item => item.id === draggingId);
        setDraggingId(null);
        if (!member || !canMoveShortlistColumn(member.column, column, mode)) return;
        onMove(member.id, column);
    };

    return (
        <div className="space-y-4">
            <RoomThread comments={roomComments} closed={closed} busy={busy} onSend={onCommentRoom} />
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-4">
            <div className="space-y-4 min-w-0">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {SHORTLIST_COLUMNS.map(column => {
                        const cards = active.filter(member => member.column === column.key);
                        return (
                            <section
                                key={column.key}
                                className="bg-gray-100 rounded-xl p-3 min-h-[280px]"
                                onDragOver={event => {
                                    if (draggingId) event.preventDefault();
                                }}
                                onDrop={event => {
                                    event.preventDefault();
                                    dropOn(column.key);
                                }}
                            >
                                <header className="flex items-center justify-between mb-3 px-1">
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-800">{column.label}</h3>
                                        <p className="text-xs text-gray-500">{column.hint}</p>
                                    </div>
                                    <span className="text-xs font-semibold text-gray-600 bg-white rounded-full px-2 py-0.5">{cards.length}</span>
                                </header>
                                <div className="space-y-2">
                                    {cards.length === 0 && (
                                        <p className="text-xs text-gray-400 px-1 py-6 text-center">Nadie en este paso</p>
                                    )}
                                    {cards.map(member => (
                                        <article
                                            key={member.id}
                                            draggable={!closed && !busy}
                                            onDragStart={() => setDraggingId(member.id)}
                                            onDragEnd={() => setDraggingId(null)}
                                            onClick={() => setSelectedId(member.id)}
                                            className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm cursor-pointer hover:border-primary-300"
                                        >
                                            <p className="font-medium text-gray-900 text-sm">{memberName(member)}</p>
                                            <CardOrigin candidate={member.candidate} />
                                            <p className="text-xs text-gray-500 mt-1 truncate">
                                                {member.sourceProcessTitle || 'Proceso'}
                                                {member.sourceStageName ? ` · ${member.sourceStageName}` : ''}
                                            </p>
                                            {shortlist.clientLabel && member.sourceClientLabel && member.sourceClientLabel !== shortlist.clientLabel && (
                                                <p className="text-[11px] text-amber-700 mt-1">Viene de {member.sourceClientLabel}</p>
                                            )}
                                        </article>
                                    ))}
                                </div>
                            </section>
                        );
                    })}
                </div>

                {rejected.length > 0 && (
                    <section className="bg-white border border-gray-200 rounded-xl p-4">
                        <h3 className="text-sm font-semibold text-gray-800 mb-2">Rechazados ({rejected.length})</h3>
                        <ul className="space-y-2">
                            {rejected.map(member => (
                                <li key={member.id}>
                                    <button type="button" onClick={() => setSelectedId(member.id)} className="w-full text-left">
                                        <span className="text-sm font-medium text-gray-800">{memberName(member)}</span>
                                        <span className="block text-xs text-gray-500">{member.rejectionReason}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}
            </div>

            <aside className="bg-white border border-gray-200 rounded-xl p-4 h-fit">
                <h3 className="text-sm font-semibold text-gray-800">Historial de la sala</h3>
                <p className="text-xs text-gray-500 mt-1 mb-3">Queda en el ATS para actualizar el proceso de origen cuando el equipo lo decida.</p>
                <ul className="space-y-3 max-h-[640px] overflow-y-auto">
                    {events.length === 0 && <li className="text-xs text-gray-400">Todavía no hay movimientos.</li>}
                    {events.map(event => (
                        <li key={event.id} className="text-sm">
                            <p className="text-gray-800">
                                <span className="font-medium">{event.actorName || (event.actorType === 'client' ? 'Cliente' : 'Equipo')}</span>
                                {' '}
                                {shortlistEventText(event)}
                            </p>
                            {event.body && <p className="text-xs text-gray-600 mt-0.5 whitespace-pre-wrap">{event.body}</p>}
                            <p className="text-[11px] text-gray-400 mt-0.5">{formatShortlistWhen(event.createdAt)}</p>
                        </li>
                    ))}
                </ul>
            </aside>

            {selected && (
                <MemberPanel
                    key={selected.id}
                    member={selected}
                    comments={commentsByMember.get(selected.id) || []}
                    mode={mode}
                    closed={closed}
                    busy={busy}
                    showProfile={shortlist.showProfile}
                    onClose={() => setSelectedId(null)}
                    onMove={column => onMove(selected.id, column)}
                    onReject={reason => onReject(selected.id, reason)}
                    onComment={body => onComment(selected.id, body)}
                    onProposeInterview={proposal => onProposeInterview(selected.id, proposal)}
                    interviews={events.filter(event => event.memberId === selected.id && event.payload?.kind === 'interview')}
                    onRemove={onRemove ? () => onRemove(selected.id) : undefined}
                    onOpenProcess={selected.sourceProcessId && onOpenProcess ? () => onOpenProcess(selected.sourceProcessId as string) : undefined}
                />
            )}
        </div>
        </div>
    );
};

const MemberPanel: React.FC<{
    member: ShortlistMember;
    comments: ShortlistEvent[];
    mode: 'staff' | 'client';
    closed: boolean;
    busy?: boolean;
    showProfile: boolean;
    onClose: () => void;
    onMove: (column: ShortlistColumnKey) => void;
    onReject: (reason: string) => void;
    onComment: (body: string) => void;
    onProposeInterview: (proposal: InterviewProposal) => void;
    interviews: ShortlistEvent[];
    onRemove?: () => void;
    onOpenProcess?: () => void;
}> = ({ member, comments, mode, closed, busy, showProfile, onClose, onMove, onReject, onComment, onProposeInterview, interviews, onRemove, onOpenProcess }) => {
    const [comment, setComment] = useState('');
    const [reason, setReason] = useState('');
    const [rejecting, setRejecting] = useState(false);
    const person = member.candidate;
    const next = member.status === 'active' ? nextShortlistColumn(member.column) : null;
    const location = [person?.district, person?.city || person?.province].filter(Boolean).join(', ');

    return (
        <div className="fixed inset-0 z-50 bg-black/40 flex justify-end" onClick={onClose}>
            <div className="bg-white w-full max-w-lg h-full overflow-y-auto shadow-2xl" onClick={event => event.stopPropagation()}>
                <header className="sticky top-0 bg-white border-b px-5 py-4 flex items-start justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">{memberName(member)}</h2>
                        <p className="text-sm text-gray-500">
                            {member.sourceProcessTitle || 'Proceso'}
                            {member.sourceStageName ? ` · venía de ${member.sourceStageName}` : ''}
                        </p>
                        <p className="text-xs text-primary-700 mt-1">
                            {member.status === 'rejected' ? 'Rechazado' : shortlistColumnLabel(member.column)}
                        </p>
                    </div>
                    <button type="button" onClick={onClose} className="text-sm text-gray-500 hover:text-gray-800">Cerrar</button>
                </header>
                <div className="px-5 py-4 space-y-5">
                    {member.status === 'rejected' && (
                        <p className="text-sm bg-red-50 text-red-800 rounded-lg px-3 py-2">{member.rejectionReason}</p>
                    )}
                    {person && (person.age !== undefined || location) && (
                        <p className="text-sm text-gray-600">
                            {[person.age !== undefined ? `${person.age} años` : '', location].filter(Boolean).join(' · ')}
                        </p>
                    )}
                    {showProfile && person && (
                        <dl className="grid grid-cols-2 gap-3 text-sm">
                            {person.phone && <Info label="Teléfono" value={person.phone} />}
                            {person.email && <Info label="Correo" value={person.email} />}
                            {person.salaryExpectation && <Info label="Expectativa" value={person.salaryExpectation} />}
                            {person.linkedinUrl && (
                                <div className="col-span-2">
                                    <a href={person.linkedinUrl} target="_blank" rel="noreferrer" className="text-primary-700 text-sm hover:underline">LinkedIn</a>
                                </div>
                            )}
                        </dl>
                    )}
                    {showProfile && person?.description && (
                        <section>
                            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Perfil</h3>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{person.description}</p>
                        </section>
                    )}
                    {person && person.fichaLines.length > 0 && (
                        <section>
                            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Ficha</h3>
                            <ul className="text-sm text-gray-700 space-y-1">
                                {person.fichaLines.map(line => <li key={line}>{line}</li>)}
                            </ul>
                        </section>
                    )}
                    {person && person.tests.length > 0 && (
                        <section>
                            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Pruebas</h3>
                            <ul className="space-y-1">
                                {person.tests.map(test => (
                                    <li key={test.id} className="text-sm text-gray-700 flex justify-between gap-3">
                                        <span>{test.name}</span>
                                        <span className="text-gray-500 text-right">{test.summary}</span>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}
                    {person?.psycholaboralSuitability && (
                        <p className="text-sm text-gray-700"><span className="font-medium">Informe: </span>{person.psycholaboralSuitability}</p>
                    )}
                    {person?.psycholaboralConclusion && (
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{person.psycholaboralConclusion}</p>
                    )}
                    {person && person.documents.length > 0 && (
                        <section>
                            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Documentos</h3>
                            <ul className="space-y-1">
                                {person.documents.map(doc => (
                                    <li key={doc.id}>
                                        {doc.url.startsWith('http') ? (
                                            <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary-700 hover:underline">
                                                {doc.name}
                                            </a>
                                        ) : (
                                            <button
                                                type="button"
                                                className="text-sm text-primary-700 hover:underline text-left"
                                                onClick={() => openAttachment(doc)}
                                            >
                                                {doc.name}
                                            </button>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}

                    {!closed && member.status === 'active' && (
                        <InterviewForm busy={busy} interviews={interviews} onSubmit={onProposeInterview} />
                    )}
                    {interviews.length > 0 && (closed || member.status !== 'active') && (
                        <InterviewList interviews={interviews} />
                    )}

                    <section>
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Comentarios</h3>
                        <ul className="space-y-2 mb-2">
                            {comments.length === 0 && <li className="text-xs text-gray-400">Sin comentarios.</li>}
                            {comments.map(event => (
                                <li key={event.id} className="text-sm bg-gray-50 rounded-lg px-3 py-2">
                                    <p className="text-gray-800 whitespace-pre-wrap">{event.body}</p>
                                    <p className="text-[11px] text-gray-400 mt-1">{event.actorName || 'Cliente'} · {formatShortlistWhen(event.createdAt)}</p>
                                </li>
                            ))}
                        </ul>
                        {!closed && member.status === 'active' && (
                            <form
                                onSubmit={event => {
                                    event.preventDefault();
                                    onComment(comment);
                                    setComment('');
                                }}
                                className="space-y-2"
                            >
                                <textarea
                                    value={comment}
                                    onChange={event => setComment(event.target.value)}
                                    rows={3}
                                    placeholder="Comentario para el equipo"
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                />
                                <button type="submit" disabled={busy || !comment.trim()} className="text-sm px-3 py-1.5 rounded-lg bg-gray-900 text-white disabled:opacity-40">
                                    Guardar comentario
                                </button>
                            </form>
                        )}
                    </section>

                    {!closed && member.status === 'active' && (
                        <div className="flex flex-wrap gap-2 pt-2 border-t">
                            {next && (
                                <button type="button" disabled={busy} onClick={() => onMove(next)} className="text-sm px-3 py-1.5 rounded-lg bg-primary-600 text-white disabled:opacity-40">
                                    Pasar a {shortlistColumnLabel(next)}
                                </button>
                            )}
                            {mode === 'staff' && SHORTLIST_COLUMNS.filter(column => canMoveShortlistColumn(member.column, column.key, 'staff') && column.key !== next).map(column => (
                                <button key={column.key} type="button" disabled={busy} onClick={() => onMove(column.key)} className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 disabled:opacity-40">
                                    Mover a {column.label}
                                </button>
                            ))}
                            {!rejecting && (
                                <button type="button" onClick={() => setRejecting(true)} className="text-sm px-3 py-1.5 rounded-lg border border-red-200 text-red-700">
                                    Rechazar
                                </button>
                            )}
                            {mode === 'staff' && onRemove && (
                                <button type="button" disabled={busy} onClick={onRemove} className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 disabled:opacity-40">
                                    Quitar de la sala
                                </button>
                            )}
                            {mode === 'staff' && onOpenProcess && (
                                <button type="button" onClick={onOpenProcess} className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700">
                                    Ver en su proceso
                                </button>
                            )}
                        </div>
                    )}
                    {!closed && member.status === 'active' && rejecting && (
                        <form
                            onSubmit={event => {
                                event.preventDefault();
                                onReject(reason);
                                setReason('');
                                setRejecting(false);
                            }}
                            className="space-y-2"
                        >
                            <textarea
                                value={reason}
                                onChange={event => setReason(event.target.value)}
                                rows={3}
                                placeholder="Sustento del rechazo"
                                className="w-full border border-red-200 rounded-lg px-3 py-2 text-sm"
                            />
                            <div className="flex gap-2">
                                <button type="submit" disabled={busy || !reason.trim()} className="text-sm px-3 py-1.5 rounded-lg bg-red-600 text-white disabled:opacity-40">Confirmar rechazo</button>
                                <button type="button" onClick={() => setRejecting(false)} className="text-sm px-3 py-1.5 rounded-lg border border-gray-300">Cancelar</button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

const CardOrigin: React.FC<{ candidate?: { age?: number; city?: string; district?: string } }> = ({ candidate }) => {
    const bits = [
        candidate?.age !== undefined ? `${candidate.age} años` : '',
        candidate?.city || '',
        candidate?.district || '',
    ].filter(Boolean);
    if (bits.length === 0) return null;
    return <p className="text-xs text-gray-600 mt-1">{bits.join(' · ')}</p>;
};

const RoomThread: React.FC<{
    comments: ShortlistEvent[];
    closed: boolean;
    busy?: boolean;
    onSend: (body: string) => void;
}> = ({ comments, closed, busy, onSend }) => {
    const [text, setText] = useState('');
    return (
        <section className="bg-white border border-gray-200 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-800">Comentarios de la sala</h3>
            <p className="text-xs text-gray-500 mt-1">Los ven el cliente y el equipo, y se puede responder aquí.</p>
            <ul className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                {comments.length === 0 && <li className="text-xs text-gray-400">Todavía no hay comentarios de la sala.</li>}
                {comments.map(event => (
                    <li key={event.id} className="text-sm bg-gray-50 rounded-lg px-3 py-2">
                        <p className="text-gray-800 whitespace-pre-wrap">{event.body}</p>
                        <p className="text-[11px] text-gray-400 mt-1">{event.actorName || 'Cliente'} · {formatShortlistWhen(event.createdAt)}</p>
                    </li>
                ))}
            </ul>
            {!closed && (
                <form
                    className="mt-3 flex flex-col sm:flex-row gap-2"
                    onSubmit={event => {
                        event.preventDefault();
                        onSend(text);
                        setText('');
                    }}
                >
                    <textarea
                        value={text}
                        onChange={event => setText(event.target.value)}
                        rows={2}
                        placeholder="Escriba un comentario para todos"
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                    <button type="submit" disabled={busy || !text.trim()} className="px-3 py-2 text-sm rounded-lg bg-gray-900 text-white disabled:opacity-40 self-start">
                        Enviar
                    </button>
                </form>
            )}
        </section>
    );
};

const InterviewList: React.FC<{ interviews: ShortlistEvent[] }> = ({ interviews }) => (
    <ul className="space-y-2">
        {interviews.map(event => (
            <li key={event.id} className="text-sm bg-indigo-50 rounded-lg px-3 py-2">
                <p className="text-gray-800 whitespace-pre-wrap">{event.body}</p>
                <p className="text-[11px] text-gray-500 mt-1">{event.actorName || 'Cliente'} · {formatShortlistWhen(event.createdAt)}</p>
            </li>
        ))}
    </ul>
);

const InterviewForm: React.FC<{
    busy?: boolean;
    interviews: ShortlistEvent[];
    onSubmit: (proposal: InterviewProposal) => void;
}> = ({ busy, interviews, onSubmit }) => {
    const [modality, setModality] = useState<'presencial' | 'virtual'>('presencial');
    const [place, setPlace] = useState('');
    const [slots, setSlots] = useState([{ date: '', start: '', end: '' }]);
    return (
        <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Entrevista</h3>
            {interviews.length > 0 && <div className="mb-3"><InterviewList interviews={interviews} /></div>}
            <form
                className="space-y-2 border border-gray-200 rounded-lg p-3"
                onSubmit={event => {
                    event.preventDefault();
                    onSubmit({ modality, place, slots });
                    setPlace('');
                    setSlots([{ date: '', start: '', end: '' }]);
                }}
            >
                <div className="flex gap-3 text-sm">
                    <label className="flex items-center gap-1"><input type="radio" checked={modality === 'presencial'} onChange={() => setModality('presencial')} /> Presencial</label>
                    <label className="flex items-center gap-1"><input type="radio" checked={modality === 'virtual'} onChange={() => setModality('virtual')} /> Virtual</label>
                </div>
                <input
                    value={place}
                    onChange={event => setPlace(event.target.value)}
                    placeholder={modality === 'presencial' ? 'Dirección' : 'Enlace o indicación'}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
                {slots.map((slot, index) => (
                    <div key={index} className="grid grid-cols-3 gap-2">
                        <input type="date" value={slot.date} onChange={event => setSlots(current => current.map((item, i) => i === index ? { ...item, date: event.target.value } : item))} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                        <input type="time" value={slot.start} onChange={event => setSlots(current => current.map((item, i) => i === index ? { ...item, start: event.target.value } : item))} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                        <input type="time" value={slot.end} onChange={event => setSlots(current => current.map((item, i) => i === index ? { ...item, end: event.target.value } : item))} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                    </div>
                ))}
                {slots.length < 4 && (
                    <button type="button" onClick={() => setSlots(current => [...current, { date: '', start: '', end: '' }])} className="text-xs text-primary-700">
                        Agregar otro rango
                    </button>
                )}
                <button type="submit" disabled={busy} className="text-sm px-3 py-1.5 rounded-lg bg-indigo-600 text-white disabled:opacity-40">
                    Proponer horario
                </button>
            </form>
        </section>
    );
};

const Info: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div>
        <dt className="text-[11px] uppercase tracking-wide text-gray-400">{label}</dt>
        <dd className="text-gray-800 break-words">{value}</dd>
    </div>
);
