import React, { useState } from 'react';
import { useAppState } from '../App';
import { PostIt } from '../types';
import { X, Plus, Trash2 } from 'lucide-react';

interface PostItModalProps {
    candidateId: string;
    onClose: () => void;
}

export const PostItModal: React.FC<PostItModalProps> = ({ candidateId, onClose }) => {
    const { state, actions } = useAppState();
    const [text, setText] = useState('');
    const [color, setColor] = useState<PostIt['color']>('yellow');
    
    const candidate = state.candidates.find(c => c.id === candidateId);
    const postIts = candidate?.postIts || [];
    
    const colorOptions: PostIt['color'][] = ['yellow', 'pink', 'blue', 'green', 'orange'];
    const colorClasses = {
        yellow: 'bg-yellow-200 border-yellow-300 text-yellow-900',
        pink: 'bg-pink-200 border-pink-300 text-pink-900',
        blue: 'bg-blue-200 border-blue-300 text-blue-900',
        green: 'bg-green-200 border-green-300 text-green-900',
        orange: 'bg-orange-200 border-orange-300 text-orange-900',
    };

    const handleAddPostIt = () => {
        if (!text.trim()) {
            alert('Por favor ingresa un texto para el post-it');
            return;
        }
        
        actions.addPostIt(candidateId, {
            text: text.trim(),
            color,
            createdBy: state.currentUser?.id || 'unknown',
        });
        
        setText('');
    };

    const handleDeletePostIt = (postItId: string) => {
        if (confirm('¿Estás seguro de que quieres eliminar este post-it?')) {
            actions.deletePostIt(candidateId, postItId);
        }
    };

    const getCreatedBy = (userId: string) => {
        const user = state.users.find(u => u.id === userId);
        return user?.name || 'Usuario desconocido';
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="p-6 border-b flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-800">Post-its - {candidate?.name}</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
                        <X className="w-6 h-6 text-gray-600" />
                    </button>
                </div>
                
                <div className="p-6 flex-1 overflow-y-auto">
                    {/* Formulario para agregar post-it */}
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Nuevo Post-it
                        </label>
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="Escribe tu nota aquí..."
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 mb-3"
                        />
                        
                        <div className="flex items-center justify-between">
                            <div className="flex gap-2">
                                {colorOptions.map((col) => (
                                    <button
                                        key={col}
                                        onClick={() => setColor(col)}
                                        className={`w-8 h-8 rounded border-2 ${
                                            color === col
                                                ? `${colorClasses[col]} border-gray-600`
                                                : `${colorClasses[col]} border-transparent opacity-50`
                                        }`}
                                        title={col}
                                    />
                                ))}
                            </div>
                            <button
                                onClick={handleAddPostIt}
                                className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Agregar
                            </button>
                        </div>
                    </div>

                    {/* Lista de post-its */}
                    <div className="space-y-3">
                        {postIts.length === 0 ? (
                            <p className="text-center text-gray-500 py-8">
                                No hay post-its. Agrega uno para comenzar.
                            </p>
                        ) : (
                            postIts.map((postIt) => (
                                <div
                                    key={postIt.id}
                                    className={`p-3 rounded-lg border-2 shadow-sm ${colorClasses[postIt.color]} relative group`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <p className="text-xs text-gray-600">
                                            {getCreatedBy(postIt.createdBy)} • {new Date(postIt.createdAt).toLocaleDateString('es-ES', {
                                                day: 'numeric',
                                                month: 'short',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </p>
                                        <button
                                            onClick={() => handleDeletePostIt(postIt.id)}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-black hover:bg-opacity-10"
                                            title="Eliminar"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <p className="text-sm whitespace-pre-wrap">{postIt.text}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};


