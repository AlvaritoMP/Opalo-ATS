import React, { useEffect, useMemo, useState } from 'react';
import { Settings } from 'lucide-react';
import {
    SHORTLIST_COLUMNS,
    canMoveShortlistColumn,
    formatShortlistWhen,
    nextShortlistColumn,
    presentedAgeLabel,
    shortlistColumnLabel,
    shortlistCreatedMessage,
    shortlistEventText,
} from '../lib/shortlists';
import { openAttachment } from '../lib/openAttachment';
import { downloadShortlistDocument, isGoogleDriveFileUrl } from '../lib/api/shortlistDocuments';
import type { Shortlist, ShortlistColumnKey, ShortlistDocument, ShortlistEvent, ShortlistMember } from '../types';

interface ShortlistBoardProps {
    shortlist: Shortlist;
    members: ShortlistMember[];
    events: ShortlistEvent[];
    mode: 'staff' | 'client';
    /** Muestra la interfaz del cliente sin guardar movimientos, comentarios ni rechazos. */
    readOnly?: boolean;
    busy?: boolean;
    onMove: (memberId: string, column: ShortlistColumnKey) => void;
    onReject: (memberId: string, reason: string) => void;
    onComment: (memberId: string, body: string) => void;
    onCommentRoom: (body: string) => void;
    onSetAvailability?: (proposal: InterviewProposal) => void;
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

async function openShortlistDocument(shortlist: Shortlist, doc: ShortlistDocument): Promise<void> {
    if (/\/folders\//i.test(doc.url || '')) {
        throw new Error('La carpeta de documentos no se comparte.');
    }
    if (isGoogleDriveFileUrl(doc.url)) {
        await downloadShortlistDocument({
            token: shortlist.token,
            dni: shortlist.accessDni,
            attachmentId: doc.id,
            fallbackName: doc.name,
        });
        return;
    }
    if (!openAttachment(doc)) throw new Error('No se pudo abrir el documento.');
}

function useNarrowScreen(): boolean {
    const query = '(max-width: 1023px), (hover: none) and (pointer: coarse)';
    const [matches, setMatches] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
    useEffect(() => {
        const media = window.matchMedia(query);
        const onChange = () => setMatches(media.matches);
        onChange();
        media.addEventListener('change', onChange);
        return () => media.removeEventListener('change', onChange);
    }, []);
    return matches;
}

export const ShortlistBoard: React.FC<ShortlistBoardProps> = ({
    shortlist,
    members,
    events,
    mode,
    readOnly,
    busy,
    onMove,
    onReject,
    onComment,
    onCommentRoom,
    onSetAvailability,
    onConfirmAppointment,
    onRemove,
    onOpenProcess,
}) => {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [sideTab, setSideTab] = useState<'comments' | 'agenda' | 'history'>('comments');
    const [lockedNote, setLockedNote] = useState('');
    const [phonePane, setPhonePane] = useState<'board' | 'comments' | 'agenda' | 'history'>('board');
    const [phoneColumn, setPhoneColumn] = useState<ShortlistColumnKey | 'rejected'>('presentacion');
    const phone = useNarrowScreen();
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

    const lockChange = () => {
        setLockedNote('Esta vista solo verifica la interfaz. No se guardó ningún cambio.');
    };

    const dropOn = (column: ShortlistColumnKey) => {
        if (readOnly) {
            setDraggingId(null);
            lockChange();
            return;
        }
        if (!draggingId || closed) return;
        const member = active.find(item => item.id === draggingId);
        setDraggingId(null);
        if (!member || !canMoveShortlistColumn(member.column, column, mode)) return;
        onMove(member.id, column);
    };

    return (
        <div className={`space-y-3 ${phone ? 'pb-20' : ''}`}>
            {lockedNote && (
                <p className="text-sm text-amber-950 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{lockedNote}</p>
            )}
            {shortlistCreatedMessage(shortlist.createdAt) && (
                <p className="text-sm text-gray-700 bg-white border border-gray-200 rounded-lg px-3 py-2">
                    {shortlistCreatedMessage(shortlist.createdAt)}
                </p>
            )}
            {phone && phonePane === 'board' && (
                <div className="sticky top-0 z-20 -mx-1 px-1 py-2 bg-gray-50">
                    <div className="flex gap-1.5 overflow-x-auto">
                            {SHORTLIST_COLUMNS.map(column => {
                                const count = active.filter(member => member.column === column.key).length;
                                const selectedColumn = phoneColumn === column.key;
                                return (
                                    <button
                                        key={column.key}
                                        type="button"
                                        onClick={() => setPhoneColumn(column.key)}
                                        className={`shrink-0 px-3 py-2 rounded-full text-xs font-medium ${selectedColumn ? 'bg-primary-600 text-white' : 'bg-white border border-gray-300 text-gray-700'}`}
                                    >
                                        {column.label} {count}
                                    </button>
                                );
                            })}
                            {rejected.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setPhoneColumn('rejected')}
                                    className={`shrink-0 px-3 py-2 rounded-full text-xs font-medium ${phoneColumn === 'rejected' ? 'bg-red-700 text-white' : 'bg-white border border-red-200 text-red-700'}`}
                                >
                                    Rechazados {rejected.length}
                                </button>
                            )}
                    </div>
                </div>
            )}
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_520px] gap-4 items-start">
            <div className={`space-y-4 min-w-0 ${phone && phonePane !== 'board' ? 'hidden' : ''}`}>
                <div className={phone ? '' : 'grid grid-cols-1 md:grid-cols-3 gap-3'}>
                    {SHORTLIST_COLUMNS.map(column => {
                        if (phone && phoneColumn !== column.key) return null;
                        const cards = active.filter(member => member.column === column.key);
                        return (
                            <section
                                key={column.key}
                                className={`bg-gray-100 rounded-xl p-3 ${phone ? '' : 'min-h-[280px]'}`}
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
                                            draggable={!readOnly && !phone && !closed && !busy}
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
                                            {presentedAgeLabel(member.addedAt) && (
                                                <p className="text-xs text-gray-500 mt-1">{presentedAgeLabel(member.addedAt)}</p>
                                            )}
                                            {mode === 'staff' && member.sourceProcessId && onOpenProcess && (
                                                <button
                                                    type="button"
                                                    className="mt-1 text-xs font-medium text-primary-700 hover:underline"
                                                    onClick={event => {
                                                        event.stopPropagation();
                                                        onOpenProcess(member.sourceProcessId as string);
                                                    }}
                                                >
                                                    Ir a su proceso
                                                </button>
                                            )}
                                            {shortlist.clientLabel && member.sourceClientLabel && member.sourceClientLabel !== shortlist.clientLabel && (
                                                <p className="text-[11px] text-amber-700 mt-1">Viene de {member.sourceClientLabel}</p>
                                            )}
                                            {phone && !closed && nextShortlistColumn(member.column) && (
                                                <button
                                                    type="button"
                                                    disabled={busy}
                                                    className="mt-3 w-full text-sm py-2 rounded-lg bg-primary-600 text-white disabled:opacity-40"
                                                    onClick={event => {
                                                        event.stopPropagation();
                                                        if (readOnly) {
                                                            lockChange();
                                                            return;
                                                        }
                                                        const next = nextShortlistColumn(member.column);
                                                        if (next) onMove(member.id, next);
                                                    }}
                                                >
                                                    Pasar a {shortlistColumnLabel(nextShortlistColumn(member.column) as ShortlistColumnKey)}
                                                </button>
                                            )}
                                        </article>
                                    ))}
                                </div>
                            </section>
                        );
                    })}
                </div>

                {rejected.length > 0 && (!phone || phoneColumn === 'rejected') && (
                    <section className="bg-white border border-gray-200 rounded-xl p-4">
                        <h3 className="text-sm font-semibold text-gray-800 mb-2">Rechazados ({rejected.length})</h3>
                        <ul className="space-y-2">
                            {rejected.map(member => (
                                <li key={member.id} className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <button type="button" onClick={() => setSelectedId(member.id)} className="text-left">
                                            <span className="text-sm font-medium text-gray-800">{memberName(member)}</span>
                                            <span className="block text-xs text-gray-500">{presentedAgeLabel(member.addedAt)}</span>
                                            <span className="block text-xs text-gray-500">{member.rejectionReason}</span>
                                        </button>
                                        {mode === 'staff' && member.sourceProcessId && onOpenProcess && (
                                            <button
                                                type="button"
                                                className="mt-1 block text-xs font-medium text-primary-700 hover:underline"
                                                onClick={() => onOpenProcess(member.sourceProcessId as string)}
                                            >
                                                Ir a su proceso
                                            </button>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}
            </div>

            <aside className={`bg-white border border-gray-200 rounded-xl flex flex-col overflow-hidden ${phone ? `h-[calc(100dvh-10.5rem)] ${phonePane === 'board' ? 'hidden' : ''}` : 'h-[min(720px,calc(100vh-7rem))] sticky top-4'}`}>
                {!phone && (
                <div className="flex border-b text-sm shrink-0">
                    <SideTab active={sideTab === 'comments'} onClick={() => setSideTab('comments')}>Comentarios{roomComments.length > 0 ? ` (${roomComments.length})` : ''}</SideTab>
                    <SideTab active={sideTab === 'agenda'} onClick={() => setSideTab('agenda')}>Agenda</SideTab>
                    <SideTab active={sideTab === 'history'} onClick={() => setSideTab('history')}>Historial</SideTab>
                </div>
                )}
                <div className="flex-1 min-h-0 overflow-hidden">
                    {(phone ? phonePane : sideTab) === 'comments' && (
                        <RoomThread comments={roomComments} closed={closed} busy={busy} readOnly={readOnly} onLocked={lockChange} onSend={onCommentRoom} />
                    )}
                    {(phone ? phonePane : sideTab) === 'agenda' && (
                        <WeekAgenda
                            members={members}
                            events={events}
                            mode={mode}
                            closed={closed}
                            busy={busy}
                            onConfirm={onConfirmAppointment}
                            onSetAvailability={onSetAvailability}
                            readOnly={readOnly}
                            onLocked={lockChange}
                            compact={phone}
                        />
                    )}
                    {(phone ? phonePane : sideTab) === 'history' && (
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
                    showDocuments={shortlist.showDocuments}
                    readOnly={readOnly}
                    onLocked={lockChange}
                    onClose={() => setSelectedId(null)}
                    onMove={column => onMove(selected.id, column)}
                    onReject={reason => onReject(selected.id, reason)}
                    onComment={body => onComment(selected.id, body)}
                    interviews={events.filter(event => event.memberId === selected.id && event.payload?.kind === 'appointment')}
                    onRemove={onRemove ? () => onRemove(selected.id) : undefined}
                    onOpenProcess={selected.sourceProcessId && onOpenProcess ? () => onOpenProcess(selected.sourceProcessId as string) : undefined}
                    onOpenDocument={doc => openShortlistDocument(shortlist, doc)}
                />
            )}
        </div>
            {phone && (
                <nav className="fixed bottom-0 inset-x-0 z-40 grid grid-cols-4 border-t bg-white pb-[env(safe-area-inset-bottom)]">
                    <PhoneNav active={phonePane === 'board'} onClick={() => setPhonePane('board')}>Candidatos</PhoneNav>
                    <PhoneNav active={phonePane === 'comments'} onClick={() => setPhonePane('comments')}>Comentarios{roomComments.length > 0 ? ` ${roomComments.length}` : ''}</PhoneNav>
                    <PhoneNav active={phonePane === 'agenda'} onClick={() => setPhonePane('agenda')}>Agenda</PhoneNav>
                    <PhoneNav active={phonePane === 'history'} onClick={() => setPhonePane('history')}>Historial</PhoneNav>
                </nav>
            )}
        </div>
    );
};

const PhoneNav: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
    <button
        type="button"
        onClick={onClick}
        className={`px-1 py-3 text-[11px] font-medium leading-tight ${active ? 'text-primary-700' : 'text-gray-500'}`}
    >
        {children}
    </button>
);

const MemberPanel: React.FC<{
    member: ShortlistMember;
    comments: ShortlistEvent[];
    mode: 'staff' | 'client';
    closed: boolean;
    busy?: boolean;
    showProfile: boolean;
    showDocuments: boolean;
    readOnly?: boolean;
    onLocked?: () => void;
    onClose: () => void;
    onMove: (column: ShortlistColumnKey) => void;
    onReject: (reason: string) => void;
    onComment: (body: string) => void;
    interviews: ShortlistEvent[];
    onRemove?: () => void;
    onOpenProcess?: () => void;
    onOpenDocument: (doc: ShortlistDocument) => Promise<void>;
}> = ({ member, comments, mode, closed, busy, showProfile, showDocuments, readOnly, onLocked, onClose, onMove, onReject, onComment, interviews, onRemove, onOpenProcess, onOpenDocument }) => {
    const [comment, setComment] = useState('');
    const [reason, setReason] = useState('');
    const [rejecting, setRejecting] = useState(false);
    const [blockedNote, setBlockedNote] = useState('');
    const [configOpen, setConfigOpen] = useState(false);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [documentError, setDocumentError] = useState('');
    const person = member.candidate;
    const next = member.status === 'active' ? nextShortlistColumn(member.column) : null;

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
                        {presentedAgeLabel(member.addedAt) && (
                            <p className="text-xs text-gray-500 mt-1">{presentedAgeLabel(member.addedAt)}</p>
                        )}
                        {mode === 'staff' && onOpenProcess && (
                            <button type="button" onClick={onOpenProcess} className="mt-2 text-sm font-medium text-primary-700 hover:underline">
                                Ir a su proceso
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                        {mode === 'staff' && onRemove && (
                            <div className="relative">
                                <button
                                    type="button"
                                    disabled={busy}
                                    aria-label="Configuración del candidato"
                                    aria-expanded={configOpen}
                                    onClick={() => setConfigOpen(open => !open)}
                                    className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-40"
                                >
                                    <Settings className="w-4 h-4" />
                                </button>
                                {configOpen && (
                                    <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-gray-200 bg-white shadow-lg py-1 z-10">
                                        <button
                                            type="button"
                                            disabled={busy}
                                            onClick={() => {
                                                setConfigOpen(false);
                                                onRemove();
                                            }}
                                            className="w-full text-left px-3 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-40"
                                        >
                                            Quitar de la sala
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                        <button type="button" onClick={onClose} className="shrink-0 text-sm text-gray-500 px-2 py-2">Cerrar</button>
                    </div>
                </header>
                <div className="px-5 py-4 space-y-5">
                    {member.status === 'rejected' && (
                        <p className="text-sm bg-red-50 text-red-800 rounded-lg px-3 py-2">{member.rejectionReason}</p>
                    )}
                    {showProfile && person && person.profileFields.some(field => !field.wide) && (
                        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                            {person.profileFields.filter(field => !field.wide).map(field => (
                                field.href ? (
                                    <div key={field.id} className="sm:col-span-2">
                                        <a href={field.href} target="_blank" rel="noreferrer" className="text-primary-700 text-sm hover:underline">{field.label}</a>
                                    </div>
                                ) : (
                                    <Info key={field.id} label={field.label} value={field.value} />
                                )
                            ))}
                        </dl>
                    )}
                    {showProfile && person?.profileFields.filter(field => field.wide).map(field => (
                        <section key={field.id}>
                            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">{field.label}</h3>
                            {field.href ? (
                                <a href={field.href} target="_blank" rel="noreferrer" className="text-sm text-primary-700 hover:underline break-all">{field.value}</a>
                            ) : (
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">{field.value}</p>
                            )}
                        </section>
                    ))}
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
                    {showDocuments && person && person.documents.length > 0 && (
                        <section>
                            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Documentos</h3>
                            <ul className="space-y-1">
                                {person.documents.map(doc => (
                                    <li key={doc.id}>
                                        {doc.url ? (
                                            <button
                                                type="button"
                                                disabled={downloadingId === doc.id}
                                                className="text-sm text-primary-700 hover:underline text-left disabled:opacity-40"
                                                onClick={() => {
                                                    setDocumentError('');
                                                    setDownloadingId(doc.id);
                                                    void onOpenDocument(doc)
                                                        .catch(err => {
                                                            setDocumentError(err instanceof Error ? err.message : 'No se pudo descargar el documento.');
                                                        })
                                                        .finally(() => setDownloadingId(current => current === doc.id ? null : current));
                                                }}
                                            >
                                                {downloadingId === doc.id ? 'Descargando…' : doc.name}
                                            </button>
                                        ) : (
                                            <span className="text-sm text-gray-700">{doc.name}</span>
                                        )}
                                    </li>
                                ))}
                            </ul>
                            {documentError && <p className="text-xs text-red-700 mt-2">{documentError}</p>}
                        </section>
                    )}

                    <PersonAgenda interviews={interviews} />
                    {!closed && member.status === 'active' && (
                        <p className="text-xs text-gray-500">
                            {mode === 'client'
                                ? 'La disponibilidad se marca una sola vez en Agenda y vale para toda la sala.'
                                : 'La cita final se agenda en la pestaña Agenda, dentro de la disponibilidad de la sala.'}
                        </p>
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
                                    if (readOnly) {
                                        onLocked?.();
                                        setBlockedNote('No se guardó. Esta vista solo verifica la interfaz.');
                                        return;
                                    }
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
                                <button type="button" disabled={busy} onClick={() => { if (readOnly) { onLocked?.(); setBlockedNote('No se guardó. Esta vista solo verifica la interfaz.'); return; } onMove(next); }} className="text-sm px-3 py-1.5 rounded-lg bg-primary-600 text-white disabled:opacity-40">
                                    Pasar a {shortlistColumnLabel(next)}
                                </button>
                            )}
                            {mode === 'staff' && SHORTLIST_COLUMNS.filter(column => canMoveShortlistColumn(member.column, column.key, 'staff') && column.key !== next).map(column => (
                                <button key={column.key} type="button" disabled={busy} onClick={() => { if (readOnly) { onLocked?.(); setBlockedNote('No se guardó. Esta vista solo verifica la interfaz.'); return; } onMove(column.key); }} className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 disabled:opacity-40">
                                    Mover a {column.label}
                                </button>
                            ))}
                            {!rejecting && (
                                <button type="button" onClick={() => setRejecting(true)} className="text-sm px-3 py-1.5 rounded-lg border border-red-200 text-red-700">
                                    Rechazar
                                </button>
                            )}
                        </div>
                    )}
                    {!closed && member.status === 'active' && rejecting && (
                        <form
                            onSubmit={event => {
                                event.preventDefault();
                                if (readOnly) {
                                    onLocked?.();
                                    setBlockedNote('No se guardó. Esta vista solo verifica la interfaz.');
                                    return;
                                }
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
                    {blockedNote && <p className="text-sm text-amber-800">{blockedNote}</p>}
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
    readOnly?: boolean;
    onLocked?: () => void;
    onSend: (body: string) => void;
}> = ({ comments, closed, busy, readOnly, onLocked, onSend }) => {
    const [text, setText] = useState('');
    const [blockedNote, setBlockedNote] = useState('');
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
                        if (readOnly) {
                            onLocked?.();
                            setBlockedNote('No se guardó. Esta vista solo verifica la interfaz.');
                            return;
                        }
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
                    {blockedNote && <p className="text-sm text-amber-800">{blockedNote}</p>}
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
    readOnly?: boolean;
    onLocked?: () => void;
    onSubmit: (proposal: InterviewProposal) => void;
}> = ({ busy, readOnly, onLocked, onSubmit }) => {
    const [modality, setModality] = useState<'presencial' | 'virtual'>('presencial');
    const [place, setPlace] = useState('');
    const [slots, setSlots] = useState([{ date: '', start: '', end: '' }]);
    const [blockedNote, setBlockedNote] = useState('');
    return (
        <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Rangos disponibles</h3>
            <p className="text-xs text-gray-500 mb-2">Marque los tramos en los que puede entrevistar a cualquiera de esta sala. Opalo agenda cada cita final dentro de esos rangos.</p>
            <form
                className="space-y-2 border border-amber-200 bg-amber-50/40 rounded-lg p-3"
                onSubmit={event => {
                    event.preventDefault();
                    if (readOnly) {
                        onLocked?.();
                        setBlockedNote('No se guardó. Esta vista solo verifica la interfaz.');
                        return;
                    }
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
                    <div key={index} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input type="date" value={slot.date} onChange={event => setSlots(current => current.map((item, i) => i === index ? { ...item, date: event.target.value } : item))} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                        <input type="time" value={slot.start} onChange={event => setSlots(current => current.map((item, i) => i === index ? { ...item, start: event.target.value } : item))} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                        <input type="time" value={slot.end} onChange={event => setSlots(current => current.map((item, i) => i === index ? { ...item, end: event.target.value } : item))} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                    </div>
                ))}
                {slots.length < 8 && (
                    <button type="button" onClick={() => setSlots(current => [...current, { date: '', start: '', end: '' }])} className="text-xs text-primary-700">
                        Agregar otro rango
                    </button>
                )}
                <button type="submit" disabled={busy} className="text-sm px-3 py-1.5 rounded-lg bg-amber-600 text-white disabled:opacity-40">
                    Guardar rangos
                </button>
                {blockedNote && <p className="text-sm text-amber-800">{blockedNote}</p>}
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

function clock(minutes: number): string {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
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

function assignLanes(blocks: AgendaBlock[]): Array<AgendaBlock & { lane: number; lanes: number }> {
    const sorted = [...blocks].sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
    const laneEnds: number[] = [];
    const laneOf = new Map<string, number>();
    for (const block of sorted) {
        let lane = laneEnds.findIndex(end => end <= block.startMin);
        if (lane < 0) {
            lane = laneEnds.length;
            laneEnds.push(block.endMin);
        } else {
            laneEnds[lane] = block.endMin;
        }
        laneOf.set(block.id, lane);
    }
    const lanes = Math.max(laneEnds.length, 1);
    return blocks.map(block => ({ ...block, lane: laneOf.get(block.id) || 0, lanes }));
}

function trackStyle(lane: number, lanes: number, side: 'availability' | 'appointment'): { left: string; width: string } {
    const span = 50 / lanes;
    const origin = side === 'appointment' ? 50 : 0;
    return {
        left: `calc(${origin + lane * span}% + 1px)`,
        width: `calc(${span}% - 2px)`,
    };
}

function agendaBlocks(events: ShortlistEvent[], members: ShortlistMember[]): AgendaBlock[] {
    const names = new Map(members.map(member => [member.id, memberName(member)]));
    const blocks: AgendaBlock[] = [];
    for (const event of events) {
        const kind = event.payload?.kind;
        if (kind !== 'interview' && kind !== 'appointment') continue;
        const slots = Array.isArray(event.payload?.slots) ? event.payload.slots : [];
        const name = kind === 'interview'
            ? 'Disponible'
            : typeof event.payload?.candidateName === 'string'
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
    onSetAvailability?: (proposal: InterviewProposal) => void;
    readOnly?: boolean;
    onLocked?: () => void;
    compact?: boolean;
}> = ({ members, events, mode, closed, busy, onConfirm, onSetAvailability, readOnly, onLocked, compact }) => {
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
    const [focusDay, setFocusDay] = useState(() => dayKey(new Date()));
    const changeWeek = (delta: number) => {
        setWeekStart(current => {
            const next = shiftDays(current, delta);
            setFocusDay(dayKey(next));
            return next;
        });
    };
    const focusBlocks = blocks
        .filter(block => block.date === focusDay)
        .sort((a, b) => a.startMin - b.startMin);
    const focusAvailability = focusBlocks.filter(block => block.kind === 'availability');

    return (
        <div className="h-full overflow-y-auto p-3 space-y-3">
            <div className="flex items-center justify-between gap-2">
                <button type="button" onClick={() => changeWeek(-7)} className="text-xs px-2 py-2 border border-gray-300 rounded-md shrink-0">Anterior</button>
                <p className="text-xs font-medium text-gray-700 text-center">
                    {weekStart.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })}
                    {' – '}
                    {shiftDays(weekStart, 6).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })}
                </p>
                <button type="button" onClick={() => changeWeek(7)} className="text-xs px-2 py-2 border border-gray-300 rounded-md shrink-0">Siguiente</button>
            </div>
            {compact ? (
                <>
                    <div className="flex gap-1.5 overflow-x-auto">
                        {days.map(day => {
                            const key = dayKey(day);
                            const count = blocks.filter(block => block.date === key).length;
                            return (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => setFocusDay(key)}
                                    className={`shrink-0 px-3 py-2 rounded-lg text-xs font-medium ${key === focusDay ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'}`}
                                >
                                    {day.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric' })}
                                    {count > 0 ? ` · ${count}` : ''}
                                </button>
                            );
                        })}
                    </div>
                    {focusBlocks.length === 0 && <p className="text-xs text-gray-400">Este día no tiene disponibilidad ni citas.</p>}
                    <ul className="space-y-2">
                        {focusBlocks.map(block => {
                            const appointment = block.kind === 'appointment';
                            const inside = appointment && focusAvailability.some(range => block.startMin < range.endMin && range.startMin < block.endMin);
                            return (
                                <li key={block.id} className={`rounded-lg px-3 py-2 border-l-4 ${appointment ? 'bg-indigo-50 border-indigo-600' : 'bg-amber-50 border-amber-400'}`}>
                                    <p className="text-sm font-medium text-gray-900">{clock(block.startMin)}–{clock(block.endMin)} · {block.name}</p>
                                    {block.detail && <p className="text-xs text-gray-600 mt-0.5">{block.detail}</p>}
                                    {appointment && (
                                        <p className={`text-[11px] mt-1 ${inside ? 'text-amber-800' : 'text-red-700'}`}>
                                            {inside ? 'Cae dentro de la disponibilidad' : 'Fuera de la disponibilidad de ese día'}
                                        </p>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </>
            ) : (
            <>
            <div className="flex flex-wrap gap-3 text-[11px]">
                <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-amber-300 border border-amber-500" /> Disponibilidad, a la izquierda</span>
                <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-indigo-600" /> Cita final, a la derecha</span>
            </div>
            <div className="overflow-x-auto">
                <div className="grid min-w-0" style={{ gridTemplateColumns: '36px repeat(7, minmax(0, 1fr))' }}>
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
                        const availability = assignLanes(dayBlocks.filter(block => block.kind === 'availability'));
                        const appointments = assignLanes(dayBlocks.filter(block => block.kind === 'appointment'));
                        const paint = (block: AgendaBlock & { lane: number; lanes: number }, side: 'availability' | 'appointment') => {
                            const top = ((Math.max(block.startMin, DAY_START) - DAY_START) / 60) * HOUR_PX;
                            const height = Math.max(((Math.min(block.endMin, DAY_END) - Math.max(block.startMin, DAY_START)) / 60) * HOUR_PX, 14);
                            const appointment = side === 'appointment';
                            return (
                                <div
                                    key={block.id}
                                    title={`${block.name}${block.detail ? ` · ${block.detail}` : ''}`}
                                    className={`absolute rounded px-0.5 overflow-hidden text-[10px] leading-tight ${appointment ? 'bg-indigo-600 text-white' : 'bg-amber-200/90 text-amber-950 border border-amber-400'}`}
                                    style={{ top, height, ...trackStyle(block.lane, block.lanes, side) }}
                                >
                                    <span className="font-medium block truncate">{block.name}</span>
                                </div>
                            );
                        };
                        return (
                            <div key={key} className="relative border-l border-gray-100" style={{ height: hours.length * HOUR_PX }}>
                                {hours.map(hour => (
                                    <div key={hour} className="border-t border-gray-100" style={{ height: HOUR_PX }} />
                                ))}
                                <div className="absolute inset-y-0 left-1/2 w-px bg-gray-200" />
                                {availability.map(block => paint(block, 'availability'))}
                                {appointments.map(block => paint(block, 'appointment'))}
                            </div>
                        );
                    })}
                </div>
            </div>
            </>
            )}
            {mode === 'staff' && !closed && onConfirm && (
                <form
                    className="space-y-2 border border-indigo-200 rounded-lg p-3"
                    onSubmit={event => {
                        event.preventDefault();
                        if (readOnly) {
                            onLocked?.();
                            return;
                        }
                        if (!memberId) return;
                        onConfirm(memberId, { modality, place, date, start, end });
                        setPlace('');
                        setStart('');
                        setEnd('');
                    }}
                >
                    <h3 className="text-xs font-semibold text-indigo-900">Cita final</h3>
                    <p className="text-[11px] text-gray-500">La confirma el consultor para un candidato. Queda en azul, distinta de la disponibilidad de la sala.</p>
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
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input type="date" value={date} onChange={event => setDate(event.target.value)} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                        <input type="time" value={start} onChange={event => setStart(event.target.value)} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                        <input type="time" value={end} onChange={event => setEnd(event.target.value)} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                    </div>
                    <button type="submit" disabled={busy || !memberId || !date || !start || !end} className="text-sm px-3 py-1.5 rounded-lg bg-indigo-600 text-white disabled:opacity-40">
                        Agendar cita final
                    </button>
                </form>
            )}
            {mode === 'client' && !closed && onSetAvailability && (
                <InterviewForm busy={busy} readOnly={readOnly} onLocked={onLocked} onSubmit={onSetAvailability} />
            )}
            {mode === 'client' && (
                <p className="text-[11px] text-gray-500">Los bloques ámbar son su disponibilidad para toda la sala. Los bloques azules son las citas que confirma Opalo con cada candidato.</p>
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
