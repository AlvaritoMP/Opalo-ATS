import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useAppState } from '../App';
import type { Attachment, Candidate, Process } from '../types';
import { FileText, Loader2, Upload, X } from 'lucide-react';
import {
    buildCandidateFromCvDraft,
    buildCvAttachment,
    CV_WARNING_LABELS,
    cvRowWarnings,
    findCvDocumentCategory,
    isPdfFile,
    parseCvFileForImport,
    resolveCvCandidateSource,
    SCAN_PDF_MESSAGE,
    type CvExtractedFields,
    type CvImportMode,
    type CvRowWarning,
} from '../lib/cvImport';

interface CvImportModalProps {
    process: Process;
    mode: CvImportMode;
    onClose: () => void;
    onImportComplete?: () => void;
    onCreatedCandidates?: (candidates: Candidate[]) => void;
    bulkRowOffset?: number;
}

type RowStatus = 'pending' | 'reading' | 'ready' | 'error';

interface CvImportRow {
    id: string;
    file: File;
    fileName: string;
    included: boolean;
    status: RowStatus;
    error?: string;
    warnLarge?: boolean;
    fields: CvExtractedFields;
    attachment?: Attachment;
}

const FIELD_KEYS: { key: keyof CvExtractedFields; label: string; wide?: boolean }[] = [
    { key: 'name', label: 'Nombre' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Teléfono' },
    { key: 'phone2', label: 'Tel. 2' },
    { key: 'dni', label: 'DNI' },
    { key: 'linkedinUrl', label: 'LinkedIn', wide: true },
    { key: 'address', label: 'Dirección', wide: true },
    { key: 'province', label: 'Provincia' },
    { key: 'district', label: 'Distrito' },
    { key: 'age', label: 'Edad' },
    { key: 'salaryExpectation', label: 'Sueldo' },
    { key: 'description', label: 'Resumen', wide: true },
];

function emptyFields(): CvExtractedFields {
    return {};
}

export const CvImportModal: React.FC<CvImportModalProps> = ({
    process,
    mode,
    onClose,
    onImportComplete,
    onCreatedCandidates,
    bulkRowOffset = 0,
}) => {
    const { state, actions } = useAppState();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [rows, setRows] = useState<CvImportRow[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [importErrors, setImportErrors] = useState<string[]>([]);

    const source = useMemo(
        () => resolveCvCandidateSource(state.settings?.candidateSources),
        [state.settings?.candidateSources]
    );
    const cvCategory = useMemo(
        () => findCvDocumentCategory(process.documentCategories),
        [process.documentCategories]
    );
    const locationOptions = useMemo(
        () => ({
            provinces: state.settings?.provinces,
            districts: state.settings?.districts,
        }),
        [state.settings?.provinces, state.settings?.districts]
    );

    const updateRow = useCallback((id: string, patch: Partial<CvImportRow>) => {
        setRows(prev => prev.map(r => (r.id === id ? { ...r, ...patch } : r)));
    }, []);

    const processFiles = useCallback(
        async (fileList: File[]) => {
            const pdfs = fileList.filter(isPdfFile);
            const rejected = fileList.length - pdfs.length;
            if (rejected > 0) {
                actions.showToast(
                    rejected === 1
                        ? 'Se rechazó un archivo que no es PDF.'
                        : `Se rechazaron ${rejected} archivos que no son PDF.`,
                    'error',
                    4000
                );
            }
            if (pdfs.length === 0) return;

            const newRows: CvImportRow[] = pdfs.map(file => ({
                id: crypto.randomUUID(),
                file,
                fileName: file.name,
                included: true,
                status: 'pending',
                fields: emptyFields(),
            }));
            setRows(prev => [...prev, ...newRows]);

            for (const row of newRows) {
                updateRow(row.id, { status: 'reading' });
                const parsed = await parseCvFileForImport(row.file, locationOptions);
                const scanned = parsed.error === SCAN_PDF_MESSAGE;
                const fatal = parsed.error && !scanned;
                if (fatal) {
                    updateRow(row.id, {
                        status: 'error',
                        error: parsed.error,
                        fields: parsed.fields,
                        warnLarge: parsed.warnLarge || parsed.oversized,
                        included: false,
                    });
                    continue;
                }
                try {
                    const attachment = await buildCvAttachment(row.file, cvCategory?.id);
                    updateRow(row.id, {
                        status: 'ready',
                        error: scanned ? parsed.error : undefined,
                        fields: parsed.fields,
                        warnLarge: parsed.warnLarge,
                        attachment,
                        included: !scanned,
                    });
                } catch {
                    updateRow(row.id, {
                        status: 'error',
                        error: 'No se pudo adjuntar el PDF.',
                        fields: parsed.fields,
                        included: false,
                    });
                }
            }
        },
        [actions, cvCategory?.id, locationOptions, updateRow]
    );

    const handleFiles = (list: FileList | File[] | null) => {
        if (!list) return;
        void processFiles(Array.from(list));
    };

    const patchField = (id: string, key: keyof CvExtractedFields, value: string) => {
        setRows(prev =>
            prev.map(r => {
                if (r.id !== id) return r;
                const fields = { ...r.fields };
                if (key === 'age') {
                    const n = value.trim() === '' ? undefined : parseInt(value, 10);
                    fields.age = n !== undefined && !Number.isNaN(n) ? n : undefined;
                } else {
                    (fields as Record<string, unknown>)[key] = value;
                }
                return { ...r, fields };
            })
        );
    };

    const selectedRows = rows.filter(r => r.included && r.status === 'ready');
    const readingCount = rows.filter(r => r.status === 'pending' || r.status === 'reading').length;

    const handleImport = async () => {
        if (selectedRows.length === 0) {
            actions.showToast('Incluye al menos un CV listo para importar.', 'error', 3000);
            return;
        }
        setIsImporting(true);
        setImportErrors([]);
        const created: Candidate[] = [];
        const errors: string[] = [];
        const importedIds: string[] = [];

        for (let i = 0; i < selectedRows.length; i++) {
            const row = selectedRows[i];
            const built = buildCandidateFromCvDraft({
                process,
                fields: row.fields,
                attachment: row.attachment,
                source,
                mode,
                rowNumber: bulkRowOffset + created.length + 1,
            });
            if (!built.candidate) {
                errors.push(`${row.fileName}: ${built.error || 'No se pudo crear'}`);
                continue;
            }
            try {
                const candidate = await actions.addCandidate(built.candidate, {
                    skipGoogleDrive: mode === 'bulk',
                    silent: true,
                });
                created.push(candidate);
                importedIds.push(row.id);
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Error al crear candidato';
                errors.push(`${row.fileName}: ${message}`);
            }
        }

        setIsImporting(false);
        setImportErrors(errors);

        if (importedIds.length > 0) {
            setRows(prev => prev.filter(r => !importedIds.includes(r.id)));
        }

        if (created.length > 0) {
            onCreatedCandidates?.(created);
            actions.showToast(
                created.length === 1
                    ? 'Candidato importado desde CV'
                    : `${created.length} candidatos importados desde CV`,
                'success',
                4000
            );
            if (errors.length === 0) {
                onImportComplete?.();
                onClose();
            }
        } else if (errors.length > 0) {
            actions.showToast('No se pudo importar ningún candidato. Revisa los avisos.', 'error', 4000);
        }
    };

    const warningBadges = (row: CvImportRow): CvRowWarning[] =>
        cvRowWarnings({
            fields: row.fields,
            error: row.error,
            mode,
            warnLarge: row.warnLarge,
        });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col">
                <div className="px-6 py-4 border-b flex items-center justify-between gap-3 shrink-0">
                    <div className="min-w-0">
                        <h2 className="text-xl font-semibold text-gray-900 truncate">
                            Importar CVs — {process.title}
                        </h2>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Extrae datos del PDF con reglas (email, celular, DNI, LinkedIn en cualquier parte del documento).
                            Puedes corregir la tabla antes de crear los candidatos.
                        </p>
                    </div>
                    <button type="button" onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg" disabled={isImporting}>
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
                    <div
                        className={`flex justify-center px-6 py-8 border-2 border-dashed rounded-lg transition-colors ${
                            isDragging ? 'border-primary-500 bg-primary-50' : 'border-gray-300 bg-gray-50'
                        }`}
                        onDragOver={e => {
                            e.preventDefault();
                            setIsDragging(true);
                        }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={e => {
                            e.preventDefault();
                            setIsDragging(false);
                            handleFiles(e.dataTransfer.files);
                        }}
                    >
                        <div className="text-center">
                            <Upload className="mx-auto h-10 w-10 text-gray-400" />
                            <div className="mt-2 flex text-sm text-gray-600 justify-center">
                                <button
                                    type="button"
                                    className="font-medium text-primary-600 hover:text-primary-500"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    Sube uno o varios PDF
                                </button>
                                <p className="pl-1">o arrástralos aquí</p>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Solo PDF. Máximo 10 MB por archivo. No se lee OCR ni .docx.</p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="application/pdf,.pdf"
                                multiple
                                className="hidden"
                                onChange={e => {
                                    handleFiles(e.target.files);
                                    e.target.value = '';
                                }}
                            />
                        </div>
                    </div>

                    {rows.length > 0 && (
                        <div className="border rounded-lg overflow-auto max-h-[48vh]">
                            <table className="min-w-full text-xs">
                                <thead className="bg-gray-50 sticky top-0 z-10">
                                    <tr className="text-left text-gray-600">
                                        <th className="px-2 py-2 font-medium whitespace-nowrap">Incluir</th>
                                        <th className="px-2 py-2 font-medium whitespace-nowrap">Archivo</th>
                                        {FIELD_KEYS.map(col => (
                                            <th key={col.key} className="px-2 py-2 font-medium whitespace-nowrap">
                                                {col.label}
                                            </th>
                                        ))}
                                        <th className="px-2 py-2 font-medium whitespace-nowrap">Avisos</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map(row => {
                                        const badges = warningBadges(row);
                                        return (
                                            <tr key={row.id} className="border-t align-top">
                                                <td className="px-2 py-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={row.included && row.status === 'ready'}
                                                        disabled={row.status !== 'ready' || isImporting}
                                                        onChange={e => updateRow(row.id, { included: e.target.checked })}
                                                    />
                                                </td>
                                                <td className="px-2 py-2 max-w-[140px]">
                                                    <div className="flex items-start gap-1">
                                                        {row.status === 'reading' || row.status === 'pending' ? (
                                                            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary-600 shrink-0 mt-0.5" />
                                                        ) : (
                                                            <FileText className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                                                        )}
                                                        <span className="truncate" title={row.fileName}>
                                                            {row.fileName}
                                                        </span>
                                                    </div>
                                                    {row.error && (
                                                        <p className="text-red-600 mt-1 leading-snug">{row.error}</p>
                                                    )}
                                                </td>
                                                {FIELD_KEYS.map(col => (
                                                    <td key={col.key} className="px-1 py-1">
                                                        <input
                                                            type={col.key === 'age' ? 'number' : 'text'}
                                                            value={
                                                                col.key === 'age'
                                                                    ? row.fields.age ?? ''
                                                                    : String(row.fields[col.key] ?? '')
                                                            }
                                                            disabled={row.status !== 'ready' || isImporting}
                                                            onChange={e => patchField(row.id, col.key, e.target.value)}
                                                            className={`border border-gray-300 rounded px-1.5 py-1 w-full min-w-[7rem] ${
                                                                col.wide ? 'min-w-[12rem]' : ''
                                                            }`}
                                                        />
                                                    </td>
                                                ))}
                                                <td className="px-2 py-2 whitespace-nowrap">
                                                    <div className="flex flex-col gap-1">
                                                        {badges.map(w => (
                                                            <span
                                                                key={w}
                                                                className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                                                    w === 'scannedPdf'
                                                                        ? 'bg-red-100 text-red-800'
                                                                        : 'bg-amber-100 text-amber-800'
                                                                }`}
                                                            >
                                                                {CV_WARNING_LABELS[w]}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {mode === 'standard' && (
                        <p className="text-xs text-gray-500">
                            En este proceso se requiere nombre y email para crear. Completa las celdas vacías antes de confirmar.
                        </p>
                    )}
                    {mode === 'bulk' && (
                        <p className="text-xs text-gray-500">
                            Si falta el email se usará un placeholder (igual que «Añadir fila»). No se inventan correos reales.
                        </p>
                    )}

                    {importErrors.length > 0 && (
                        <div className="p-3 rounded-md bg-yellow-50 border border-yellow-200 text-yellow-900 text-xs">
                            <p className="font-medium mb-1">No se importaron algunas filas</p>
                            <ul className="list-disc ml-4 space-y-0.5">
                                {importErrors.map((err, i) => (
                                    <li key={i}>{err}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 bg-gray-50 rounded-b-xl flex justify-between items-center gap-3 shrink-0">
                    <p className="text-xs text-gray-500">
                        {readingCount > 0
                            ? `Leyendo ${readingCount} archivo(s)…`
                            : `${selectedRows.length} de ${rows.length} listos para importar`}
                    </p>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isImporting}
                            className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-white"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={() => void handleImport()}
                            disabled={isImporting || selectedRows.length === 0 || readingCount > 0}
                            className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-primary-300 disabled:cursor-not-allowed"
                        >
                            {isImporting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin inline mr-1" />
                                    Importando…
                                </>
                            ) : (
                                'Confirmar e importar'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
