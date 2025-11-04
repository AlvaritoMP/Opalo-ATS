
import React, { useState, useRef, useCallback } from 'react';
import { Candidate, Attachment } from '../types';
import { useAppState } from '../App';
import { X, User, Mail, Phone, FileText, StickyNote, Download, Eye, Upload, Paperclip, Trash2, Clock } from 'lucide-react';

const AttachmentPreviewModal: React.FC<{ attachment: Attachment; onClose: () => void }> = ({ attachment, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60]" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-800">{attachment.name}</h3>
                    <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
                        <X className="w-5 h-5 text-gray-600" />
                    </button>
                </div>
                <div className="flex-1 p-4 flex items-center justify-center overflow-auto">
                    {attachment.type.startsWith('image/') ? (
                        <img src={attachment.url} alt={attachment.name} className="max-w-full max-h-full object-contain" />
                    ) : (
                        <div className="text-center">
                            <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                            <h4 className="text-xl font-semibold">Preview not available</h4>
                            <p className="text-gray-500">In-app preview for "{attachment.type}" files is not supported.</p>
                            <a href={attachment.url} download={attachment.name} className="mt-6 inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg shadow-sm hover:bg-primary-700">
                                <Download className="w-4 h-4 mr-2" /> Download File
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};


interface CandidateDetailsModalProps {
    candidate: Candidate;
    onClose: () => void;
}

export const CandidateDetailsModal: React.FC<CandidateDetailsModalProps> = ({ candidate, onClose }) => {
    const { state, actions } = useAppState();
    const process = state.processes.find(p => p.id === candidate.processId);
    const [notes, setNotes] = useState(candidate.notes || '');
    const [previewingAttachment, setPreviewingAttachment] = useState<Attachment | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setNotes(e.target.value);
    };

    const handleSaveNotes = () => {
        if(candidate.notes !== notes) {
            actions.updateCandidate({ ...candidate, notes }, state.currentUser?.name);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const newAttachment: Attachment = {
                id: `file-${Date.now()}`,
                name: file.name,
                url: URL.createObjectURL(file), // In a real app, this would be an upload URL
                type: file.type,
                size: file.size,
            };
            actions.updateCandidate({ ...candidate, attachments: [...candidate.attachments, newAttachment] });
        }
    };
    
    const handleDeleteAttachment = (attachmentId: string) => {
        if (window.confirm('Are you sure you want to delete this attachment?')) {
            actions.updateCandidate({ ...candidate, attachments: candidate.attachments.filter(a => a.id !== attachmentId)});
        }
    };

    const formatBytes = (bytes: number, decimals = 2) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };
    
    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                    <div className="p-6 border-b flex justify-between items-center">
                        <h2 className="text-2xl font-bold text-gray-800">{candidate.name}</h2>
                        <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
                            <X className="w-6 h-6 text-gray-600" />
                        </button>
                    </div>
                    <div className="p-6 space-y-6 overflow-y-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            {/* Left Column */}
                            <div className="space-y-4">
                                <div className="flex items-center text-gray-600">
                                    <User className="w-5 h-5 mr-3 flex-shrink-0" />
                                    <span className="truncate" title={process?.title}>{process?.title}</span>
                                </div>
                                <div className="flex items-center text-gray-600">
                                    <Mail className="w-5 h-5 mr-3 flex-shrink-0" />
                                    <a href={`mailto:${candidate.email}`} className="text-primary-600 hover:underline truncate" title={candidate.email}>{candidate.email}</a>
                                </div>
                                {candidate.phone && (
                                    <div className="flex items-center text-gray-600">
                                        <Phone className="w-5 h-5 mr-3 flex-shrink-0" />
                                        <span>{candidate.phone}</span>
                                    </div>
                                )}
                            </div>
                            {/* Right Column */}
                            <div>
                                <h3 className="font-semibold text-gray-700 flex items-center mb-2"><Clock className="w-5 h-5 mr-2" /> Stage History</h3>
                                <ul className="space-y-2 max-h-40 overflow-y-auto pr-2">
                                    {candidate.history.slice().reverse().map((h, i) => {
                                        const stage = process?.stages.find(s => s.id === h.stageId);
                                        return (
                                            <li key={i} className="text-sm text-gray-600">
                                                Moved to <span className="font-medium text-gray-800">{stage?.name || 'Unknown Stage'}</span> by <span className="font-medium text-gray-800">{h.movedBy}</span>
                                                <div className="text-xs text-gray-400">{new Date(h.movedAt).toLocaleString()}</div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        </div>

                        <div>
                            <h3 className="font-semibold text-gray-700 flex items-center mb-2"><Paperclip className="w-5 h-5 mr-2" /> Attachments</h3>
                             <div className="space-y-2">
                                {candidate.attachments.map(attachment => (
                                    <div key={attachment.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md border">
                                        <div className="flex items-center overflow-hidden">
                                            <FileText className="w-5 h-5 mr-3 text-gray-500 flex-shrink-0" />
                                            <div className="overflow-hidden">
                                               <p className="text-sm font-medium text-gray-800 truncate">{attachment.name}</p>
                                               <p className="text-xs text-gray-500">{formatBytes(attachment.size)} - {attachment.type}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
                                            <button onClick={() => setPreviewingAttachment(attachment)} className="p-2 rounded-md hover:bg-gray-200" title="Preview"><Eye className="w-4 h-4 text-gray-600" /></button>
                                            <a href={attachment.url} download={attachment.name} className="p-2 rounded-md hover:bg-gray-200" title="Download"><Download className="w-4 h-4 text-gray-600" /></a>
                                            <button onClick={() => handleDeleteAttachment(attachment.id)} className="p-2 rounded-md hover:bg-red-100" title="Delete"><Trash2 className="w-4 h-4 text-red-500" /></button>
                                        </div>
                                    </div>
                                ))}
                                {candidate.attachments.length === 0 && <p className="text-sm text-gray-500">No attachments found.</p>}
                            </div>
                            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                            <button onClick={() => fileInputRef.current?.click()} className="mt-3 flex items-center text-sm font-medium text-primary-600 hover:text-primary-800">
                                <Upload className="w-4 h-4 mr-1" /> Upload File
                            </button>
                        </div>
                        
                        <div>
                            <h3 className="font-semibold text-gray-700 flex items-center mb-2"><StickyNote className="w-5 h-5 mr-2" /> Notes</h3>
                            <textarea 
                                rows={5} 
                                value={notes}
                                onChange={handleNotesChange}
                                onBlur={handleSaveNotes}
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                                placeholder="Add notes about this candidate..."
                            />
                        </div>

                    </div>
                    <div className="p-6 bg-gray-50 rounded-b-xl flex justify-end">
                        <button onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">Close</button>
                    </div>
                </div>
            </div>
            {previewingAttachment && <AttachmentPreviewModal attachment={previewingAttachment} onClose={() => setPreviewingAttachment(null)} />}
        </>
    );
};
