import React, { useState } from 'react';
import { useAppState } from '../App';
import { FormIntegration, Process } from '../types';
import { X, Copy } from 'lucide-react';

interface FormIntegrationModalProps {
    form: null; // Prop is kept for compatibility but not used for new integrations
    onClose: () => void;
}

export const FormEditorModal: React.FC<FormIntegrationModalProps> = ({ onClose }) => {
    const { state, actions, getLabel } = useAppState();
    const [platform, setPlatform] = useState<'Tally' | 'Google Forms' | 'Microsoft Forms'>('Tally');
    const [formName, setFormName] = useState('');
    const [formIdOrUrl, setFormIdOrUrl] = useState('');
    const [processId, setProcessId] = useState(state.processes[0]?.id || '');
    const [showWebhook, setShowWebhook] = useState(false);
    const webhookUrl = "https://ats-pro.app/api/webhooks/generic/xyz-123-abc";

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!processId) {
            alert('Selecciona un proceso de contratación para vincular este formulario.');
            return;
        }
        await actions.addFormIntegration({
            platform,
            formName,
            formIdOrUrl,
            processId,
        });
        setShowWebhook(true); // Show webhook URL after saving for the user to copy
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(webhookUrl);
        // Add a visual indicator for copy success
    };

    if (showWebhook) {
         return (
             <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-8 text-center">
                    <h2 className="text-2xl font-bold text-gray-800">¡Integración creada!</h2>
                    <p className="mt-2 text-gray-600">
                        Para completar la configuración, copia esta URL de webhook y pégala en los ajustes de tu formulario en {platform}.
                    </p>
                    <div className="mt-4 flex items-center bg-gray-100 border rounded-md p-2">
                        <input type="text" readOnly value={webhookUrl} className="flex-1 bg-transparent text-sm text-gray-700 outline-none" />
                        <button onClick={copyToClipboard} className="p-2 rounded-md hover:bg-gray-200">
                            <Copy className="w-4 h-4 text-gray-600" />
                        </button>
                    </div>
                     <button onClick={onClose} className="mt-6 w-full px-4 py-2 bg-primary-600 text-white rounded-md">Listo</button>
                </div>
             </div>
         );
    }
    
    return (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
                <form onSubmit={handleSubmit}>
                    <div className="p-6 border-b flex justify-between items-center">
                        <h2 className="text-2xl font-bold text-gray-800">{getLabel('modal_new_form_integration', 'Nueva integración de formulario')}</h2>
                        <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
                            <X className="w-6 h-6 text-gray-600" />
                        </button>
                    </div>
                    <div className="p-6 space-y-4">
                        <div>
                            <label htmlFor="platform" className="block text-sm font-medium text-gray-700">Plataforma</label>
                            <select id="platform" value={platform} onChange={e => setPlatform(e.target.value as any)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm">
                                <option>Tally</option>
                                <option>Google Forms</option>
                                <option>Microsoft Forms</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="formName" className="block text-sm font-medium text-gray-700">Nombre del formulario</label>
                            <input type="text" id="formName" value={formName} onChange={e => setFormName(e.target.value)} required placeholder="Ej: Postulación Desarrollador Senior" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                        </div>
                        <div>
                            <label htmlFor="formIdOrUrl" className="block text-sm font-medium text-gray-700">URL del formulario</label>
                            <input type="text" id="formIdOrUrl" value={formIdOrUrl} onChange={e => setFormIdOrUrl(e.target.value)} required placeholder="Pega la URL pública de tu formulario" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                        </div>
                         <div>
                            <label htmlFor="processId" className="block text-sm font-medium text-gray-700">Vincular a proceso</label>
                            <select id="processId" value={processId} onChange={e => setProcessId(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm">
                                {state.processes.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                            </select>
                        </div>
                    </div>
                     <div className="p-6 bg-gray-50 rounded-b-xl flex justify-end space-x-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 rounded-md">Cancelar</button>
                        <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-md">Crear integración</button>
                    </div>
                </form>
            </div>
        </div>
    );
};