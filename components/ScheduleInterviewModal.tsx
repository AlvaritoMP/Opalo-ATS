import React, { useState, useEffect } from 'react';
import { useAppState } from '../App';
import { InterviewEvent } from '../types';
import { X, Calendar, Clock, User, Briefcase, FileText, Mail, Download, Plus } from 'lucide-react';
import { downloadICSFile, sendEmailInvitations } from '../lib/calendarUtils';

interface ScheduleInterviewModalProps {
    event: InterviewEvent | null;
    defaultDate?: Date;
    defaultCandidateId?: string;
    onClose: () => void;
}

export const ScheduleInterviewModal: React.FC<ScheduleInterviewModalProps> = ({ event, defaultDate, defaultCandidateId, onClose }) => {
    const { state, actions } = useAppState();
    const [candidateId, setCandidateId] = useState(event?.candidateId || defaultCandidateId || '');
    const [interviewerId, setInterviewerId] = useState(event?.interviewerId || '');
    const [date, setDate] = useState(event ? event.start.toISOString().split('T')[0] : (defaultDate || new Date()).toISOString().split('T')[0]);
    const [startTime, setStartTime] = useState(event ? event.start.toTimeString().substring(0, 5) : '10:00');
    const [endTime, setEndTime] = useState(event ? event.end.toTimeString().substring(0, 5) : '11:00');
    const [notes, setNotes] = useState(event?.notes || '');
    const [title, setTitle] = useState(event?.title || '');
    const [attendeeEmails, setAttendeeEmails] = useState<string[]>(event?.attendeeEmails || []);
    const [newEmail, setNewEmail] = useState('');

    useEffect(() => {
        if (!event && candidateId && interviewerId) {
            const candidate = state.candidates.find(c => c.id === candidateId);
            const interviewer = state.users.find(u => u.id === interviewerId);
            setTitle(`Interview: ${candidate?.name} & ${interviewer?.name}`);
            
            // Auto-completar emails del candidato e entrevistador
            const emails: string[] = [];
            if (candidate?.email) emails.push(candidate.email);
            if (interviewer?.email) emails.push(interviewer.email);
            if (emails.length > 0 && attendeeEmails.length === 0) {
                setAttendeeEmails(emails);
            }
        }
    }, [candidateId, interviewerId, event, state.candidates, state.users, attendeeEmails.length]);

    const addEmail = () => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const trimmedEmail = newEmail.trim();
        
        if (!trimmedEmail) {
            alert('Por favor ingresa un email');
            return;
        }
        
        if (!emailRegex.test(trimmedEmail)) {
            alert('Por favor ingresa un email válido');
            return;
        }
        
        if (attendeeEmails.includes(trimmedEmail)) {
            alert('Este email ya está en la lista');
            return;
        }
        
        setAttendeeEmails([...attendeeEmails, trimmedEmail]);
        setNewEmail('');
    };

    const removeEmail = (emailToRemove: string) => {
        setAttendeeEmails(attendeeEmails.filter(email => email !== emailToRemove));
    };

    const handleDownloadICS = () => {
        const startDateTime = new Date(`${date}T${startTime}`);
        const endDateTime = new Date(`${date}T${endTime}`);
        const candidate = state.candidates.find(c => c.id === candidateId);
        const interviewer = state.users.find(u => u.id === interviewerId);
        
        downloadICSFile(
            title,
            notes || `Entrevista con ${candidate?.name || 'candidato'}`,
            startDateTime,
            endDateTime,
            '', // location
            attendeeEmails
        );
    };

    const handleSendEmails = async () => {
        const startDateTime = new Date(`${date}T${startTime}`);
        const endDateTime = new Date(`${date}T${endTime}`);
        const candidate = state.candidates.find(c => c.id === candidateId);
        const interviewer = state.users.find(u => u.id === interviewerId);
        
        await sendEmailInvitations(
            attendeeEmails,
            title,
            startDateTime,
            endDateTime,
            notes,
            candidate?.name || '',
            interviewer?.name || ''
        );
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!candidateId || !interviewerId) {
            alert("Selecciona un candidato y un entrevistador.");
            return;
        }

        const startDateTime = new Date(`${date}T${startTime}`);
        const endDateTime = new Date(`${date}T${endTime}`);
        
        if (startDateTime >= endDateTime) {
            alert("La hora de fin debe ser posterior a la hora de inicio.");
            return;
        }

        const eventData = {
            title,
            start: startDateTime,
            end: endDateTime,
            candidateId,
            interviewerId,
            notes,
            attendeeEmails: attendeeEmails.length > 0 ? attendeeEmails : undefined,
        };

        if (event) {
            await actions.updateInterviewEvent({ ...event, ...eventData });
        } else {
            await actions.addInterviewEvent(eventData);
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
                <form onSubmit={handleSubmit}>
                    <div className="p-6 border-b flex justify-between items-center">
                        <h2 className="text-2xl font-bold text-gray-800">{event ? 'Editar entrevista' : 'Programar entrevista'}</h2>
                        <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
                            <X className="w-6 h-6 text-gray-600" />
                        </button>
                    </div>
                    <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                        <div>
                            <label htmlFor="candidateId" className="block text-sm font-medium text-gray-700 flex items-center"><Briefcase className="w-4 h-4 mr-2"/> Candidato</label>
                            <select id="candidateId" value={candidateId} onChange={e => setCandidateId(e.target.value)} required disabled={!!defaultCandidateId} className="mt-1 block w-full input">
                                <option value="" disabled>Selecciona un candidato</option>
                                {state.candidates.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                         <div>
                            <label htmlFor="interviewerId" className="block text-sm font-medium text-gray-700 flex items-center"><User className="w-4 h-4 mr-2"/> Entrevistador</label>
                            <select id="interviewerId" value={interviewerId} onChange={e => setInterviewerId(e.target.value)} required className="mt-1 block w-full input">
                                <option value="" disabled>Selecciona un entrevistador</option>
                                {state.users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                        </div>
                         <div>
                            <label htmlFor="title" className="block text-sm font-medium text-gray-700">Título</label>
                            <input type="text" id="title" value={title} onChange={e => setTitle(e.target.value)} required className="mt-1 block w-full input"/>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-1">
                                <label htmlFor="date" className="block text-sm font-medium text-gray-700 flex items-center"><Calendar className="w-4 h-4 mr-2"/> Fecha</label>
                                <input type="date" id="date" value={date} onChange={e => setDate(e.target.value)} required className="mt-1 block w-full input"/>
                            </div>
                             <div className="md:col-span-1">
                                <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 flex items-center"><Clock className="w-4 h-4 mr-2"/> Hora inicio</label>
                                <input type="time" id="startTime" value={startTime} onChange={e => setStartTime(e.target.value)} required className="mt-1 block w-full input"/>
                            </div>
                             <div className="md:col-span-1">
                                <label htmlFor="endTime" className="block text-sm font-medium text-gray-700 flex items-center"><Clock className="w-4 h-4 mr-2"/> Hora fin</label>
                                <input type="time" id="endTime" value={endTime} onChange={e => setEndTime(e.target.value)} required className="mt-1 block w-full input"/>
                            </div>
                        </div>
                        <div>
                            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 flex items-center"><FileText className="w-4 h-4 mr-2"/> Notas</label>
                            <textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="mt-1 block w-full input" />
                        </div>
                        
                        {/* Sección de Emails de Asistentes */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 flex items-center mb-2">
                                <Mail className="w-4 h-4 mr-2"/> 
                                Emails de Asistentes
                            </label>
                            <div className="space-y-2">
                                {/* Lista de emails */}
                                {attendeeEmails.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {attendeeEmails.map((email, index) => (
                                            <span 
                                                key={index}
                                                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary-100 text-primary-800"
                                            >
                                                {email}
                                                <button
                                                    type="button"
                                                    onClick={() => removeEmail(email)}
                                                    className="ml-2 hover:text-primary-600"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                                
                                {/* Input para agregar email */}
                                <div className="flex gap-2">
                                    <input
                                        type="email"
                                        value={newEmail}
                                        onChange={e => setNewEmail(e.target.value)}
                                        onKeyPress={e => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                addEmail();
                                            }
                                        }}
                                        placeholder="email@ejemplo.com"
                                        className="flex-1 input"
                                    />
                                    <button
                                        type="button"
                                        onClick={addEmail}
                                        className="px-3 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 flex items-center"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500">
                                    Los emails del candidato e entrevistador se agregan automáticamente
                                </p>
                            </div>
                        </div>
                        
                        {/* Botones de Acción Adicionales */}
                        {(attendeeEmails.length > 0 || event) && (
                            <div className="pt-4 border-t border-gray-200">
                                <p className="text-sm font-medium text-gray-700 mb-3">Acciones de Calendario</p>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={handleDownloadICS}
                                        className="flex-1 flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                                    >
                                        <Download className="w-4 h-4 mr-2" />
                                        Descargar .ics
                                    </button>
                                    {attendeeEmails.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={handleSendEmails}
                                            className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                        >
                                            <Mail className="w-4 h-4 mr-2" />
                                            Enviar Invitación
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="p-6 bg-gray-50 rounded-b-xl flex justify-end space-x-3">
                        <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
                        <button type="submit" className="btn-primary">{event ? 'Guardar cambios' : 'Programar'}</button>
                    </div>
                </form>
            </div>
             <style>{`.input { padding: 0.5rem 0.75rem; border: 1px solid #D1D5DB; border-radius: 0.375rem; box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05); } .btn-primary { padding: 0.5rem 1rem; background-color: #2563eb; color: white; border-radius: 0.375rem; font-weight: 500;} .btn-primary:hover { background-color: #1d4ed8; } .btn-secondary { padding: 0.5rem 1rem; background-color: white; border: 1px solid #D1D5DB; color: #374151; border-radius: 0.375rem; font-weight: 500;} .btn-secondary:hover { background-color: #F9FAFB; }`}</style>
        </div>
    );
};