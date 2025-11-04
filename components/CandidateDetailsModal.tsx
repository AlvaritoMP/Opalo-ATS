import React, { useRef, useState } from 'react';
import { useAppState } from '../App';
import { Candidate, Attachment } from '../types';
import { X, Mail, Phone, Linkedin, User, FileText, Eye, Download, Upload, Trash2, Briefcase, DollarSign, Calendar, Info, MapPin } from 'lucide-react';

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

const DetailItem: React.FC<{icon: React.ElementType, label: string, value?: string | number, href?: string}> = ({icon: Icon, label, value, href}) => (
    <div className="flex items-start text-sm">
        <Icon className="w-4 h-4 mr-3 mt-0.5 text-gray-400 flex-shrink-0" />
        <div>
            <span className="font-medium text-gray-700">{label}: </span>
            {href ? (
                 <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary-600 break-all hover:underline">{value}</a>
            ) : (
                <span className="text-gray-600">{value || 'N/A'}</span>
            )}
        </div>
    </div>
);


export const CandidateDetailsModal: React.FC<{ candidate: Candidate, onClose: () => void }> = ({ candidate: initialCandidate, onClose }) => {
    const { state, actions } = useAppState();
    const [candidate, setCandidate] = useState(initialCandidate);
    const [previewFile, setPreviewFile] = useState<Attachment | null>(candidate.attachments?.[0] || null);
    const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');

    const avatarInputRef = useRef<HTMLInputElement>(null);
    const attachmentInputRef = useRef<HTMLInputElement>(null);
    
    const process = state.processes.find(p => p.id === candidate.processId);
    
    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            const dataUrl = await fileToBase64(file);
            const updatedCandidate = { ...candidate, avatarUrl: dataUrl };
            setCandidate(updatedCandidate);
            await actions.updateCandidate(updatedCandidate, state.currentUser?.name);
        }
    };
    
    const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
         const file = e.target.files?.[0];
        if (file) {
            const dataUrl = await fileToBase64(file);
            const newAttachment: Attachment = {
                id: `att-c-${Date.now()}`,
                name: file.name,
                url: dataUrl,
                type: file.type,
                size: file.size,
            };
            const updatedCandidate = { ...candidate, attachments: [...candidate.attachments, newAttachment] };
            setCandidate(updatedCandidate);
            await actions.updateCandidate(updatedCandidate, state.currentUser?.name);
        }
    };
    
     const handleDeleteAttachment = async (id: string) => {
        const updatedAttachments = candidate.attachments.filter(att => att.id !== id);
        const updatedCandidate = { ...candidate, attachments: updatedAttachments };
        setCandidate(updatedCandidate);
        await actions.updateCandidate(updatedCandidate, state.currentUser?.name);
        if(previewFile?.id === id) setPreviewFile(null);
    };

    if (!process) return null;
    
    const TabButton: React.FC<{tabId: 'details' | 'history', children: React.ReactNode}> = ({tabId, children}) => (
        <button 
            onClick={() => setActiveTab(tabId)}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === tabId ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
        >{children}</button>
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl flex flex-col max-h-[90vh]">
                <header className="p-4 border-b flex justify-between items-center flex-shrink-0">
                    <div className="flex items-center space-x-4">
                        <div className="relative group">
                             {candidate.avatarUrl ? (
                                <img src={candidate.avatarUrl} alt={candidate.name} className="w-16 h-16 rounded-full object-cover" />
                            ) : (
                                <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                                    <User className="w-8 h-8 text-gray-500" />
                                </div>
                            )}
                            <button onClick={() => avatarInputRef.current?.click()} className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                <Upload className="w-6 h-6" />
                            </button>
                            <input type="file" accept="image/*" ref={avatarInputRef} onChange={handleAvatarUpload} className="hidden" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800">{candidate.name}</h2>
                            <p className="text-sm text-gray-500">Applied for: {process.title}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100"><X /></button>
                </header>
                 <div className="border-b flex-shrink-0">
                    <nav className="flex space-x-4 px-6">
                        <TabButton tabId="details">Details</TabButton>
                        <TabButton tabId="history">History</TabButton>
                    </nav>
                </div>
                <main className="flex-1 overflow-y-auto">
                   {activeTab === 'details' && (
                        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Left Column - Details */}
                            <div className="space-y-6">
                                <div className="p-4 bg-gray-50 rounded-lg border">
                                    <h3 className="font-semibold text-gray-700 mb-3">Contact & Personal Info</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <DetailItem icon={Mail} label="Email" value={candidate.email} href={`mailto:${candidate.email}`} />
                                    <DetailItem icon={Phone} label="Phone" value={candidate.phone} />
                                    <DetailItem icon={Linkedin} label="LinkedIn" value={candidate.linkedinUrl} href={candidate.linkedinUrl} />
                                    <DetailItem icon={Calendar} label="Age" value={candidate.age} />
                                    <DetailItem icon={Info} label="DNI" value={candidate.dni} />
                                    <DetailItem icon={Briefcase} label="Source" value={candidate.source} />
                                    <DetailItem icon={MapPin} label="Address" value={candidate.address} />
                                    <DetailItem icon={DollarSign} label="Salary Expectation" value={candidate.salaryExpectation} />
                                    </div>
                                </div>

                                <div>
                                    <h3 className="font-semibold text-gray-700 mb-2">Attachments</h3>
                                    <div className="space-y-2">
                                        {candidate.attachments.map(att => (
                                            <div key={att.id} className="flex items-center justify-between p-2 rounded-md border bg-white hover:bg-gray-50">
                                                <div className="flex items-center overflow-hidden"><FileText className="w-5 h-5 mr-3 text-gray-500 flex-shrink-0" /><p className="text-sm font-medium text-gray-800 truncate">{att.name}</p></div>
                                                <div className="flex items-center space-x-1">
                                                    <button onClick={() => setPreviewFile(att)} className="p-1 rounded-md hover:bg-gray-200" title="Preview"><Eye className="w-4 h-4 text-gray-600" /></button>
                                                    <a href={att.url} download={att.name} className="p-1 rounded-md hover:bg-gray-200" title="Download"><Download className="w-4 h-4 text-gray-600" /></a>
                                                    <button onClick={() => handleDeleteAttachment(att.id)} className="p-1 rounded-md hover:bg-red-100" title="Delete"><Trash2 className="w-4 h-4 text-red-500" /></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <input type="file" ref={attachmentInputRef} onChange={handleAttachmentUpload} className="hidden" />
                                    <button type="button" onClick={() => attachmentInputRef.current?.click()} className="mt-2 flex items-center text-sm font-medium text-primary-600 hover:text-primary-800"><Upload className="w-4 h-4 mr-1" /> Upload Document</button>
                                </div>
                            </div>
                            {/* Right Column - Preview */}
                            <div className="bg-gray-100 rounded-lg border flex flex-col items-center justify-center p-4 min-h-[400px]">
                                {previewFile ? (
                                    <div className="w-full h-full">
                                    {previewFile.type.startsWith('image/') ? (
                                        <img src={previewFile.url} alt={previewFile.name} className="max-w-full max-h-full object-contain" />
                                    ) : previewFile.type === 'application/pdf' ? (
                                        <iframe src={previewFile.url} title={previewFile.name} className="w-full h-full border-0" />
                                    ) : (
                                        <div className="text-center">
                                            <FileText className="w-16 h-16 mx-auto text-gray-400" />
                                            <p className="mt-2 text-gray-600">No preview available for this file type.</p>
                                            <a href={previewFile.url} download={previewFile.name} className="mt-4 inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg">
                                                <Download className="w-4 h-4 mr-2" /> Download "{previewFile.name}"
                                            </a>
                                        </div>
                                    )}
                                    </div>
                                ) : (
                                    <div className="text-center text-gray-500">
                                        <Eye className="w-12 h-12 mx-auto mb-2" />
                                        <p>Select a file to preview</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    {activeTab === 'history' && (
                        <div className="p-6">
                             <ul className="border rounded-lg overflow-hidden">
                                <li className="p-3 bg-gray-50 font-medium text-sm grid grid-cols-3">
                                    <span>Stage</span>
                                    <span className="text-center">Moved By</span>
                                    <span className="text-right">Date</span>
                                </li>
                                {candidate.history.length > 0 ? candidate.history.slice().reverse().map((h, index) => (
                                    <li key={index} className="p-3 border-t grid grid-cols-3 items-center">
                                        <p className="font-medium text-gray-800">{process.stages.find(s => s.id === h.stageId)?.name || 'Unknown'}</p>
                                        <p className="text-sm text-gray-500 text-center">{h.movedBy}</p>
                                        <p className="text-sm text-gray-500 text-right">{new Date(h.movedAt).toLocaleString()}</p>
                                    </li>
                                )) : (
                                    <li className="p-6 text-center text-gray-500">No history found.</li>
                                )}
                             </ul>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};