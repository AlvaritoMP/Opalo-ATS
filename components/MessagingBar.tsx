import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MessageCircle, X, ChevronUp, ChevronDown, Send, Minimize2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { userMessagesApi } from '../lib/api/userMessages';
import type { User, UserMessage } from '../types';

const STORAGE_KEY_PREFIX = 'ats_messaging_hidden_';
const POLL_INTERVAL_MS = 15_000;

function formatTime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
}

function formatDay(iso: string): string {
    const d = new Date(iso);
    const today = new Date();
    const isToday =
        d.getDate() === today.getDate() &&
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear();
    if (isToday) return 'Hoy';
    return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
}

interface ThreadPreview {
    partnerId: string;
    partnerName: string;
    lastMessage: UserMessage;
    unread: number;
}

interface MessagingBarProps {
    currentUser: User;
    users: User[];
    onNewMessage?: (fromName: string) => void;
    onSendError?: (message: string) => void;
}

export const MessagingBar: React.FC<MessagingBarProps> = ({
    currentUser,
    users,
    onNewMessage,
    onSendError,
}) => {
    const [messages, setMessages] = useState<UserMessage[]>([]);
    const [expanded, setExpanded] = useState(false);
    const [hidden, setHidden] = useState(() => {
        try {
            return localStorage.getItem(`${STORAGE_KEY_PREFIX}${currentUser.id}`) === '1';
        } catch {
            return false;
        }
    });
    const [activePartnerId, setActivePartnerId] = useState<string | null>(null);
    const [draft, setDraft] = useState('');
    const [sending, setSending] = useState(false);
    const [available, setAvailable] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const onNewMessageRef = useRef(onNewMessage);
    const onSendErrorRef = useRef(onSendError);
    onNewMessageRef.current = onNewMessage;
    onSendErrorRef.current = onSendError;

    const otherUsers = useMemo(
        () => users.filter(u => u.id !== currentUser.id),
        [users, currentUser.id]
    );

    const userNameById = useMemo(() => {
        const map = new Map<string, string>();
        for (const u of users) map.set(u.id, u.name);
        return map;
    }, [users]);

    const mergeIncomingMessage = useCallback((msg: UserMessage) => {
        setMessages(prev => {
            if (prev.some(m => m.id === msg.id)) return prev;
            return [...prev, msg];
        });

        if (msg.recipientId === currentUser.id) {
            const fromName = userNameById.get(msg.senderId) || 'Un usuario';
            setHidden(prevHidden => {
                if (prevHidden) {
                    try {
                        localStorage.removeItem(`${STORAGE_KEY_PREFIX}${currentUser.id}`);
                    } catch { /* ignore */ }
                }
                return false;
            });
            setExpanded(true);
            setActivePartnerId(msg.senderId);
            onNewMessageRef.current?.(fromName);
        }
    }, [currentUser.id, userNameById]);

    const threads = useMemo((): ThreadPreview[] => {
        const map = new Map<string, ThreadPreview>();
        for (const msg of messages) {
            const partnerId =
                msg.senderId === currentUser.id ? msg.recipientId : msg.senderId;
            const existing = map.get(partnerId);
            const unread =
                msg.recipientId === currentUser.id && !msg.readAt
                    ? (existing?.unread || 0) + 1
                    : existing?.unread || 0;
            if (!existing || new Date(msg.createdAt) > new Date(existing.lastMessage.createdAt)) {
                map.set(partnerId, {
                    partnerId,
                    partnerName: userNameById.get(partnerId) || 'Usuario',
                    lastMessage: msg,
                    unread,
                });
            } else {
                map.set(partnerId, { ...existing, unread });
            }
        }
        return Array.from(map.values()).sort(
            (a, b) =>
                new Date(b.lastMessage.createdAt).getTime() -
                new Date(a.lastMessage.createdAt).getTime()
        );
    }, [messages, currentUser.id, userNameById]);

    const totalUnread = useMemo(
        () => messages.filter(m => m.recipientId === currentUser.id && !m.readAt).length,
        [messages, currentUser.id]
    );

    const conversationMessages = useMemo(() => {
        if (!activePartnerId) return [];
        return messages.filter(
            m =>
                (m.senderId === currentUser.id && m.recipientId === activePartnerId) ||
                (m.senderId === activePartnerId && m.recipientId === currentUser.id)
        );
    }, [messages, activePartnerId, currentUser.id]);

    const loadMessages = useCallback(async () => {
        try {
            const ok = await userMessagesApi.isAvailable();
            setAvailable(ok);
            if (!ok) return;
            const recent = await userMessagesApi.getRecent(currentUser.id, 150);
            setMessages(recent);
        } catch (err) {
            console.warn('No se pudo cargar mensajería:', err);
            setAvailable(false);
        }
    }, [currentUser.id]);

    useEffect(() => {
        void loadMessages();
    }, [loadMessages]);

    useEffect(() => {
        if (!available) return;

        const rowToMessage = (row: Record<string, unknown>): UserMessage => ({
            id: row.id as string,
            senderId: row.sender_id as string,
            recipientId: row.recipient_id as string,
            text: row.text as string,
            readAt: (row.read_at as string) || undefined,
            createdAt: row.created_at as string,
        });

        const channel = supabase
            .channel(`user-messages-in-${currentUser.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'user_messages',
                    filter: `recipient_id=eq.${currentUser.id}`,
                },
                payload => {
                    if (!payload.new) return;
                    mergeIncomingMessage(rowToMessage(payload.new as Record<string, unknown>));
                }
            )
            .subscribe();

        const pollId = window.setInterval(() => {
            void userMessagesApi.getRecent(currentUser.id, 150).then(recent => {
                setMessages(prev => {
                    const known = new Set(prev.map(m => m.id));
                    const merged = [...prev];
                    for (const msg of recent) {
                        if (!known.has(msg.id)) merged.push(msg);
                    }
                    merged.sort(
                        (a, b) =>
                            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                    );
                    return merged;
                });
            });
        }, POLL_INTERVAL_MS);

        return () => {
            void supabase.removeChannel(channel);
            window.clearInterval(pollId);
        };
    }, [available, currentUser.id, mergeIncomingMessage]);

    useEffect(() => {
        if (!expanded || !activePartnerId) return;
        const unreadIds = conversationMessages
            .filter(m => m.recipientId === currentUser.id && !m.readAt)
            .map(m => m.id);
        if (unreadIds.length > 0) {
            void userMessagesApi.markAsRead(unreadIds, currentUser.id).then(() => {
                setMessages(prev =>
                    prev.map(m =>
                        unreadIds.includes(m.id)
                            ? { ...m, readAt: m.readAt || new Date().toISOString() }
                            : m
                    )
                );
            });
        }
    }, [expanded, activePartnerId, conversationMessages, currentUser.id]);

    useEffect(() => {
        if (expanded && activePartnerId) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [conversationMessages, expanded, activePartnerId]);

    const handleSend = async () => {
        if (!activePartnerId || !draft.trim() || sending) return;
        setSending(true);
        try {
            const sent = await userMessagesApi.send(
                currentUser.id,
                activePartnerId,
                draft
            );
            setMessages(prev => [...prev, sent]);
            setDraft('');
        } catch (err) {
            const message =
                err instanceof Error ? err.message : 'No se pudo enviar el mensaje';
            console.error('Error enviando mensaje:', err);
            onSendErrorRef.current?.(message);
        } finally {
            setSending(false);
        }
    };

    const handleHide = () => {
        setHidden(true);
        setExpanded(false);
        try {
            localStorage.setItem(`${STORAGE_KEY_PREFIX}${currentUser.id}`, '1');
        } catch { /* ignore */ }
    };

    const handleShow = () => {
        setHidden(false);
        setExpanded(true);
        try {
            localStorage.removeItem(`${STORAGE_KEY_PREFIX}${currentUser.id}`);
        } catch { /* ignore */ }
    };

    if (!available || otherUsers.length === 0) return null;

    if (hidden) {
        return (
            <button
                onClick={handleShow}
                className="fixed bottom-4 right-4 z-[45] flex items-center gap-2 px-3 py-2 bg-primary-600 text-white rounded-full shadow-lg hover:bg-primary-700 transition-all text-sm font-medium"
                title="Abrir mensajería"
            >
                <MessageCircle className="w-4 h-4" />
                {totalUnread > 0 && (
                    <span className="bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                        {totalUnread > 9 ? '9+' : totalUnread}
                    </span>
                )}
            </button>
        );
    }

    return (
        <div
            className={`fixed z-[45] transition-all duration-200 ${
                expanded
                    ? 'bottom-4 right-4 w-80 sm:w-96'
                    : 'bottom-0 left-0 right-0 md:left-64'
            }`}
        >
            {expanded ? (
                <div className="bg-white border border-gray-200 rounded-xl shadow-2xl flex flex-col overflow-hidden max-h-[min(360px,50vh)]">
                    <div className="flex items-center justify-between px-3 py-2 bg-primary-600 text-white shrink-0">
                        <div className="flex items-center gap-2 min-w-0">
                            {activePartnerId ? (
                                <button
                                    onClick={() => setActivePartnerId(null)}
                                    className="text-white/80 hover:text-white text-xs shrink-0"
                                >
                                    ← Hilos
                                </button>
                            ) : (
                                <MessageCircle className="w-4 h-4 shrink-0" />
                            )}
                            <span className="text-sm font-medium truncate">
                                {activePartnerId
                                    ? userNameById.get(activePartnerId) || 'Chat'
                                    : 'Mensajes'}
                            </span>
                            {totalUnread > 0 && !activePartnerId && (
                                <span className="bg-red-500 text-xs rounded-full px-1.5 py-0.5">
                                    {totalUnread}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                            <button
                                onClick={() => setExpanded(false)}
                                className="p-1 hover:bg-white/20 rounded"
                                title="Minimizar"
                            >
                                <ChevronDown className="w-4 h-4" />
                            </button>
                            <button
                                onClick={handleHide}
                                className="p-1 hover:bg-white/20 rounded"
                                title="Ocultar"
                            >
                                <Minimize2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {!activePartnerId ? (
                        <div className="flex-1 overflow-y-auto min-h-0">
                            {threads.length === 0 ? (
                                <p className="text-sm text-gray-500 p-4 text-center">
                                    Sin conversaciones. Selecciona un usuario para empezar.
                                </p>
                            ) : (
                                threads.map(thread => (
                                    <button
                                        key={thread.partnerId}
                                        onClick={() => setActivePartnerId(thread.partnerId)}
                                        className="w-full text-left px-3 py-2.5 hover:bg-gray-50 border-b border-gray-100 flex items-start gap-2"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-semibold shrink-0">
                                            {thread.partnerName.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-1">
                                                <span className="text-sm font-medium text-gray-900 truncate">
                                                    {thread.partnerName}
                                                </span>
                                                <span className="text-[10px] text-gray-400 shrink-0">
                                                    {formatTime(thread.lastMessage.createdAt)}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-500 truncate">
                                                {thread.lastMessage.senderId === currentUser.id
                                                    ? 'Tú: '
                                                    : ''}
                                                {thread.lastMessage.text}
                                            </p>
                                        </div>
                                        {thread.unread > 0 && (
                                            <span className="bg-primary-600 text-white text-[10px] rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 shrink-0">
                                                {thread.unread}
                                            </span>
                                        )}
                                    </button>
                                ))
                            )}
                            <div className="p-2 border-t border-gray-100">
                                <p className="text-[10px] text-gray-400 mb-1.5 uppercase tracking-wide">
                                    Nuevo mensaje
                                </p>
                                <div className="flex flex-wrap gap-1">
                                    {otherUsers.slice(0, 6).map(u => (
                                        <button
                                            key={u.id}
                                            onClick={() => setActivePartnerId(u.id)}
                                            className="text-xs px-2 py-1 rounded-full bg-gray-100 hover:bg-primary-50 hover:text-primary-700 text-gray-700"
                                        >
                                            {u.name.split(' ')[0]}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[140px] max-h-[220px]">
                                {conversationMessages.map(msg => {
                                    const mine = msg.senderId === currentUser.id;
                                    return (
                                        <div
                                            key={msg.id}
                                            className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div
                                                className={`max-w-[85%] rounded-lg px-2.5 py-1.5 text-sm ${
                                                    mine
                                                        ? 'bg-primary-600 text-white'
                                                        : 'bg-gray-100 text-gray-800'
                                                }`}
                                            >
                                                <p className="break-words">{msg.text}</p>
                                                <p
                                                    className={`text-[10px] mt-0.5 ${
                                                        mine ? 'text-white/70' : 'text-gray-400'
                                                    }`}
                                                >
                                                    {formatDay(msg.createdAt)} {formatTime(msg.createdAt)}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>
                            <div className="flex items-center gap-2 p-2 border-t border-gray-100 shrink-0">
                                <input
                                    type="text"
                                    value={draft}
                                    onChange={e => setDraft(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            void handleSend();
                                        }
                                    }}
                                    placeholder="Escribe un mensaje..."
                                    className="flex-1 text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500"
                                />
                                <button
                                    onClick={() => void handleSend()}
                                    disabled={!draft.trim() || sending}
                                    className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            </div>
                        </>
                    )}
                </div>
            ) : (
                <button
                    onClick={() => setExpanded(true)}
                    className="w-full flex items-center justify-between px-4 py-2 bg-white border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.06)] hover:bg-gray-50 text-sm"
                >
                    <div className="flex items-center gap-2 text-gray-700">
                        <MessageCircle className="w-4 h-4 text-primary-600" />
                        <span className="font-medium">Mensajes</span>
                        {totalUnread > 0 && (
                            <span className="bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                                {totalUnread > 9 ? '9+' : totalUnread}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {threads[0] && (
                            <span className="text-xs text-gray-400 truncate max-w-[200px] hidden sm:inline">
                                {threads[0].partnerName}: {threads[0].lastMessage.text}
                            </span>
                        )}
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                        <button
                            onClick={e => {
                                e.stopPropagation();
                                handleHide();
                            }}
                            className="p-0.5 hover:bg-gray-200 rounded"
                            title="Ocultar mensajería"
                        >
                            <X className="w-3.5 h-3.5 text-gray-400" />
                        </button>
                    </div>
                </button>
            )}
        </div>
    );
};
