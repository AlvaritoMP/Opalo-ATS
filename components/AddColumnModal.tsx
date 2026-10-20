import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { CustomColumn, PsycholaboralReportNamePart, DashboardSemanticField, DASHBOARD_SEMANTIC_FIELD_OPTIONS } from '../types';
import { identityColumnIdFromLabel } from '../lib/candidateIdentity';
import { ASSESSMENT_STATUS_COLUMNS, assessmentTrackingLabel } from '../lib/assessments/columns';
import type { AssessmentTestId } from '../lib/assessments/types';
import {
    COLUMN_TYPE_HELP,
    PANEL_CLASSIFICATION_DETAIL,
    PANEL_CLASSIFICATION_INTRO,
    REPORT_NAME_DETAIL,
    REPORT_NAME_INTRO,
    columnNameClashWarning,
} from '../lib/columnMenuGuide';

interface AddColumnModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (column: CustomColumn) => void;
    editingColumn?: CustomColumn | null;
    onEdit?: (column: CustomColumn) => void;
    /** Columnas existentes del proceso (para vincular costo de ruta). */
    existingColumns?: CustomColumn[];
}

type ColumnType = CustomColumn['type'];

function GuideList({ items }: { items: string[] }) {
    return (
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-gray-700">
            {items.map(item => (
                <li key={item}>{item}</li>
            ))}
        </ul>
    );
}

export const AddColumnModal: React.FC<AddColumnModalProps> = ({
    isOpen,
    onClose,
    onAdd,
    editingColumn,
    onEdit,
    existingColumns = [],
}) => {
    const [name, setName] = useState('');
    const [type, setType] = useState<ColumnType>('text');
    const [options, setOptions] = useState<string[]>(['']);
    const [routeDestination, setRouteDestination] = useState('');
    const [sourceRouteColumnId, setSourceRouteColumnId] = useState('');
    const [reportNamePart, setReportNamePart] = useState<'' | PsycholaboralReportNamePart>('');
    const [dashboardSemanticField, setDashboardSemanticField] = useState<'' | DashboardSemanticField>('');
    const [tracksAssessment, setTracksAssessment] = useState<'' | AssessmentTestId>('');

    const routeColumns = useMemo(
        () => existingColumns.filter(c => c.type === 'route'),
        [existingColumns]
    );

    const isEditing = !!editingColumn;
    const nameWarning = columnNameClashWarning(name);
    const typeHelp = COLUMN_TYPE_HELP[type];
    const panelDetail = PANEL_CLASSIFICATION_DETAIL[dashboardSemanticField];
    const reportDetail = REPORT_NAME_DETAIL[reportNamePart];
    const showMeaningFields = type !== 'route' && type !== 'route_cost';

    useEffect(() => {
        if (isOpen && editingColumn) {
            setName(editingColumn.name);
            setType(editingColumn.type);
            const opts = editingColumn.options?.filter(o => o != null && String(o).trim() !== '') ?? [];
            setOptions(
                editingColumn.type === 'select'
                    ? opts.length > 0
                        ? [...opts]
                        : ['']
                    : opts.length > 0
                        ? [...opts]
                        : ['']
            );
            setRouteDestination(editingColumn.routeDestination || '');
            setSourceRouteColumnId(editingColumn.sourceRouteColumnId || '');
            setReportNamePart(editingColumn.reportNamePart ?? '');
            setDashboardSemanticField(editingColumn.dashboardSemanticField ?? '');
            setTracksAssessment(editingColumn.tracksAssessment ?? '');
        } else if (isOpen) {
            setName('');
            setType('text');
            setOptions(['']);
            setRouteDestination('');
            setSourceRouteColumnId('');
            setReportNamePart('');
            setDashboardSemanticField('');
            setTracksAssessment('');
        }
    }, [isOpen, editingColumn]);

    if (!isOpen) return null;

    const handleAddOption = () => {
        setOptions(prev => [...prev, '']);
    };

    const handleRemoveOption = (index: number) => {
        setOptions(options.filter((_, i) => i !== index));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            alert('Por favor, ingrese un nombre para la columna');
            return;
        }

        if (type === 'select') {
            const validOptions = options.map(o => o.trim()).filter(Boolean);
            if (validOptions.length === 0) {
                alert('Agregue al menos una opción para la lista desplegable');
                return;
            }
        }

        if (identityColumnIdFromLabel(name.trim())) {
            alert('Nombres, Apellido Paterno, Apellido Materno y DNI ya son columnas de sistema en todos los procesos. No hace falta crearlas como personalizadas.');
            return;
        }

        if (type === 'route' && !routeDestination.trim()) {
            alert('Ingrese la dirección de destino para la ruta en transporte público');
            return;
        }

        if (type === 'route_cost') {
            if (routeColumns.length === 0) {
                alert('Primero cree al menos una columna de tipo Ruta (transporte público)');
                return;
            }
            if (!sourceRouteColumnId) {
                alert('Seleccione la columna de ruta de referencia');
                return;
            }
        }

        if (type === 'checkbox' && tracksAssessment) {
            const duplicate = existingColumns.find(
                (col) => col.tracksAssessment === tracksAssessment && col.id !== editingColumn?.id
            );
            if (duplicate) {
                alert(`Este proceso ya tiene la columna «${duplicate.name}» para esa prueba.`);
                return;
            }
        }

        const column: CustomColumn = {
            id: editingColumn?.id || `col_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: name.trim(),
            type,
            ...(type === 'select' && { options: options.map(o => o.trim()).filter(Boolean) }),
            ...(type === 'route' && { routeDestination: routeDestination.trim() }),
            ...(type === 'route_cost' && {
                sourceRouteColumnId,
                routeCostOnDemand: true,
            }),
            ...(reportNamePart && type !== 'route' && type !== 'route_cost' ? { reportNamePart } : {}),
            ...(dashboardSemanticField && type !== 'route' && type !== 'route_cost'
                ? { dashboardSemanticField }
                : {}),
            ...(type === 'checkbox' && tracksAssessment ? { tracksAssessment } : {}),
        };

        if (isEditing && onEdit) {
            onEdit(column);
        } else {
            onAdd(column);
        }

        setName('');
        setType('text');
        setOptions(['']);
        setRouteDestination('');
        setSourceRouteColumnId('');
        setReportNamePart('');
        setDashboardSemanticField('');
        setTracksAssessment('');
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[92vh] flex flex-col">
                <div className="flex items-start justify-between gap-4 p-6 border-b shrink-0">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">
                            {isEditing ? 'Editar columna propia' : 'Agregar columna propia'}
                        </h2>
                        <p className="text-sm text-gray-600 mt-1">
                            Una columna propia es un dato extra de este proceso. Aparece en la tabla, se guarda en cada candidato
                            y puede recibir valores de Excel o de Tally. No reemplaza las columnas fijas
                            (Nombres, DNI, Teléfono, Fuente, Etapa y las demás).
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        aria-label="Cerrar"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-5">
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 space-y-2">
                        <p>
                            Para ver la columna en la tabla use después <strong>Mostrar columnas</strong>.
                            Para cambiarla más adelante use <strong>Editar columnas propias</strong>.
                            Esta ventana solo define el dato.
                        </p>
                        <p>
                            Los dos bloques del final — Clasificación para el Panel e Informe psicolaboral — son opcionales.
                            Puede dejarlos en Automático. La columna se crea igual. Esos bloques no agregan columnas nuevas:
                            le dicen a los gráficos y al PDF del informe cómo interpretar los valores de esta.
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nombre de la columna <span className="text-red-500">*</span>
                        </label>
                        <p className="text-xs text-gray-500 mb-2">
                            Es el título de la cabecera. El Panel, en modo Automático, también lo usa para adivinar si la columna es fuente, distrito, edad o una cita.
                            Un título claro evita tener que clasificarla a mano.
                        </p>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={
                                type === 'route'
                                    ? 'Ej: Ruta a sede Miraflores'
                                    : type === 'route_cost'
                                        ? 'Ej: Costo ruta sede Miraflores'
                                        : 'Ej: Disponibilidad, Salario esperado, Turno'
                            }
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                        {nameWarning && (
                            <p className="text-sm text-amber-950 bg-amber-50 border border-amber-200 rounded-lg p-3 mt-2">
                                {nameWarning}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Tipo de columna <span className="text-red-500">*</span>
                        </label>
                        <p className="text-xs text-gray-500 mb-2">
                            El tipo define cómo se edita la celda. Elegirlo no crea columnas adicionales.
                        </p>
                        <select
                            value={type}
                            onChange={(e) => {
                                const newType = e.target.value as ColumnType;
                                setType(newType);
                                if (newType === 'select' && options.length === 0) {
                                    setOptions(['']);
                                }
                                if (newType === 'route_cost' && routeColumns.length === 1) {
                                    setSourceRouteColumnId(routeColumns[0].id);
                                }
                            }}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        >
                            <option value="text">Texto</option>
                            <option value="number">Número</option>
                            <option value="checkbox">Casilla (sí/no)</option>
                            <option value="date">Fecha</option>
                            <option value="select">Lista desplegable</option>
                            <option value="route">Ruta (transporte público)</option>
                            <option value="route_cost">Costo aproximado de ruta</option>
                        </select>
                        <div className="mt-2 rounded-lg border border-gray-200 bg-white p-3">
                            <p className="text-sm font-medium text-gray-900">{typeHelp.title}</p>
                            <p className="text-sm text-gray-700 mt-1">{typeHelp.body}</p>
                        </div>
                    </div>

                    {type === 'checkbox' && (
                        <div className="rounded-lg border border-gray-200 p-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                ¿Esta casilla se marca sola al terminar una prueba?
                            </label>
                            <p className="text-sm text-gray-600 mb-2">
                                Déjelo en «No» si la casilla la marca una persona (entregó documentos, aceptó turno, etc.).
                                Elija una prueba solo cuando quiera un visto bueno automático al envío.
                            </p>
                            <p className="text-sm text-gray-600 mb-2">
                                Esa prueba ya tiene, en Mostrar columnas, una columna de estado: Pendiente, En curso o Realizada, con puntaje.
                                La casilla no sustituye esa columna. Son dos lecturas del mismo evento: el avance y un sí/no.
                                El nombre sugerido lleva «completada» para que no se confundan en la lista.
                            </p>
                            <select
                                value={tracksAssessment}
                                onChange={(e) => {
                                    const next = (e.target.value || '') as '' | AssessmentTestId;
                                    setTracksAssessment(next);
                                    if (!next) return;
                                    const suggested = assessmentTrackingLabel(next);
                                    const previousDefaults = ASSESSMENT_STATUS_COLUMNS.map((col) => assessmentTrackingLabel(col.testId));
                                    if (!name.trim() || previousDefaults.includes(name.trim())) setName(suggested);
                                }}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            >
                                <option value="">No. Es un sí/no manual</option>
                                {ASSESSMENT_STATUS_COLUMNS.map((col) => (
                                    <option key={col.testId} value={col.testId}>{col.label}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {type === 'route' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Punto de destino <span className="text-red-500">*</span>
                            </label>
                            <p className="text-sm text-gray-600 mb-2">
                                Dirección del lugar de entrevista o de la sede. Cada fila mostrará un enlace con la ruta en bus o metro
                                desde la ubicación del candidato hasta este punto. El destino es el mismo para todas las filas;
                                lo que cambia es el origen de cada candidato.
                            </p>
                            <input
                                type="text"
                                value={routeDestination}
                                onChange={(e) => setRouteDestination(e.target.value)}
                                placeholder="Ej: Av. Javier Prado 4200, San Isidro, Lima"
                                required
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />
                        </div>
                    )}

                    {type === 'route_cost' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Columna de ruta de referencia <span className="text-red-500">*</span>
                            </label>
                            <p className="text-sm text-gray-600 mb-2">
                                Elija qué ruta se va a cotizar. El costo no se calcula al guardar esta columna.
                                En la tabla, cada fila se consulta cuando alguien pulsa Calcular o usa la acción de costos pendientes.
                                El monto queda guardado y no se vuelve a pedir hasta que alguien recalcule.
                            </p>
                            {routeColumns.length === 0 ? (
                                <p className="text-sm text-amber-950 bg-amber-50 border border-amber-200 rounded-lg p-3">
                                    Este proceso todavía no tiene una columna Ruta. Cierre esta ventana, cree primero una columna de tipo Ruta (transporte público) y después vuelva a crear el costo.
                                </p>
                            ) : (
                                <select
                                    value={sourceRouteColumnId}
                                    onChange={(e) => setSourceRouteColumnId(e.target.value)}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                >
                                    <option value="">Seleccionar columna de ruta...</option>
                                    {routeColumns.map(col => (
                                        <option key={col.id} value={col.id}>
                                            {col.name}
                                            {col.routeDestination ? ` → ${col.routeDestination}` : ''}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                    )}

                    {type === 'select' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Opciones de la lista
                            </label>
                            <p className="text-sm text-gray-600 mb-2">
                                Escriba cada valor que se podrá elegir. Hace falta al menos una opción.
                                {isEditing
                                    ? ' Al guardar, la lista queda actualizada en toda la tabla. Las filas que ya tenían un valor lo conservan aunque quite esa opción de la lista.'
                                    : ' Podrá agregar más opciones después, desde Editar columnas propias.'}
                            </p>
                            <div className="space-y-2">
                                {options.map((option, index) => (
                                    <div key={index} className="flex gap-2 items-center">
                                        <input
                                            type="text"
                                            value={option}
                                            onChange={(e) => {
                                                const newOptions = [...options];
                                                newOptions[index] = e.target.value;
                                                setOptions(newOptions);
                                            }}
                                            placeholder={`Opción ${index + 1}`}
                                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                        />
                                        {options.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveOption(index)}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                title="Quitar esta opción"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={handleAddOption}
                                    className="flex items-center gap-2 px-3 py-2 text-sm text-primary-600 hover:bg-primary-50 rounded transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
                                    Agregar opción
                                </button>
                            </div>
                        </div>
                    )}

                    {showMeaningFields ? (
                        <>
                            <div className="rounded-lg border border-indigo-200 p-4 space-y-3">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Opcional</p>
                                    <label className="block text-sm font-medium text-gray-900 mt-1">
                                        Clasificación para el Panel
                                    </label>
                                </div>
                                <GuideList items={PANEL_CLASSIFICATION_INTRO} />
                                <select
                                    value={dashboardSemanticField}
                                    onChange={(e) =>
                                        setDashboardSemanticField((e.target.value || '') as '' | DashboardSemanticField)
                                    }
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                >
                                    <option value="">Automático (detectar por el nombre)</option>
                                    {DASHBOARD_SEMANTIC_FIELD_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                                <div className="rounded-md bg-indigo-50 border border-indigo-100 p-3">
                                    <p className="text-sm font-medium text-indigo-950">{panelDetail.title}</p>
                                    <p className="text-sm text-indigo-950 mt-1">{panelDetail.body}</p>
                                </div>
                            </div>

                            <div className="rounded-lg border border-violet-200 p-4 space-y-3">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">Opcional</p>
                                    <label className="block text-sm font-medium text-gray-900 mt-1">
                                        Informe psicolaboral (nombre en el PDF)
                                    </label>
                                </div>
                                <GuideList items={REPORT_NAME_INTRO} />
                                <select
                                    value={reportNamePart}
                                    onChange={(e) =>
                                        setReportNamePart((e.target.value || '') as '' | PsycholaboralReportNamePart)
                                    }
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                >
                                    <option value="">Automático (por el nombre de la columna)</option>
                                    <option value="given_names">Nombres</option>
                                    <option value="paternal_surname">Apellido paterno</option>
                                    <option value="maternal_surname">Apellido materno</option>
                                    <option value="surnames_combined">Apellidos (un solo campo)</option>
                                </select>
                                <div className="rounded-md bg-violet-50 border border-violet-100 p-3">
                                    <p className="text-sm font-medium text-violet-950">{reportDetail.title}</p>
                                    <p className="text-sm text-violet-950 mt-1">{reportDetail.body}</p>
                                </div>
                            </div>
                        </>
                    ) : (
                        <p className="text-sm text-gray-600 rounded-lg border border-gray-200 bg-gray-50 p-3">
                            Las columnas de ruta y de costo no se clasifican para el Panel ni entran al nombre del informe psicolaboral.
                            Solo calculan el transporte hasta el destino.
                        </p>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                        >
                            {isEditing ? 'Guardar cambios' : 'Agregar columna'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
