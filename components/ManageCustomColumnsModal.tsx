import React, { useState } from 'react';
import { X, Plus, Edit, Trash2, List } from 'lucide-react';
import { CustomColumn, DASHBOARD_SEMANTIC_FIELD_OPTIONS } from '../types';
import { repeatedCustomColumnNote } from '../lib/columnMenuGuide';

const TYPE_LABELS: Record<CustomColumn['type'], string> = {
    text: 'Texto',
    number: 'Número',
    checkbox: 'Sí/No',
    date: 'Fecha',
    select: 'Lista desplegable',
    route: 'Ruta',
    route_cost: 'Costo de ruta',
};

const REPORT_LABELS: Record<string, string> = {
    given_names: 'Nombres en el PDF',
    paternal_surname: 'Apellido paterno en el PDF',
    maternal_surname: 'Apellido materno en el PDF',
    surnames_combined: 'Apellidos juntos en el PDF',
};

interface ManageCustomColumnsModalProps {
    isOpen: boolean;
    onClose: () => void;
    columns: CustomColumn[];
    onEdit: (column: CustomColumn) => void;
    onDelete: (columnId: string) => void;
    onAdd: () => void;
}

export const ManageCustomColumnsModal: React.FC<ManageCustomColumnsModalProps> = ({
    isOpen,
    onClose,
    columns,
    onEdit,
    onDelete,
    onAdd,
}) => {
    const [helpOpen, setHelpOpen] = useState(false);
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
                <div className="flex items-start justify-between gap-4 p-6 border-b shrink-0">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                            <List className="w-5 h-5 text-primary-600" />
                            Editar columnas propias
                        </h2>
                        <p className="text-sm text-gray-600 mt-1">
                            Cambia el nombre, el tipo y las opciones de las columnas creadas en este proceso.
                            Esta ventana no muestra ni oculta columnas en la tabla.
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

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-950 space-y-2">
                        <p>
                            <strong>Editar columnas propias</strong> trabaja la definición del dato: cómo se llama, si es texto o lista,
                            qué opciones tiene, y cómo lo leen el Panel y el informe psicolaboral.
                        </p>
                        <p>
                            <strong>Mostrar columnas</strong> es la otra ventana. Ahí se enciende o apaga cada columna de la tabla,
                            incluidas las fijas (Email, Teléfono, Llamadas, pruebas). También explica por qué algunos nombres se parecen.
                        </p>
                        <button
                            type="button"
                            onClick={() => setHelpOpen(open => !open)}
                            className="text-sm font-medium text-indigo-800 underline"
                        >
                            {helpOpen ? 'Ocultar detalle' : 'Ver qué se puede cambiar aquí'}
                        </button>
                        {helpOpen && (
                            <ul className="list-disc pl-5 space-y-1">
                                <li>Nombre: el título que se ve en la cabecera. Cambiarlo no borra los valores ya guardados.</li>
                                <li>Tipo: texto, número, casilla, fecha, lista, ruta o costo de ruta. Cambiar el tipo no convierte solo los valores viejos; revíselos después.</li>
                                <li>Opciones de una lista: agregar una categoría nueva vale para todas las filas. Quitar una opción no borra el texto que ya estaba elegido en alguna fila.</li>
                                <li>Clasificación para el Panel: dice a los gráficos si esta columna es fuente, distrito, edad, asistencia o fecha de cita. No crea otra columna.</li>
                                <li>Informe psicolaboral: dice al PDF si el texto es una parte del nombre. Marcar Nombres o un apellido oculta la columna en la tabla porque ya existe la columna fija.</li>
                                <li>Eliminar quita la columna de la tabla. Los valores de esa columna dejan de mostrarse.</li>
                            </ul>
                        )}
                    </div>

                    {columns.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-8">
                            Este proceso todavía no tiene columnas propias. Use Nueva columna para crear la primera.
                            Las columnas fijas (Nombres, DNI, Teléfono, Etapa y el resto) no aparecen aquí porque no se editan como propias.
                        </p>
                    ) : (
                        columns.map(col => {
                            const repeated = repeatedCustomColumnNote(col);
                            return (
                                <div
                                    key={col.id}
                                    className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-gray-900">{col.name}</div>
                                        <div className="text-xs text-gray-500 mt-0.5">
                                            {TYPE_LABELS[col.type]}
                                            {col.dashboardSemanticField && (
                                                <span className="text-indigo-700">
                                                    {' · Panel: '}
                                                    {DASHBOARD_SEMANTIC_FIELD_OPTIONS.find(o => o.value === col.dashboardSemanticField)?.label
                                                        || col.dashboardSemanticField}
                                                </span>
                                            )}
                                            {col.reportNamePart && (
                                                <span className="text-violet-700">
                                                    {' · '}
                                                    {REPORT_LABELS[col.reportNamePart] || col.reportNamePart}
                                                </span>
                                            )}
                                            {col.type === 'select' && (
                                                <span>
                                                    {' · '}
                                                    {col.options?.length
                                                        ? `${col.options.length} opción(es)`
                                                        : 'sin opciones'}
                                                </span>
                                            )}
                                            {col.type === 'route' && col.routeDestination && (
                                                <span className="block truncate" title={col.routeDestination}>
                                                    Destino: {col.routeDestination}
                                                </span>
                                            )}
                                            {col.type === 'route_cost' && (
                                                <span className="block">
                                                    El costo se calcula cuando alguien lo pide y queda guardado.
                                                </span>
                                            )}
                                        </div>
                                        {repeated && (
                                            <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-md p-2 mt-2">
                                                {repeated}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex gap-1 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => onEdit(col)}
                                            className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                            title="Editar nombre, tipo, opciones y clasificación"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onDelete(col.id)}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Eliminar esta columna propia"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="p-4 border-t shrink-0 flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        Cerrar
                    </button>
                    <button
                        type="button"
                        onClick={onAdd}
                        className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Nueva columna
                    </button>
                </div>
            </div>
        </div>
    );
};
