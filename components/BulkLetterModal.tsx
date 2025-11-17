import React, { useMemo, useState } from 'react';
import { useAppState } from '../App';
import { Candidate } from '../types';
import { X, Upload, Download } from 'lucide-react';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

const blobToDataUrl = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
});

export const BulkLetterModal: React.FC<{ candidateIds: string[]; onClose: () => void }> = ({ candidateIds, onClose }) => {
    const { state, actions } = useAppState();
    const candidates = useMemo(() => state.candidates.filter(c => candidateIds.includes(c.id)), [state.candidates, candidateIds]);
    const [uploadedName, setUploadedName] = useState<string>('');
    const [uploadedBuffer, setUploadedBuffer] = useState<ArrayBuffer | null>(null);
    const [detectedKeys, setDetectedKeys] = useState<string[]>([]);
    const [data, setData] = useState<Record<string, string>>({});
    const [isGenerating, setIsGenerating] = useState(false);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

    const savedTemplates = state.settings?.templates || [];

    const fromBase64ToArrayBuffer = (b64: string): ArrayBuffer => {
        const binary = atob(b64);
        const len = binary.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
        return bytes.buffer;
    };

    const loadSavedTemplate = (tplId: string) => {
        const tpl = savedTemplates.find(t => t.id === tplId);
        if (!tpl) return;
        setSelectedTemplateId(tplId);
        const buf = fromBase64ToArrayBuffer(tpl.docxBase64);
        setUploadedBuffer(buf);
        setUploadedName(`${tpl.name}.docx`);
        try {
            const zip = new PizZip(buf);
            const xml = zip.file('word/document.xml')?.asText() || '';
            const keys = new Set<string>();
            const re = /\{\{([^}]+)\}\}/g;
            let m: RegExpExecArray | null;
            while ((m = re.exec(xml)) !== null) keys.add(m[1].trim());
            setDetectedKeys(Array.from(keys));
        } catch {
            alert('No se pudo leer la plantilla guardada.');
        }
    };

    const generateForAll = async () => {
        if (!uploadedBuffer) {
            alert('Sube o selecciona una plantilla .docx primero.');
            return;
        }
        setIsGenerating(true);
        try {
            for (const cand of candidates) {
                const zip = new PizZip(uploadedBuffer);
                const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
                const merged: Record<string, string> = {
                    candidateName: cand.name,
                    candidateEmail: cand.email,
                    candidatePhone: cand.phone || '',
                    candidateDni: cand.dni || '',
                    ...data,
                };
                doc.setData(merged);
                doc.render();
                const out = doc.getZip().generate({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
                const nameSafe = cand.name.replace(/[^a-z0-9_-]/gi, '_');
                const finalName = `${(uploadedName || 'documento').replace(/\.docx?$/i, '')}_${nameSafe}.docx`;
                const url = await blobToDataUrl(out);
                const updated = {
                    ...cand,
                    attachments: [
                        ...cand.attachments,
                        { id: `att-${Date.now()}-${Math.random().toString(36).slice(2)}`, name: finalName, url, type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: out.size },
                    ],
                };
                await actions.updateCandidate(updated, state.currentUser?.name);
            }
            alert('Documentos generados y guardados en cada candidato.');
            onClose();
        } catch (e) {
            console.error(e);
            alert('Ocurrió un error al generar los documentos.');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl">
                <div className="p-6 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800">Emitir cartas para {candidates.length} candidato(s)</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100"><X /></button>
                </div>
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    <div className="flex items-center gap-3">
                        <div className="flex-1">
                            {state.settings?.templates?.length ? (
                                <select
                                    value={selectedTemplateId}
                                    onChange={e => e.target.value && loadSavedTemplate(e.target.value)}
                                    className="w-full border-gray-300 rounded-md shadow-sm"
                                >
                                    <option value="">Seleccionar plantilla guardada</option>
                                    {state.settings.templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            ) : (
                                <p className="text-sm text-gray-500">No hay plantillas guardadas. Cárgalas y guárdalas en la sección “Cartas”.</p>
                            )}
                        </div>
                        {uploadedName && <span className="text-sm text-gray-600 whitespace-nowrap">Plantilla: {uploadedName}</span>}
                    </div>
                    {uploadedBuffer && (
                        <div className="space-y-2">
                            <h3 className="text-sm font-semibold text-gray-800">Campos de plantilla</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {detectedKeys.length > 0 ? detectedKeys.map(k => (
                                    <div key={k}>
                                        <label className="block text-xs text-gray-600 mb-1">{k}</label>
                                        <input
                                            value={data[k] || ''}
                                            onChange={e => setData(prev => ({ ...prev, [k]: e.target.value }))}
                                            className="w-full border-gray-300 rounded-md shadow-sm"
                                        />
                                    </div>
                                )) : <p className="text-xs text-gray-500">No se detectaron llaves {'{{...}}'}. Puedes igualmente definir valores a continuación.</p>}
                            </div>
                            <p className="text-xs text-gray-500">Campos comunes disponibles: candidateName, candidateEmail, candidatePhone, candidateDni.</p>
                        </div>
                    )}
                </div>
                <div className="p-6 bg-gray-50 rounded-b-2xl flex justify-end gap-2 border-t">
                    <button onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 rounded-md">Cancelar</button>
                    <button onClick={generateForAll} disabled={!uploadedBuffer || isGenerating} className="px-4 py-2 bg-primary-600 text-white rounded-md disabled:bg-primary-300 flex items-center">
                        <Download className="w-4 h-4 mr-2" /> {isGenerating ? 'Generando...' : 'Generar y guardar'}
                    </button>
                </div>
            </div>
        </div>
    );
};


