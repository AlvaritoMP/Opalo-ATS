import {
    PsycholaboralEvaluation,
    PsycholaboralInventory,
    PsycholaboralCompetency,
    PsycholaboralProcessConfig,
    Process,
    Candidate,
    PersonalityLevel,
    ConclusionTemplate,
    IntellectualLevelId,
} from '../types';
import { createDefaultPsycholaboralInventory } from './psycholaboralDefaults';

const LEVEL_LABELS: Record<PersonalityLevel, string> = {
    bajo: 'nivel bajo',
    promedio: 'nivel promedio',
    alto: 'nivel alto',
};

const SUITABILITY_LABELS = {
    apto: 'APTO',
    no_apto: 'NO APTO',
    apto_reservas: 'APTO CON RESERVAS',
};

export function mergePsycholaboralInventory(
    partial?: PsycholaboralInventory | null
): PsycholaboralInventory {
    const defaults = createDefaultPsycholaboralInventory();
    if (!partial) return defaults;
    return {
        intellectualLevels: partial.intellectualLevels?.length
            ? partial.intellectualLevels
            : defaults.intellectualLevels,
        personalityTraits: partial.personalityTraits?.length
            ? partial.personalityTraits
            : defaults.personalityTraits,
        competencySets: partial.competencySets?.length
            ? partial.competencySets
            : defaults.competencySets,
        conclusionTemplates: partial.conclusionTemplates?.length
            ? partial.conclusionTemplates
            : defaults.conclusionTemplates,
    };
}

export function resolveProcessCompetencies(
    process: Process | undefined,
    inventory: PsycholaboralInventory
): PsycholaboralCompetency[] {
    const config = process?.bulkConfig?.psycholaboral;
    if (config?.competencies?.length) return config.competencies;
    if (config?.competencySetId) {
        const set = inventory.competencySets.find(s => s.id === config.competencySetId);
        if (set?.competencies?.length) return set.competencies;
    }
    return inventory.competencySets[0]?.competencies || [];
}

export function calculateCompetencyTotals(
    competencies: PsycholaboralCompetency[],
    ratings: PsycholaboralEvaluation['competencies']
) {
    let totalExpected = 0;
    let totalObtained = 0;
    competencies.forEach(comp => {
        totalExpected += comp.expectedScore || 0;
        const rating = ratings.find(r => r.competencyId === comp.id);
        totalObtained += rating?.obtainedScore || 0;
    });
    const percentage =
        totalExpected > 0 ? Math.round((totalObtained / totalExpected) * 100) : 0;
    return { totalExpected, totalObtained, percentage };
}

export function getCompetencyLevelLabel(score: number): string {
    if (score <= 3) return 'Bajo';
    if (score <= 6) return 'Promedio';
    return 'Alto';
}

export function buildPersonalitySummary(
    evaluation: PsycholaboralEvaluation,
    inventory: PsycholaboralInventory
): string {
    const parts = evaluation.personality.map(p => {
        const trait = inventory.personalityTraits.find(t => t.id === p.traitId);
        const name = trait?.name || p.traitId;
        return `${name.toLowerCase()} en ${LEVEL_LABELS[p.level]}`;
    });
    if (parts.length === 0) return 'recursos de personalidad dentro de parámetros esperados';
    return parts.join('; ');
}

export function buildCompetencyHighlights(
    competencies: PsycholaboralCompetency[],
    ratings: PsycholaboralEvaluation['competencies']
): string {
    const highlights = competencies
        .map(comp => {
            const rating = ratings.find(r => r.competencyId === comp.id);
            return { comp, score: rating?.obtainedScore ?? 0 };
        })
        .filter(x => x.score >= 7)
        .map(x => x.comp.name.toLowerCase());
    if (highlights.length === 0) return 'competencias evaluadas';
    return highlights.join(', ');
}

export function buildWeakAreas(
    competencies: PsycholaboralCompetency[],
    ratings: PsycholaboralEvaluation['competencies']
): string {
    const weak = competencies
        .map(comp => {
            const rating = ratings.find(r => r.competencyId === comp.id);
            return { comp, score: rating?.obtainedScore ?? 0 };
        })
        .filter(x => x.score > 0 && x.score <= 4)
        .map(x => x.comp.name.toLowerCase());
    return weak.length ? weak.join(', ') : 'áreas de desarrollo identificadas en la entrevista';
}

export function applyConclusionTemplate(
    template: ConclusionTemplate,
    ctx: Record<string, string>
): string {
    let text = template.template;
    Object.entries(ctx).forEach(([key, value]) => {
        text = text.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    });
    return text;
}

export function generateConclusionFromTemplate(
    template: ConclusionTemplate,
    candidate: Pick<Candidate, 'name'>,
    process: Process | undefined,
    evaluation: PsycholaboralEvaluation,
    inventory: PsycholaboralInventory,
    competencies: PsycholaboralCompetency[]
): string {
    const level = inventory.intellectualLevels.find(l => l.id === evaluation.intellectualLevelId);
    const { percentage } = calculateCompetencyTotals(competencies, evaluation.competencies);
    const status = evaluation.suitabilityStatus || 'apto';

    return applyConclusionTemplate(template, {
        nombre: candidate.name,
        puesto:
            evaluation.positionApplied ||
            process?.bulkConfig?.psycholaboral?.defaultPositionTitle ||
            process?.title ||
            'el puesto evaluado',
        estado: SUITABILITY_LABELS[status],
        nivel_intelectual: level?.name?.toLowerCase() || 'evaluado',
        personalidad_resumen: buildPersonalitySummary(evaluation, inventory),
        porcentaje_competencias: String(percentage),
        competencias_destacadas: buildCompetencyHighlights(competencies, evaluation.competencies),
        areas_mejora: buildWeakAreas(competencies, evaluation.competencies),
        recomendaciones: 'capacitación y seguimiento cercano',
    });
}

export function createEmptyEvaluation(
    inventory: PsycholaboralInventory,
    competencies: PsycholaboralCompetency[],
    existing?: PsycholaboralEvaluation | null,
    positionApplied?: string
): PsycholaboralEvaluation {
    if (existing) return { ...existing };

    return {
        intellectualLevelId: 'normal_promedio' as IntellectualLevelId,
        personality: inventory.personalityTraits.map(t => ({
            traitId: t.id,
            level: 'promedio' as PersonalityLevel,
            observations: '',
        })),
        competencies: competencies.map(c => ({
            competencyId: c.id,
            obtainedScore: c.expectedScore,
            observations: '',
        })),
        conclusions: '',
        suitabilityStatus: 'apto',
        positionApplied: positionApplied || '',
        reportDate: new Date().toISOString().split('T')[0],
    };
}

export function isPsycholaboralEnabled(config?: PsycholaboralProcessConfig): boolean {
    return config?.enabled !== false;
}
