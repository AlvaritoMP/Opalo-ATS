import React, { useMemo, useState } from 'react';
import { useAppState } from '../App';
import { Candidate, Process } from '../types';
import { FileText, Download, ClipboardCopy, Upload } from 'lucide-react';
import { saveAs } from 'file-saver';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

type TemplateId = 'offer' | 'congrats';

const TEMPLATES: Record<TemplateId, { name: string; build: (vars: Record<string, string>) => string }> = {
    offer: {
        name: 'Carta de oferta',
        build: ({ candidateName = '', positionTitle = '', salary = '', startDate = '', companyName = 'Nuestra compañía' }) => `
            <html>
            <head><meta charset="UTF-8"></head>
            <body style="font-family: Arial, sans-serif; line-height: 1.5;">
              <p>${new Date().toLocaleDateString('es-ES')}</p>
              <p>Estimado/a ${candidateName},</p>
              <p>Nos complace extenderte una oferta para la posición de <strong>${positionTitle}</strong> en <strong>${companyName}</strong>.</p>
              <p>La compensación propuesta es de <strong>${salary}</strong>, con fecha de inicio estimada el <strong>${startDate}</strong>.</p>
              <p>Por favor, confirma tu aceptación respondiendo a este correo. Estamos disponibles para cualquier duda o aclaración.</p>
              <p>Atentamente,</p>
              <p><strong>${companyName}</strong></p>
            </body>
            </html>
        `,
    },
    congrats: {
        name: 'Carta de felicitación',
        build: ({ candidateName = '', positionTitle = '', companyName = 'Nuestra compañía' }) => `
            <html>
            <head><meta charset="UTF-8"></head>
            <body style="font-family: Arial, sans-serif; line-height: 1.5;">
              <p>${new Date().toLocaleDateString('es-ES')}</p>
              <p>Estimado/a ${candidateName},</p>
              <p>¡Felicitaciones! Has sido seleccionado/a para el cargo de <strong>${positionTitle}</strong> en <strong>${companyName}</strong>.</p>
              <p>Estamos muy contentos de darte la bienvenida y confiamos en que tu incorporación será de gran valor.</p>
              <p>Nos pondremos en contacto para coordinar los próximos pasos.</p>
              <p>Saludos cordiales,</p>
              <p><strong>${companyName}</strong></p>
            </body>
            </html>
        `,
    },
};

export const Letters: React.FC = () => {
    const { state, getLabel, actions } = useAppState();
    const [templateId, setTemplateId] = useState<TemplateId>('offer');
    const [candidateId, setCandidateId] = useState<string>('');
    const [processId, setProcessId] = useState<string>('');
    const [salary, setSalary] = useState<string>('');
    const [startDate, setStartDate] = useState<string>('');
    const companyName = state.settings?.appName || 'ATS Pro';

    // Plantilla DOCX subida por el usuario
    const [uploadedName, setUploadedName] = useState<string>('');
    const [uploadedBuffer, setUploadedBuffer] = useState<ArrayBuffer | null>(null);
    const [detectedKeys, setDetectedKeys] = useState<string[]>([]);
    const [docxData, setDocxData] = useState<Record<string, string>>({});
    const [templateLabel, setTemplateLabel] = useState<string>('');

    const savedTemplates = state.settings?.templates || [];

    // Mapeo dinámico de campos -> fuentes de datos de la app
    type SourceId =
        | 'candidate.name'
        | 'candidate.email'
        | 'candidate.phone'
        | 'candidate.dni'
        | 'candidate.linkedinUrl'
        | 'candidate.address'
        | 'process.title'
        | 'settings.appName'
        | 'custom.salary'
        | 'custom.startDate';
    interface MappingItem { key: string; source: SourceId; }
    const [autoMappings, setAutoMappings] = useState<MappingItem[]>([{ key: 'candidateName', source: 'candidate.name' }]);

    const applyAutoMappings = () => {
        const c = selectedCandidate;
        const p = selectedProcess;
        const out: Record<string, string> = {};
        for (const m of autoMappings) {
            let value = '';
            switch (m.source) {
                case 'candidate.name': value = c?.name || ''; break;
                case 'candidate.email': value = c?.email || ''; break;
                case 'candidate.phone': value = c?.phone || ''; break;
                case 'candidate.dni': value = c?.dni || ''; break;
                case 'candidate.linkedinUrl': value = c?.linkedinUrl || ''; break;
                case 'candidate.address': value = c?.address || ''; break;
                case 'process.title': value = p?.title || ''; break;
                case 'settings.appName': value = companyName; break;
                case 'custom.salary': value = salary || ''; break;
                case 'custom.startDate': value = startDate || ''; break;
            }
            if (m.key.trim()) out[m.key.trim()] = value;
        }
        setDocxData(prev => ({ ...out, ...prev }));
    };

    const addMappingRow = () => setAutoMappings(prev => [...prev, { key: '', source: 'candidate.name' }]);
    const removeMappingRow = (idx: number) => setAutoMappings(prev => prev.filter((_, i) => i !== idx));

    const toBase64 = async (buf: ArrayBuffer): Promise<string> => {
        let binary = '';
        const bytes = new Uint8Array(buf);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    };
    const fromBase64ToArrayBuffer = (b64: string): ArrayBuffer => {
        const binary = atob(b64);
        const len = binary.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    };

    const selectedCandidate = useMemo(() => state.candidates.find(c => c.id === candidateId), [state.candidates, candidateId]);
    const selectedProcess = useMemo(() => state.processes.find(p => p.id === processId), [state.processes, processId]);

    const canGenerate = !!selectedCandidate && (!!selectedProcess || templateId === 'congrats');

    const buildHtml = (): string => {
        const vars: Record<string, string> = {
            candidateName: selectedCandidate?.name || '',
            positionTitle: selectedProcess?.title || '',
            salary: salary || '',
            startDate: startDate || '',
            companyName,
        };
        return TEMPLATES[templateId].build(vars);
    };

    const handleDownload = () => {
        if (uploadedBuffer) {
            try {
                const zip = new PizZip(uploadedBuffer);
                const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
                doc.setData(docxData);
                doc.render();
                const out = doc.getZip().generate({
                    type: 'blob',
                    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                });
                const nameSafe = (selectedCandidate?.name || 'candidato').replace(/[^a-z0-9_-]/gi, '_');
                const base = uploadedName.replace(/\.docx?$/i, '') || 'documento';
                saveAs(out, `${base}_${nameSafe}.docx`);
            } catch (e: any) {
                console.error('Error generando DOCX:', e);
                alert('No se pudo generar el documento. Verifica las variables y la plantilla.');
            }
        } else {
            const html = buildHtml();
            const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
            const nameSafe = (selectedCandidate?.name || 'candidato').replace(/[^a-z0-9_-]/gi, '_');
            const fileBase = templateId === 'offer' ? 'carta_oferta' : 'carta_felicitacion';
            saveAs(blob, `${fileBase}_${nameSafe}.doc`);
        }
    };

    const handleCopy = async () => {
        if (uploadedBuffer) {
            alert('Para plantillas DOCX, usa "Descargar DOCX". El copiado como texto plano es solo para plantillas HTML.');
            return;
        }
        const html = buildHtml();
        const tempElement = document.createElement('div');
        tempElement.innerHTML = html;
        const text = tempElement.innerText;
        await navigator.clipboard.writeText(text);
        alert('Contenido copiado al portapapeles.');
    };

    const handleUploadTemplate = async (file: File) => {
        const reader = new FileReader();
        reader.onload = () => {
            const buf = reader.result as ArrayBuffer;
            setUploadedBuffer(buf);
            setUploadedName(file.name);
            try {
                const zip = new PizZip(buf);
                const xml = zip.file('word/document.xml')?.asText() || '';
                const keys = new Set<string>();
                const re = /\{\{([^}]+)\}\}/g;
                let m: RegExpExecArray | null;
                while ((m = re.exec(xml)) !== null) {
                    keys.add(m[1].trim());
                }
                const arr = Array.from(keys);
                setDetectedKeys(arr);
                // Pre-carga de variables comunes
                const prefill: Record<string, string> = {};
                const c = selectedCandidate;
                const p = selectedProcess;
                if (c) {
                    prefill['candidateName'] = c.name;
                    if (c.email) prefill['candidateEmail'] = c.email;
                }
                if (p) prefill['positionTitle'] = p.title;
                prefill['companyName'] = companyName;
                setDocxData(prev => ({ ...prefill, ...prev }));
            } catch (e) {
                console.error('No se pudo leer la plantilla DOCX:', e);
                alert('No se pudo leer la plantilla. Asegúrate de subir un .docx válido.');
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleSaveTemplate = async () => {
        if (!uploadedBuffer) {
            alert('Primero sube una plantilla .docx.');
            return;
        }
        const name = templateLabel.trim() || uploadedName.replace(/\.docx?$/i, '');
        if (!name) {
            alert('Asigna un nombre a la plantilla.');
            return;
        }
        const docxBase64 = await toBase64(uploadedBuffer);
        const newTpl = { id: `tpl-${Date.now()}`, name, docxBase64 };
        const templates = [...savedTemplates, newTpl];
        await actions.saveSettings({ ...(state.settings as any), templates });
        alert('Plantilla guardada.');
        setTemplateLabel('');
    };

    const handleLoadTemplate = async (tplId: string) => {
        const tpl = savedTemplates.find(t => t.id === tplId);
        if (!tpl) return;
        const buf = fromBase64ToArrayBuffer(tpl.docxBase64);
        setUploadedBuffer(buf);
        setUploadedName(`${tpl.name}.docx`);
        try {
            const zip = new PizZip(buf);
            const xml = zip.file('word/document.xml')?.asText() || '';
            const keys = new Set<string>();
            const re = /\{\{([^}]+)\}\}/g;
            let m: RegExpExecArray | null;
            while ((m = re.exec(xml)) !== null) {
                keys.add(m[1].trim());
            }
            const arr = Array.from(keys);
            setDetectedKeys(arr);
            const prefill: Record<string, string> = {};
            const c = selectedCandidate;
            const p = selectedProcess;
            if (c) {
                prefill['candidateName'] = c.name;
                if (c.email) prefill['candidateEmail'] = c.email;
            }
            if (p) prefill['positionTitle'] = p.title;
            prefill['companyName'] = companyName;
            setDocxData(prev => ({ ...prefill, ...prev }));
        } catch (e) {
            console.error('No se pudo leer la plantilla DOCX:', e);
            alert('No se pudo leer la plantilla guardada.');
        }
    };

    const handleDeleteTemplate = async (tplId: string) => {
        const templates = savedTemplates.filter(t => t.id !== tplId);
        await actions.saveSettings({ ...(state.settings as any), templates });
    };


    return (
        <div className="p-8 h-full overflow-y-auto">
            <h1 className="text-3xl font-bold text-gray-800 mb-6 flex items-center">
                <FileText className="w-7 h-7 mr-3" />
                {getLabel('letters_title', 'Cartas')}
            </h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm lg:col-span-1">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Plantilla</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Subir .docx (opcional)</label>
                            <label className="inline-flex items-center px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 cursor-pointer">
                                <Upload className="w-4 h-4 mr-2" /> Elegir archivo
                                <input type="file" accept=".docx" onChange={e => e.target.files && e.target.files[0] && handleUploadTemplate(e.target.files[0])} className="hidden" />
                            </label>
                            {uploadedName && <p className="text-xs text-gray-500 mt-1">Seleccionado: {uploadedName}</p>}
                        </div>

                        {uploadedBuffer && (
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Guardar como plantilla</label>
                                <div className="flex gap-2">
                                    <input
                                        value={templateLabel}
                                        onChange={e => setTemplateLabel(e.target.value)}
                                        placeholder="Nombre de la plantilla"
                                        className="flex-1 border-gray-300 rounded-md shadow-sm"
                                    />
                                    <button type="button" onClick={handleSaveTemplate} className="px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50">
                                        Guardar
                                    </button>
                                </div>
                            </div>
                        )}

                        {savedTemplates.length > 0 && (
                            <div className="space-y-2">
                                <h3 className="text-sm font-semibold text-gray-800">Plantillas guardadas</h3>
                                <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                                    {savedTemplates.map(t => (
                                        <div key={t.id} className="flex items-center justify-between text-sm">
                                            <button type="button" onClick={() => handleLoadTemplate(t.id)} className="text-primary-600 hover:text-primary-800">{t.name}</button>
                                            <button type="button" onClick={() => handleDeleteTemplate(t.id)} className="text-gray-400 hover:text-red-600">Eliminar</button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de carta</label>
                            <select value={templateId} onChange={e => setTemplateId(e.target.value as TemplateId)} className="w-full border-gray-300 rounded-md shadow-sm">
                                {Object.entries(TEMPLATES).map(([id, t]) => (
                                    <option key={id} value={id}>{t.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Candidato</label>
                            <select value={candidateId} onChange={e => setCandidateId(e.target.value)} className="w-full border-gray-300 rounded-md shadow-sm">
                                <option value="" disabled>Selecciona un candidato</option>
                                {state.candidates.map((c: Candidate) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Proceso/Posición</label>
                            <select value={processId} onChange={e => setProcessId(e.target.value)} className="w-full border-gray-300 rounded-md shadow-sm" disabled={templateId === 'congrats'}>
                                <option value="" disabled>Selecciona un proceso</option>
                                {state.processes.map((p: Process) => <option key={p.id} value={p.id}>{p.title}</option>)}
                            </select>
                            {templateId === 'congrats' && <p className="text-xs text-gray-500 mt-1">No es necesario seleccionar un proceso para esta plantilla.</p>}
                        </div>
                        {!uploadedBuffer && templateId === 'offer' && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Salario ofrecido</label>
                                    <input value={salary} onChange={e => setSalary(e.target.value)} placeholder={`${state.settings?.currencySymbol || '$'}100,000`} className="w-full border-gray-300 rounded-md shadow-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de inicio</label>
                                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full border-gray-300 rounded-md shadow-sm" />
                                </div>
                            </>
                        )}

                        {uploadedBuffer && (
                            <div className="space-y-2">
                                <h3 className="text-sm font-semibold text-gray-800">Campos detectados</h3>
                                {detectedKeys.length === 0 ? (
                                    <p className="text-xs text-gray-500">
                                        No se detectaron llaves {'{{...}}'} en el documento. Puedes aún definir valores manualmente abajo.
                                    </p>
                                ) : null}
                                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                                    {detectedKeys.map(k => (
                                        <div key={k}>
                                            <label className="block text-xs text-gray-600 mb-1">{k}</label>
                                            <input
                                                value={docxData[k] || ''}
                                                onChange={e => setDocxData(prev => ({ ...prev, [k]: e.target.value }))}
                                                className="w-full border-gray-300 rounded-md shadow-sm"
                                            />
                                        </div>
                                    ))}
                                </div>
                                <div className="pt-1">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const c = selectedCandidate;
                                            const p = selectedProcess;
                                            const pre: Record<string, string> = {};
                                            if (c) {
                                                pre['candidateName'] = c.name;
                                                if (c.email) pre['candidateEmail'] = c.email;
                                                if (c.phone) pre['candidatePhone'] = c.phone;
                                            }
                                            if (p) pre['positionTitle'] = p.title;
                                            if (salary) pre['salary'] = salary;
                                            if (startDate) pre['startDate'] = startDate;
                                            pre['companyName'] = companyName;
                                            setDocxData(prev => ({ ...pre, ...prev }));
                                        }}
                                        className="text-xs text-primary-600 hover:text-primary-800"
                                    >
                                        Autocompletar con datos del candidato/proceso
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center gap-2">
                            <button onClick={handleDownload} disabled={!canGenerate} className="px-4 py-2 bg-primary-600 text-white rounded-md shadow-sm disabled:bg-primary-300 flex items-center">
                                <Download className="w-4 h-4 mr-2" /> {uploadedBuffer ? 'Descargar DOCX' : 'Descargar DOC'}
                            </button>
                            <button onClick={handleCopy} disabled={!canGenerate || !!uploadedBuffer} className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm disabled:opacity-50 flex items-center">
                                <ClipboardCopy className="w-4 h-4 mr-2" /> Copiar texto
                            </button>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm lg:col-span-2">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Vista previa</h2>
                    <div className="border rounded-lg p-4 min-h-[300px] prose max-w-none">
                        <div dangerouslySetInnerHTML={{ __html: !uploadedBuffer ? (canGenerate ? buildHtml() : '<p class="text-gray-500">Selecciona candidato y completa los campos para ver la vista previa.</p>') : '<p class="text-gray-500">La vista previa no está disponible para DOCX. Genera el archivo para revisarlo en Word.</p>' }} />
                    </div>

                    {/* Sección de mapeo dinámico de campos */}
                    <div className="mt-6">
                        <h3 className="text-md font-semibold text-gray-800 mb-2">Campos automáticos</h3>
                        <p className="text-sm text-gray-600 mb-3">
                            Define cuántos campos quieras y mapea cada campo del documento (por ejemplo, {'{{miCampo}}'}) a una fuente de datos de la app.
                        </p>
                        <div className="space-y-2">
                            {autoMappings.map((m, idx) => (
                                <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
                                    <input
                                        placeholder="Nombre de campo en plantilla (ej: candidateName)"
                                        value={m.key}
                                        onChange={e => setAutoMappings(prev => prev.map((it, i) => i === idx ? { ...it, key: e.target.value } : it))}
                                        className="border-gray-300 rounded-md shadow-sm"
                                    />
                                    <select
                                        value={m.source}
                                        onChange={e => setAutoMappings(prev => prev.map((it, i) => i === idx ? { ...it, source: e.target.value as any } : it))}
                                        className="border-gray-300 rounded-md shadow-sm"
                                    >
                                        <option value="candidate.name">Candidato: Nombre</option>
                                        <option value="candidate.email">Candidato: Email</option>
                                        <option value="candidate.phone">Candidato: Teléfono</option>
                                        <option value="candidate.dni">Candidato: DNI</option>
                                        <option value="candidate.linkedinUrl">Candidato: LinkedIn</option>
                                        <option value="candidate.address">Candidato: Dirección</option>
                                        <option value="process.title">Proceso: Título</option>
                                        <option value="settings.appName">App: Nombre</option>
                                        <option value="custom.salary">Personalizado: Salario (input)</option>
                                        <option value="custom.startDate">Personalizado: Fecha inicio (input)</option>
                                    </select>
                                    <div className="flex gap-2">
                                        <button type="button" onClick={() => removeMappingRow(idx)} className="px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50">
                                            Quitar
                                        </button>
                                        {idx === autoMappings.length - 1 && (
                                            <button type="button" onClick={addMappingRow} className="px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50">
                                                Añadir campo
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-3">
                            <button type="button" onClick={applyAutoMappings} className="px-4 py-2 bg-primary-600 text-white rounded-md shadow-sm">
                                Aplicar a datos de plantilla
                            </button>
                            <p className="text-xs text-gray-500 mt-1">
                                Esto completa los valores en los campos detectados y listos para generar el DOCX.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};


