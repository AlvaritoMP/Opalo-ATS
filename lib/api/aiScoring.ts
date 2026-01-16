/**
 * Servicio para integración con OpenAI para scoring y análisis de candidatos
 * 
 * Este servicio se puede usar para:
 * - Generar score_ia basado en el CV y el prompt específico del proceso
 * - Generar metadata_ia con resumen estructurado
 * - Evaluar respuestas a killer questions
 */

import { BulkProcessConfig } from '../../types';

export interface AIScoringRequest {
    candidateName: string;
    candidateDescription?: string;
    candidateCV?: string; // Texto del CV o URL
    processPrompt?: string; // Prompt específico del proceso
    scoreThreshold?: number;
}

export interface AIScoringResponse {
    score: number; // 0-100
    metadata: string; // JSON string con información estructurada
    reasoning?: string; // Explicación del score
}

export const aiScoringService = {
    /**
     * Generar score y metadata para un candidato usando OpenAI
     * 
     * NOTA: Esta función requiere configuración de OpenAI API key en el backend
     * Por ahora es una estructura preparada para futura implementación
     */
    async generateScore(request: AIScoringRequest): Promise<AIScoringResponse> {
        // TODO: Implementar llamada al backend que use OpenAI
        // El backend debería tener un endpoint como: POST /api/ai/score
        
        // Por ahora, retornar valores por defecto
        // En producción, esto debería llamar al backend que tiene la API key de OpenAI
        
        const defaultScore = request.candidateDescription ? 75 : 50;
        const defaultMetadata = JSON.stringify({
            experiencia: request.candidateDescription || 'No disponible',
            match: defaultScore >= (request.scoreThreshold || 70) ? 'Alto' : 'Medio',
            resumen: request.candidateDescription || 'Información no disponible'
        });

        return {
            score: defaultScore,
            metadata: defaultMetadata,
            reasoning: 'Score generado automáticamente. Configure OpenAI API para scoring real.'
        };
    },

    /**
     * Evaluar respuestas a killer questions
     * 
     * @param answers - Respuestas del candidato a las killer questions
     * @param killerQuestions - Configuración de killer questions del proceso
     */
    evaluateKillerQuestions(
        answers: Record<string, string | string[]>,
        killerQuestions: BulkProcessConfig['killerQuestions']
    ): { passed: boolean; failedQuestions: string[] } {
        if (!killerQuestions || killerQuestions.length === 0) {
            return { passed: true, failedQuestions: [] };
        }

        const failedQuestions: string[] = [];

        for (const question of killerQuestions) {
            if (!question.required) continue;

            const answer = answers[question.id];
            if (!answer) {
                failedQuestions.push(question.question);
                continue;
            }

            const correctAnswers = Array.isArray(question.correctAnswer)
                ? question.correctAnswer
                : [question.correctAnswer];

            const userAnswers = Array.isArray(answer) ? answer : [answer];

            // Verificar si alguna respuesta del usuario coincide con las correctas
            const matches = userAnswers.some(userAns =>
                correctAnswers.some(correctAns =>
                    userAns.toString().toLowerCase().trim() === correctAns.toString().toLowerCase().trim()
                )
            );

            if (!matches) {
                failedQuestions.push(question.question);
            }
        }

        return {
            passed: failedQuestions.length === 0,
            failedQuestions,
        };
    },

    /**
     * Determinar si un candidato pasa el filtro automático
     */
    passesAutoFilter(
        scoreIa: number | undefined,
        killerQuestionAnswers: Record<string, string | string[]>,
        bulkConfig: BulkProcessConfig | undefined
    ): { passed: boolean; reason?: string } {
        if (!bulkConfig?.autoFilterEnabled) {
            return { passed: true };
        }

        // Verificar score threshold
        if (bulkConfig.scoreThreshold !== undefined) {
            if (scoreIa === undefined || scoreIa < bulkConfig.scoreThreshold) {
                return {
                    passed: false,
                    reason: `Score IA (${scoreIa || 'N/A'}) es menor que el threshold (${bulkConfig.scoreThreshold})`,
                };
            }
        }

        // Verificar killer questions
        if (bulkConfig.killerQuestions && bulkConfig.killerQuestions.length > 0) {
            const evaluation = this.evaluateKillerQuestions(killerQuestionAnswers, bulkConfig.killerQuestions);
            if (!evaluation.passed) {
                return {
                    passed: false,
                    reason: `No pasó las killer questions: ${evaluation.failedQuestions.join(', ')}`,
                };
            }
        }

        return { passed: true };
    },
};
