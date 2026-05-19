import React from 'react';
import {
    Candidate,
    Process,
    PsycholaboralEvaluation,
    PsycholaboralInventory,
    PsycholaboralCompetency,
    PersonalityLevel,
    PsycholaboralSuitability,
} from '../types';
import { formatearFechaPeruana } from '../lib/dateFormatter';
import {
    calculateCompetencyTotals,
    getCompetencyLevelLabel,
    mergePsycholaboralInventory,
} from '../lib/psycholaboralUtils';

/**
 * Ancho CSS alineado a A4 apaisado: mismo DPI de referencia que 794≈210mm, escalado √2 al largo 297mm.
 * El pdf usa `orientation: landscape` para que ese ancho coincida mejor con la hoja física.
 */
const PAGE_W = Math.round((794 * 297) / 210);

export interface PsycholaboralReportDocumentProps {
    candidate: Pick<Candidate, 'name' | 'dni' | 'age' | 'avatarUrl'>;
    process?: Process;
    evaluation: PsycholaboralEvaluation;
    competencies: PsycholaboralCompetency[];
    inventory: PsycholaboralInventory;
    /** Logo "Powered by" (Opalo) — prioridad sobre logo de empresa. */
    poweredByLogoUrl?: string | null;
    /** Logo empresa (solo si no hay powered by). */
    logoUrl?: string;
    companyName?: string;
    primaryColor?: string;
    accentColor?: string;
    /** Desactivados en layout compacto (ahorra altura vertical). */
    heroImageUrl?: string | null;
    introText?: string | null;
    closingText?: string | null;
    footerLegalText?: string | null;
}

const SUITABILITY_STYLES: Record<
    PsycholaboralSuitability,
    { bg: string; text: string; label: string }
> = {
    apto: { bg: '#dcfce7', text: '#166534', label: 'APTO' },
    apto_reservas: { bg: '#fef9c3', text: '#854d0e', label: 'RESERVAS' },
    no_apto: { bg: '#fee2e2', text: '#991b1b', label: 'NO APTO' },
};

const LEVEL_COLORS: Record<PersonalityLevel, string> = {
    bajo: '#ea580c',
    promedio: '#2563eb',
    alto: '#059669',
};

const LEVEL_SHORT: Record<PersonalityLevel, string> = {
    bajo: 'Baj.',
    promedio: 'Prom.',
    alto: 'Alt.',
};

function clampInterpretation(raw: string | undefined): string {
    if (!raw) return '—';
    const t = raw.replace(/\s+/g, ' ').trim();
    if (t.length <= 320) return t;
    return `${t.slice(0, 317)}…`;
}

export const PsycholaboralReportDocument = React.forwardRef<
    HTMLDivElement,
    PsycholaboralReportDocumentProps
>(function PsycholaboralReportDocument(
    {
        candidate,
        process,
        evaluation,
        competencies,
        inventory: rawInventory,
        poweredByLogoUrl,
        logoUrl,
        companyName = 'Opalo',
        primaryColor = '#0f766e',
        accentColor = '#4338ca',
        introText: introTextProp,
        closingText,
        footerLegalText,
    },
    ref
) {
    const inventory = mergePsycholaboralInventory(rawInventory);
    const intellectual = inventory.intellectualLevels.find(l => l.id === evaluation.intellectualLevelId);
    const { totalExpected, totalObtained, percentage } = calculateCompetencyTotals(
        competencies,
        evaluation.competencies
    );
    const status = evaluation.suitabilityStatus || 'apto';
    const suitStyle = SUITABILITY_STYLES[status];

    const position =
        evaluation.positionApplied ||
        process?.bulkConfig?.psycholaboral?.defaultPositionTitle ||
        process?.title ||
        '';

    const reportDate = evaluation.reportDate
        ? formatearFechaPeruana(evaluation.reportDate)
        : formatearFechaPeruana();

    const headerLogoSrc = ((poweredByLogoUrl ?? '').trim() || (logoUrl ?? '').trim() || '').trim();

    /** Intro muy corto si lo configuran; si no, una sola línea para no ocupar bloque alto. */
    const introOverlay =
        (introTextProp && introTextProp.trim()) ||
        'Resultado sintético; complementar con otros criterios de selección.';
    const shortIntro =
        introOverlay.length > 130 ? `${introOverlay.slice(0, 127).trim()}…` : introOverlay;

    const closingLine =
        (closingText && closingText.trim()) || 'Combinar con otros insumos técnicos y de proceso.';

    const fs = {
        nano: 6,
        micro: 6.5,
        sm: 7,
        body: 7.5,
        title: 12,
        sub: 8,
    } as const;

    return (
        <div
            ref={ref}
            style={{
                width: PAGE_W,
                maxWidth: PAGE_W,
                minHeight: 0,
                fontFamily: "'Segoe UI', system-ui, sans-serif",
                color: '#0f172a',
                background: '#fff',
                lineHeight: 1.22,
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
            }}
        >
            {/* Cabecera mínima: sin hero ni gradientes grandes */}
            <header
                style={{
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '4px 8px',
                    borderBottom: `2px solid ${primaryColor}`,
                    background: '#fff',
                }}
            >
                <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', minWidth: 72 }}>
                    {headerLogoSrc ? (
                        <img
                            src={headerLogoSrc}
                            alt=""
                            style={{
                                height: 24,
                                maxWidth: 120,
                                width: 'auto',
                                display: 'block',
                                objectFit: 'contain',
                            }}
                            crossOrigin="anonymous"
                        />
                    ) : (
                        <span style={{ fontSize: fs.sub, fontWeight: 800, color: primaryColor }}>Opalo</span>
                    )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <h1 style={{ margin: 0, fontSize: fs.title, fontWeight: 800, lineHeight: 1.08 }}>
                        INFORME PSICOLABORAL
                    </h1>
                    <p style={{ margin: '1px 0 0', fontSize: fs.sm, color: '#475569', fontWeight: 600 }}>
                        {candidate.name} · {position || '—'} · {reportDate}
                        {companyName ? ` · ${companyName}` : ''}
                    </p>
                    <p
                        style={{
                            margin: '2px 0 0',
                            fontSize: fs.micro,
                            color: '#64748b',
                            lineHeight: 1.25,
                        }}
                    >
                        {shortIntro}
                    </p>
                </div>
                <div style={{ flexShrink: 0 }}>
                    <span
                        style={{
                            display: 'block',
                            background: suitStyle.bg,
                            color: suitStyle.text,
                            padding: '3px 6px',
                            borderRadius: 3,
                            fontWeight: 800,
                            fontSize: fs.sm,
                            textAlign: 'center',
                            lineHeight: 1.05,
                            border: `1px solid ${suitStyle.text}40`,
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {suitStyle.label}
                    </span>
                </div>
            </header>

            <main
                style={{
                    flex: '0 0 auto',
                    padding: '5px 6px 6px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    fontSize: fs.body,
                }}
            >
                <section
                    style={{
                        display: 'flex',
                        gap: 6,
                        alignItems: 'center',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: 3,
                        padding: '4px 6px',
                    }}
                >
                    <div
                        style={{
                            width: 32,
                            height: 32,
                            borderRadius: 3,
                            overflow: 'hidden',
                            flexShrink: 0,
                            background: '#e2e8f0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        {candidate.avatarUrl ? (
                            <img
                                src={candidate.avatarUrl}
                                alt=""
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                crossOrigin="anonymous"
                            />
                        ) : (
                            <span style={{ fontSize: 13, fontWeight: 700, color: primaryColor }}>
                                {candidate.name.charAt(0).toUpperCase()}
                            </span>
                        )}
                    </div>
                    <div
                        style={{
                            flex: 1,
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                            gap: '2px 6px',
                        }}
                    >
                        {[
                            ['Nombre', candidate.name],
                            ['DNI', candidate.dni || '—'],
                            ['Edad', candidate.age ? `${candidate.age}` : '—'],
                            ['Puesto', position || '—'],
                        ].map(([k, v]) => (
                            <div key={String(k)}>
                                <div style={{ fontSize: fs.nano, color: '#64748b', fontWeight: 700 }}>{k}</div>
                                <div style={{ fontSize: fs.sm, fontWeight: 600, lineHeight: 1.15 }}>{String(v)}</div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Tres columnas (apaisado): menos altura vertical, más lectura lateral */}
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(0, 0.88fr) minmax(0, 1.12fr) minmax(0, 1fr)',
                        gap: 6,
                        alignItems: 'start',
                        minHeight: 0,
                    }}
                >
                    {/* 1 · Nivel intelectual */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                        <BlockTitle n={1} title="Nivel intelectual" color={primaryColor} compact />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {inventory.intellectualLevels.map(level => {
                                const active = level.id === evaluation.intellectualLevelId;
                                return (
                                    <div
                                        key={level.id}
                                        style={{
                                            textAlign: 'center',
                                            padding: '3px 2px',
                                            borderRadius: 2,
                                            background: active ? primaryColor : '#f1f5f9',
                                            color: active ? '#fff' : '#64748b',
                                            fontSize: fs.nano,
                                            fontWeight: active ? 700 : 600,
                                            lineHeight: 1.1,
                                        }}
                                    >
                                        <div>{level.name}</div>
                                        <div style={{ fontSize: fs.nano, opacity: 0.92 }}>{level.scoreRange}</div>
                                    </div>
                                );
                            })}
                        </div>
                        <div
                            style={{
                                fontSize: fs.sm,
                                color: '#334155',
                                borderLeft: `2px solid ${primaryColor}`,
                                padding: '4px 6px',
                                background: '#fafafa',
                                lineHeight: 1.28,
                                flex: '1 1 auto',
                                minHeight: 0,
                                overflow: 'hidden',
                            }}
                        >
                            {clampInterpretation(intellectual?.interpretation)}
                        </div>
                    </div>

                    {/* 2 · Personalidad */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                        <BlockTitle n={2} title="Personalidad" color={accentColor} compact />
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: fs.micro }}>
                            <thead>
                                <tr style={{ background: '#f1f5f9' }}>
                                    <th
                                        style={{
                                            padding: '2px 4px',
                                            textAlign: 'left',
                                            border: '1px solid #e2e8f0',
                                            fontSize: fs.nano,
                                        }}
                                    >
                                        Rasgo
                                    </th>
                                    <th
                                        style={{
                                            padding: '2px 3px',
                                            textAlign: 'center',
                                            border: '1px solid #e2e8f0',
                                            width: 40,
                                            fontSize: fs.nano,
                                        }}
                                    >
                                        Niv.
                                    </th>
                                    <th
                                        style={{
                                            padding: '2px 4px',
                                            textAlign: 'left',
                                            border: '1px solid #e2e8f0',
                                            fontSize: fs.nano,
                                        }}
                                    >
                                        Obs.
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {inventory.personalityTraits.map(trait => {
                                    const rating = evaluation.personality.find(p => p.traitId === trait.id);
                                    const level = rating?.level || 'promedio';
                                    return (
                                        <tr key={trait.id}>
                                            <td
                                                style={{
                                                    padding: '2px 4px',
                                                    border: '1px solid #e2e8f0',
                                                    verticalAlign: 'top',
                                                    lineHeight: 1.12,
                                                    fontWeight: 600,
                                                    fontSize: fs.micro,
                                                }}
                                            >
                                                {trait.name}
                                            </td>
                                            <td
                                                style={{
                                                    padding: '2px 3px',
                                                    border: '1px solid #e2e8f0',
                                                    textAlign: 'center',
                                                    color: LEVEL_COLORS[level],
                                                    fontWeight: 700,
                                                    fontSize: fs.micro,
                                                    whiteSpace: 'nowrap',
                                                }}
                                            >
                                                {LEVEL_SHORT[level]}
                                            </td>
                                            <td style={{ padding: '2px 4px', border: '1px solid #e2e8f0', fontSize: fs.nano }}>
                                                {rating?.observations?.trim()
                                                    ? truncate(rating.observations, 110)
                                                    : '—'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* 3 · Competencias + 4 · Conclusiones */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                        <BlockTitle n={3} title="Competencias" color={primaryColor} compact />
                        <div
                            style={{
                                padding: '3px 6px',
                                background: `#f8fafc`,
                                borderRadius: 2,
                                border: `1px solid ${primaryColor}40`,
                                fontSize: fs.sm,
                                fontWeight: 700,
                                lineHeight: 1.2,
                            }}
                        >
                            {percentage}% cumplimiento · {totalObtained}/{totalExpected} pts. (esp. máx.)
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            {competencies.map(comp => {
                                const rating = evaluation.competencies.find(r => r.competencyId === comp.id);
                                const obtained = rating?.obtainedScore ?? 0;
                                const levelLabel = getCompetencyLevelLabel(obtained);
                                return (
                                    <div key={comp.id} style={{ lineHeight: 1.15 }}>
                                        <div style={{ fontSize: fs.micro, fontWeight: 600 }}>
                                            <span>{comp.name}</span>
                                            <span style={{ fontWeight: 500, fontSize: fs.nano, color: '#475569' }}>
                                                {' · '}
                                                {obtained}/9 · esp. {comp.expectedScore} ({levelLabel})
                                            </span>
                                        </div>
                                        {rating?.observations?.trim() ? (
                                            <div style={{ fontSize: fs.nano, color: '#64748b', marginTop: 1 }}>
                                                {truncate(rating.observations, 130)}
                                            </div>
                                        ) : null}
                                    </div>
                                );
                            })}
                        </div>

                        <BlockTitle n={4} title="Conclusiones" color={accentColor} compact />
                        <div
                            style={{
                                fontSize: fs.micro,
                                lineHeight: 1.3,
                                color: '#334155',
                                padding: '5px 6px',
                                borderLeft: `2px solid ${accentColor}`,
                                background: '#fafafa',
                                textAlign: 'justify',
                                border: '1px solid #e2e8f0',
                                borderLeftWidth: 2,
                                flex: '1 1 auto',
                                minHeight: 72,
                                maxHeight: 200,
                                overflow: 'hidden',
                            }}
                        >
                            {evaluation.conclusions?.trim()
                                ? evaluation.conclusions.trim()
                                : 'Sin conclusiones registradas.'}
                        </div>
                    </div>
                </div>
            </main>

            <footer
                style={{
                    flexShrink: 0,
                    padding: '3px 6px',
                    fontSize: fs.nano,
                    color: '#64748b',
                    borderTop: '1px solid #e2e8f0',
                    background: '#f8fafc',
                    lineHeight: 1.2,
                    textAlign: 'center',
                }}
            >
                <span style={{ fontWeight: 600 }}>{closingLine}</span>
                {' · '}
                {['Conf.', footerLegalText?.trim?.(), companyName, reportDate].filter(Boolean).join(' · ')}
            </footer>
        </div>
    );
});

function truncate(s: string, maxLen: number): string {
    const t = s.replace(/\s+/g, ' ').trim();
    if (t.length <= maxLen) return t;
    return `${t.slice(0, maxLen - 1)}…`;
}

function BlockTitle({ n, title, color, compact }: { n: number; title: string; color: string; compact?: boolean }) {
    const chip = compact ? 14 : 18;
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span
                style={{
                    width: chip,
                    height: chip,
                    borderRadius: 3,
                    background: color,
                    color: '#fff',
                    fontSize: compact ? 8 : 10,
                    fontWeight: 800,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                }}
            >
                {n}
            </span>
            <strong style={{ fontSize: 7.5, color: '#0f172a' }}>{title}</strong>
        </div>
    );
}
