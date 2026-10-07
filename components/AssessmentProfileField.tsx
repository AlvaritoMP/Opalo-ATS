import React from 'react';
import type { AssessmentProfile } from '../lib/assessments/types';

interface Props {
    value: AssessmentProfile | '';
    onChange: (value: AssessmentProfile | '') => void;
}

export const AssessmentProfileField: React.FC<Props> = ({ value, onChange }) => {
    return (
        <div className="space-y-2 border-t border-gray-200 pt-6">
            <div>
                <h3 className="text-sm font-semibold text-gray-900">Pruebas para candidatos</h3>
                <p className="text-xs text-gray-500 mt-1">
                    La jerarquía define la batería del enlace público. En la tabla del proceso puedes activar las columnas Barsit, Raven o Personalidad D para ver si cada candidato ya envió la prueba.
                </p>
            </div>
            <label className="block text-sm font-medium text-gray-700">Jerarquía de la posición</label>
            <select
                value={value}
                onChange={(e) => onChange((e.target.value as AssessmentProfile | '') || '')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
                <option value="">Sin pruebas</option>
                <option value="mandos">Mandos medios y superiores</option>
                <option value="operativos">Operativos y básicos</option>
            </select>
            {value === 'mandos' && (
                <p className="text-xs text-gray-600">
                    Barsit (10 minutos) y prueba de personalidad (D). El consultor ve los resultados en la ficha del candidato.
                </p>
            )}
            {value === 'operativos' && (
                <p className="text-xs text-gray-600">
                    Prueba de inteligencia (figuras) y prueba de personalidad (D). Estos resultados cargan el nivel intelectual y los rasgos del informe psicolaboral.
                </p>
            )}
        </div>
    );
};
