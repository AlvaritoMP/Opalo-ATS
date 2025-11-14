import React, { useState, useRef, useEffect } from 'react';
import { useAppState } from '../App';
import { Comment, Attachment } from '../types';
import { X, Send, Image as ImageIcon, Trash2, Paperclip } from 'lucide-react';

interface CandidateCommentsModalProps {
    candidateId: string;
    onClose: () => void;
}

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

export const CandidateCommentsModal: React.FC<CandidateCommentsModalProps> = ({ candidateId, onClose }) => {
    const { state, actions } = useAppState();
    const [commentText, setCommentText] = useState('');
    const [attachments, setAttachments] = useState<File[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    
    const candidate = state.candidates.find(c => c.id === candidateId);
    const comments = candidate?.comments || [];
    
    // Auto-scroll al final cuando hay nuevos comentarios
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [comments]);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        const imageFiles = files.filter(file => file.type.startsWith('image/'));
        
        if (imageFiles.length === 0) {
            alert('Por favor selecciona solo archivos de imagen');
            return;
        }
        
        // Limitar a 5 imágenes por comentario
        if (attachments.length + imageFiles.length > 5) {
            alert('Máximo 5 imágenes por comentario');
            return;
        }
        
        setAttachments(prev => [...prev, ...imageFiles]);
    };

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!commentText.trim() && attachments.length === 0) {
            alert('Por favor ingresa un comentario o adjunta una imagen');
            return;
        }

        setIsSubmitting(true);

        try {
            // Convertir archivos a base64
            const attachmentPromises = attachments.map(async (file) => {
                const dataUrl = await fileToBase64(file);
                return {
                    id: `att-${Date.now()}-${Math.random()}`,
                    name: file.name,
                    url: dataUrl,
                    type: file.type,
                    size: file.size,
                } as Attachment;
            });

            const commentAttachments = await Promise.all(attachmentPromises);

            // Agregar comentario
            await actions.addComment(candidateId, {
                text: commentText.trim(),
                userId: state.currentUser?.id || 'unknown',
                attachments: commentAttachments.length > 0 ? commentAttachments : undefined,
            });

            // Limpiar formulario
            setCommentText('');
            setAttachments([]);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        } catch (error) {
            console.error('Error agregando comentario:', error);
            alert('Error al agregar el comentario');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteComment = (commentId: string) => {
        if (confirm('¿Estás seguro de que quieres eliminar este comentario?')) {
            actions.deleteComment(candidateId, commentId);
        }
    };

    const getUser = (userId: string) => {
        return state.users.find(u => u.id === userId);
    };

    const formatDateTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Ahora';
        if (diffMins < 60) return `Hace ${diffMins} min`;
        if (diffHours < 24) return `Hace ${diffHours} h`;
        if (diffDays < 7) return `Hace ${diffDays} días`;
        
        return date.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const isCurrentUser = (userId: string) => {
        return userId === state.currentUser?.id;
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                <div className="p-6 border-b flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-800">Comentarios - {candidate?.name}</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
                        <X className="w-6 h-6 text-gray-600" />
                    </button>
                </div>
                
                {/* Área de mensajes */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
                    {comments.length === 0 ? (
                        <div className="text-center text-gray-500 py-12">
                            <p className="text-lg mb-2">No hay comentarios aún</p>
                            <p className="text-sm">Sé el primero en comentar sobre este candidato</p>
                        </div>
                    ) : (
                        comments.map((comment) => {
                            const user = getUser(comment.userId);
                            const isOwn = isCurrentUser(comment.userId);
                            
                            return (
                                <div
                                    key={comment.id}
                                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className={`max-w-[80%] ${isOwn ? 'order-2' : 'order-1'}`}>
                                        <div className={`rounded-lg p-4 ${isOwn ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200'}`}>
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center space-x-2">
                                                    <span className={`font-semibold text-sm ${isOwn ? 'text-white' : 'text-gray-800'}`}>
                                                        {user?.name || 'Usuario desconocido'}
                                                    </span>
                                                    <span className={`text-xs ${isOwn ? 'text-primary-100' : 'text-gray-500'}`}>
                                                        {formatDateTime(comment.createdAt)}
                                                    </span>
                                                </div>
                                                {isOwn && (
                                                    <button
                                                        onClick={() => handleDeleteComment(comment.id)}
                                                        className="ml-2 opacity-70 hover:opacity-100"
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                            
                                            {comment.text && (
                                                <p className={`text-sm whitespace-pre-wrap mb-2 ${isOwn ? 'text-white' : 'text-gray-700'}`}>
                                                    {comment.text}
                                                </p>
                                            )}
                                            
                                            {/* Adjuntos */}
                                            {comment.attachments && comment.attachments.length > 0 && (
                                                <div className="grid grid-cols-2 gap-2 mt-2">
                                                    {comment.attachments.map((att) => (
                                                        <div key={att.id} className="relative group">
                                                            <img
                                                                src={att.url}
                                                                alt={att.name}
                                                                className="w-full h-32 object-cover rounded border border-gray-200"
                                                            />
                                                            <a
                                                                href={att.url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity rounded"
                                                            >
                                                                <ImageIcon className="w-6 h-6 text-white opacity-0 group-hover:opacity-100" />
                                                            </a>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Formulario de nuevo comentario */}
                <form onSubmit={handleSubmit} className="p-4 border-t bg-white">
                    {/* Vista previa de adjuntos */}
                    {attachments.length > 0 && (
                        <div className="mb-3 flex flex-wrap gap-2">
                            {attachments.map((file, index) => (
                                <div key={index} className="relative group">
                                    <img
                                        src={URL.createObjectURL(file)}
                                        alt={file.name}
                                        className="w-20 h-20 object-cover rounded border border-gray-200"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeAttachment(index)}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                    
                    <div className="flex items-end space-x-2">
                        <div className="flex-1">
                            <textarea
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                placeholder="Escribe un comentario..."
                                rows={2}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                            />
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Adjuntar imagen"
                        >
                            <Paperclip className="w-5 h-5" />
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || (!commentText.trim() && attachments.length === 0)}
                            className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            title="Enviar comentario"
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                        Puedes adjuntar hasta 5 imágenes por comentario
                    </p>
                </form>
            </div>
        </div>
    );
};


