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
    onConfirmAppointment?: (memberId: string, appointment: FinalAppointment) => void;
    onRemove?: (memberId: string) => void;
    onOpenProcess?: (processId: string) => void;
}

export interface InterviewProposal {
    modality: 'presencial' | 'virtual';
    place: string;
    slots: { date: string; start: string; end: string }[];
}

export interface FinalAppointment {
    modality: 'presencial' | 'virtual';
    place: string;
    date: string;
    start: string;
    end: string;
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
    onConfirmAppointment,
    onRemove,
    onOpenProcess,
}) => {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [sideTab, setSideTab] = useState<'comments' | 'agenda' | 'history'>('comments');
    const closed = shortlist.status === 'closed';
    const roomComments = events.filter(event => event.eventType === 'comment' && event.payload?.scope === 'room').slice().reverse();
    const active = members.filter(member => member.status === 'active');
    const rejected = members.filter(member => member.status === 'rejected');
    const selected = members.find(member => member.id === selectedId) || null;

    const commentsByMember = useMemo(() => {
        const map = new Map<string, ShortlistEvent[]>();
        for (const event of events) {
            if (event.eventType !== 'comment' || !event.memberId) continue;
            if (event.payload?.kind === 'interview' || event.payload?.kind === 'appointment') continue;
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
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_400px] gap-4 items-start">
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

            <aside className="bg-white border border-gray-200 rounded-xl flex flex-col h-[min(720px,calc(100vh-7rem))] sticky top-4 overflow-hidden">
                <div className="flex border-b text-sm shrink-0">
                    <SideTab active={sideTab === 'comments'} onClick={() => setSideTab('comments')}>Comentarios{roomComments.length > 0 ? ` (${roomComments.length})` : ''}</SideTab>
                    <SideTab active={sideTab === 'agenda'} onClick={() => setSideTab('agenda')}>Agenda</SideTab>
                    <SideTab active={sideTab === 'history'} onClick={() => setSideTab('history')}>Historial</SideTab>
                </div>
                <div className="flex-1 min-h-0 overflow-hidden">
                    {sideTab === 'comments' && (
                        <RoomThread comments={roomComments} closed={closed} busy={busy} onSend={onCommentRoom} />
                    )}
                    {sideTab === 'agenda' && (
                        <WeekAgenda
                            members={members}
                            events={events}
                            mode={mode}
                            closed={closed}
                            busy={busy}
                            onConfirm={onConfirmAppointment}
                        />
                    )}
                    {sideTab === 'history' && (
                        <ul className="h-full overflow-y-auto p-4 space-y-3">
                            {events.length === 0 && <li className="text-xs text-gray-400">Todavía no hay movimientos.</li>}
                            {events.map(event => (
                                <li key={event.id} className="text-sm">
                                    <p className="text-gray-800">
                                        <span className="font-medium">{event.actorName || (event.actorType === 'client' ? 'Cliente' : 'Equipo')}</span>
                                        {' '}
                                        {shortlistEventText(event)}
                                    </p>
                                    {event.body && event.payload?.scope !== 'room' && <p className="text-xs text-gray-600 mt-0.5 whitespace-pre-wrap">{event.body}</p>}
                                    <p className="text-[11px] text-gray-400 mt-0.5">{formatShortlistWhen(event.createdAt)}</p>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
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
                    interviews={events.filter(event => event.memberId === selected.id && (event.payload?.kind === 'interview' || event.payload?.kind === 'appointment'))}
                    onRemove={onRemove ? () => onRemove(selected.id) : undefined}
                    onOpenProcess={selected.sourceProcessId && onOpenProcess ? () => onOpenProcess(selected.sourceProcessId as string) : undefined}
                />
            )}
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

                    <PersonAgenda interviews={interviews} />
                    {!closed && member.status === 'active' && mode === 'client' && (
                        <InterviewForm busy={busy} onSubmit={onProposeInterview} />
                    )}
                    {!closed && member.status === 'active' && mode === 'staff' && (
                        <p className="text-xs text-gray-500">La cita final se agenda en la pestaña Agenda, sobre los rangos que marcó el cliente.</p>
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

const SideTab: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
    <button
        type="button"
        onClick={onClick}
        className={`flex-1 px-2 py-2.5 text-xs font-medium ${active ? 'text-primary-700 border-b-2 border-primary-600' : 'text-gray-500 hover:text-gray-800'}`}
    >
        {children}
    </button>
);

const RoomThread: React.FC<{
    comments: ShortlistEvent[];
    closed: boolean;
    busy?: boolean;
    onSend: (body: string) => void;
}> = ({ comments, closed, busy, onSend }) => {
    const [text, setText] = useState('');
    return (
        <div className="h-full flex flex-col">
            <ul className="flex-1 overflow-y-auto p-3 space-y-2">
                {comments.length === 0 && <li className="text-xs text-gray-400">Todavía no hay comentarios de la sala. Aquí se responden el cliente y el equipo.</li>}
                {comments.map(event => (
                    <li key={event.id} className="text-sm bg-gray-50 rounded-lg px-3 py-2">
                        <p className="text-gray-800 whitespace-pre-wrap">{event.body}</p>
                        <p className="text-[11px] text-gray-400 mt-1">{event.actorName || 'Cliente'} · {formatShortlistWhen(event.createdAt)}</p>
                    </li>
                ))}
            </ul>
            {!closed && (
                <form
                    className="shrink-0 border-t p-3 space-y-2"
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
                        placeholder="Comentario para todos"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                    <button type="submit" disabled={busy || !text.trim()} className="px-3 py-1.5 text-sm rounded-lg bg-gray-900 text-white disabled:opacity-40">
                        Enviar
                    </button>
                </form>
            )}
        </div>
    );
};

const PersonAgenda: React.FC<{ interviews: ShortlistEvent[] }> = ({ interviews }) => {
    const ranges = interviews.filter(event => event.payload?.kind === 'interview');
    const citas = interviews.filter(event => event.payload?.kind === 'appointment');
    if (ranges.length === 0 && citas.length === 0) return null;
    return (
        <section className="space-y-2">
            {ranges.length > 0 && (
                <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-800 mb-1">Rangos del cliente</h3>
                    <ul className="space-y-1">
                        {ranges.map(event => (
                            <li key={event.id} className="text-sm bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 whitespace-pre-wrap">{event.body}</li>
                        ))}
                    </ul>
                </div>
            )}
            {citas.length > 0 && (
                <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-indigo-800 mb-1">Cita final</h3>
                    <ul className="space-y-1">
                        {citas.map(event => (
                            <li key={event.id} className="text-sm bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2 whitespace-pre-wrap">{event.body}</li>
                        ))}
                    </ul>
                </div>
            )}
        </section>
    );
};

const InterviewForm: React.FC<{
    busy?: boolean;
    onSubmit: (proposal: InterviewProposal) => void;
}> = ({ busy, onSubmit }) => {
    const [modality, setModality] = useState<'presencial' | 'virtual'>('presencial');
    const [place, setPlace] = useState('');
    const [slots, setSlots] = useState([{ date: '', start: '', end: '' }]);
    return (
        <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Rangos disponibles</h3>
            <p className="text-xs text-gray-500 mb-2">Marque los tramos en los que puede entrevistar. Opalo agenda la cita final dentro de esos rangos.</p>
            <form
                className="space-y-2 border border-amber-200 bg-amber-50/40 rounded-lg p-3"
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
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
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
                <button type="submit" disabled={busy} className="text-sm px-3 py-1.5 rounded-lg bg-amber-600 text-white disabled:opacity-40">
                    Guardar rangos
                </button>
            </form>
        </section>
    );
};

interface AgendaBlock {
    id: string;
    kind: 'availability' | 'appointment';
    name: string;
    date: string;
    startMin: number;
    endMin: number;
    detail: string;
}

const DAY_START = 8 * 60;
const DAY_END = 19 * 60;
const HOUR_PX = 36;

function minutesOf(value: string): number {
    const [hour, minute] = value.split(':').map(part => Number(part));
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return DAY_START;
    return hour * 60 + minute;
}

function mondayOf(date: Date): Date {
    const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const weekday = (copy.getDay() + 6) % 7;
    copy.setDate(copy.getDate() - weekday);
    return copy;
}

function shiftDays(date: Date, days: number): Date {
    const copy = new Date(date);
    copy.setDate(copy.getDate() + days);
    return copy;
}

function dayKey(date: Date): string {
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
}

function agendaBlocks(events: ShortlistEvent[], members: ShortlistMember[]): AgendaBlock[] {
    const names = new Map(members.map(member => [member.id, memberName(member)]));
    const blocks: AgendaBlock[] = [];
    for (const event of events) {
        const kind = event.payload?.kind;
        if (kind !== 'interview' && kind !== 'appointment') continue;
        const slots = Array.isArray(event.payload?.slots) ? event.payload.slots : [];
        const name = typeof event.payload?.candidateName === 'string'
            ? event.payload.candidateName
            : (event.memberId && names.get(event.memberId)) || 'Candidato';
        const modality = event.payload?.modality === 'virtual' ? 'Virtual' : event.payload?.modality === 'presencial' ? 'Presencial' : '';
        const place = typeof event.payload?.place === 'string' ? event.payload.place : '';
        slots.forEach((slot, index) => {
            const row = slot && typeof slot === 'object' ? slot as { date?: string; start?: string; end?: string } : {};
            if (!row.date || !row.start || !row.end) return;
            blocks.push({
                id: `${event.id}-${index}`,
                kind: kind === 'appointment' ? 'appointment' : 'availability',
                name,
                date: row.date,
                startMin: minutesOf(row.start),
                endMin: minutesOf(row.end),
                detail: [modality, place].filter(Boolean).join(' · '),
            });
        });
    }
    return blocks;
}

const WeekAgenda: React.FC<{
    members: ShortlistMember[];
    events: ShortlistEvent[];
    mode: 'staff' | 'client';
    closed: boolean;
    busy?: boolean;
    onConfirm?: (memberId: string, appointment: FinalAppointment) => void;
}> = ({ members, events, mode, closed, busy, onConfirm }) => {
    const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
    const [memberId, setMemberId] = useState(members.find(member => member.status === 'active')?.id || '');
    const [modality, setModality] = useState<'presencial' | 'virtual'>('presencial');
    const [place, setPlace] = useState('');
    const [date, setDate] = useState('');
    const [start, setStart] = useState('');
    const [end, setEnd] = useState('');
    const days = Array.from({ length: 7 }, (_, index) => shiftDays(weekStart, index));
    const blocks = agendaBlocks(events, members);
    const hours = Array.from({ length: 11 }, (_, index) => 8 + index);
    const activeMembers = members.filter(member => member.status === 'active');

    return (
        <div className="h-full overflow-y-auto p-3 space-y-3">
            <div className="flex items-center justify-between gap-2">
                <button type="button" onClick={() => setWeekStart(current => shiftDays(current, -7))} className="text-xs px-2 py-1 border border-gray-300 rounded-md">Semana anterior</button>
                <p className="text-xs font-medium text-gray-700">
                    {weekStart.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })}
                    {' – '}
                    {shiftDays(weekStart, 6).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })}
                </p>
                <button type="button" onClick={() => setWeekStart(current => shiftDays(current, 7))} className="text-xs px-2 py-1 border border-gray-300 rounded-md">Semana siguiente</button>
            </div>
            <div className="flex flex-wrap gap-3 text-[11px]">
                <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-amber-300 border border-amber-500" /> Disponibilidad del cliente</span>
                <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-indigo-600" /> Cita final de Opalo</span>
            </div>
            <div className="overflow-x-auto">
                <div className="grid min-w-[560px]" style={{ gridTemplateColumns: '36px repeat(7, minmax(0, 1fr))' }}>
                    <div />
                    {days.map(day => (
                        <div key={dayKey(day)} className="text-center text-[11px] font-medium text-gray-600 pb-1">
                            {day.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric' })}
                        </div>
                    ))}
                    <div className="relative" style={{ height: hours.length * HOUR_PX }}>
                        {hours.map(hour => (
                            <div key={hour} className="text-[10px] text-gray-400 pr-1 text-right" style={{ height: HOUR_PX }}>{`${hour}:00`}</div>
                        ))}
                    </div>
                    {days.map(day => {
                        const key = dayKey(day);
                        const dayBlocks = blocks.filter(block => block.date === key);
                        return (
                            <div key={key} className="relative border-l border-gray-100" style={{ height: hours.length * HOUR_PX }}>
                                {hours.map(hour => (
                                    <div key={hour} className="border-t border-gray-100" style={{ height: HOUR_PX }} />
                                ))}
                                {dayBlocks.map(block => {
                                    const top = ((Math.max(block.startMin, DAY_START) - DAY_START) / 60) * HOUR_PX;
                                    const height = Math.max(((Math.min(block.endMin, DAY_END) - Math.max(block.startMin, DAY_START)) / 60) * HOUR_PX, 16);
                                    const appointment = block.kind === 'appointment';
                                    return (
                                        <div
                                            key={block.id}
                                            title={`${block.name}${block.detail ? ` · ${block.detail}` : ''}`}
                                            className={`absolute left-0.5 right-0.5 rounded px-1 overflow-hidden text-[10px] leading-tight ${appointment ? 'bg-indigo-600 text-white z-10' : 'bg-amber-200/90 text-amber-950 border border-amber-400'}`}
                                            style={{ top, height }}
                                        >
                                            <span className="font-medium block truncate">{block.name}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            </div>
            {mode === 'staff' && !closed && onConfirm && (
                <form
                    className="space-y-2 border border-indigo-200 rounded-lg p-3"
                    onSubmit={event => {
                        event.preventDefault();
                        if (!memberId) return;
                        onConfirm(memberId, { modality, place, date, start, end });
                        setPlace('');
                        setStart('');
                        setEnd('');
                    }}
                >
                    <h3 className="text-xs font-semibold text-indigo-900">Cita final</h3>
                    <p className="text-[11px] text-gray-500">La confirma el consultor. Queda en azul, distinta de los rangos del cliente.</p>
                    <select value={memberId} onChange={event => setMemberId(event.target.value)} className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white">
                        <option value="">Candidato</option>
                        {activeMembers.map(member => (
                            <option key={member.id} value={member.id}>{memberName(member)}</option>
                        ))}
                    </select>
                    <div className="flex gap-3 text-sm">
                        <label className="flex items-center gap-1"><input type="radio" checked={modality === 'presencial'} onChange={() => setModality('presencial')} /> Presencial</label>
                        <label className="flex items-center gap-1"><input type="radio" checked={modality === 'virtual'} onChange={() => setModality('virtual')} /> Virtual</label>
                    </div>
                    <input value={place} onChange={event => setPlace(event.target.value)} placeholder={modality === 'presencial' ? 'Dirección' : 'Enlace'} className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                    <div className="grid grid-cols-3 gap-2">
                        <input type="date" value={date} onChange={event => setDate(event.target.value)} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                        <input type="time" value={start} onChange={event => setStart(event.target.value)} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                        <input type="time" value={end} onChange={event => setEnd(event.target.value)} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                    </div>
                    <button type="submit" disabled={busy || !memberId || !date || !start || !end} className="text-sm px-3 py-1.5 rounded-lg bg-indigo-600 text-white disabled:opacity-40">
                        Agendar cita final
                    </button>
                </form>
            )}
            {mode === 'client' && (
                <p className="text-[11px] text-gray-500">Los bloques ámbar son los rangos que usted marca en cada candidato. Los bloques azules son las citas que confirma Opalo.</p>
            )}
        </div>
    );
};

const Info: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div>
        <dt className="text-[11px] uppercase tracking-wide text-gray-400">{label}</dt>
        <dd className="text-gray-800 break-words">{value}</dd>
    </div>
);
