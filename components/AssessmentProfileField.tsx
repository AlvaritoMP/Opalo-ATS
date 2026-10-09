import React from 'react';
import type { AssessmentProfile } from '../lib/assessments/types';

interface Props {
    value: AssessmentProfile | '';
    onChange: (value: AssessmentProfile | '') => void;
    behavioral: boolean;
    onBehavioralChange: (value: boolean) => void;
}

export const AssessmentProfileField: React.FC<Props> = ({ value, onChange, behavioral, onBehavioralChange }) => {
    return (
        <div className="space-y-2 border-t border-gray-200 pt-6">
            <div>
                <h3 className="text-sm font-semibold text-gray-900">Pruebas para candidatos</h3>
                <p className="text-xs text-gray-500 mt-1">
                    La jerarquía define la batería del enlace público. Las pruebas de conducta se suman si las activas. En la tabla puedes mostrar si cada candidato ya las envió.
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
            <label className="flex items-start gap-2 pt-2">
                <input
                    type="checkbox"
                    checked={behavioral}
                    onChange={(e) => onBehavioralChange(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-teal-700 rounded"
                />
                <span>
                    <span className="block text-sm font-medium text-gray-800">Incluir pruebas de conducta</span>
                    <span className="block text-xs text-gray-500 mt-0.5">
                        Riesgo y recompensa, atención bajo presión, y esfuerzo frente a retorno. El consultor ve la interpretación en la ficha. No modifican el informe psicolaboral.
                    </span>
                </span>
            </label>
        </div>
    );
};
