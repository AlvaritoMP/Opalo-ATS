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

/** Imagen de acento muy baja altura si no hay foto de proceso/settings (opcional). */
export const DEFAULT_PSYCHOLABORAL_HERO =
    'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=900&q=80&auto=format&fit=crop';

/** Ancho lógico A4 (~210mm @ 96dpi). */
const PAGE_W = 794;

export interface PsycholaboralReportDocumentProps {
    candidate: Pick<Candidate, 'name' | 'dni' | 'age' | 'avatarUrl'>;
    process?: Process;
    evaluation: PsycholaboralEvaluation;
    competencies: PsycholaboralCompetency[];
    inventory: PsycholaboralInventory;
    logoUrl?: string;
    companyName?: string;
    primaryColor?: string;
    accentColor?: string;
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
    apto_reservas: { bg: '#fef9c3', text: '#854d0e', label: 'APTO CON RESERVAS' },
    no_apto: { bg: '#fee2e2', text: '#991b1b', label: 'NO APTO' },
};

const LEVEL_COLORS: Record<PersonalityLevel, string> = {
    bajo: '#f97316',
    promedio: '#3b82f6',
    alto: '#10b981',
};

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
        logoUrl,
        companyName = 'Opalo',
        primaryColor = '#0f766e',
        accentColor = '#4f46e5',
        heroImageUrl,
        introText,
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

    const resolvedHeroAccent =
        (heroImageUrl && heroImageUrl.trim()) ||
        (process?.flyerUrl && process.flyerUrl.trim()) ||
        DEFAULT_PSYCHOLABORAL_HERO;

    const resolvedIntro =
        (introText && introText.trim()) ||
        'Documento sintético para apoyar una decisión informada. Revise todas las áreas antes de cerrar valoración.';

    const closingLine =
        (closingText && closingText.trim()) ||
        'Documento elaborado con criterios técnicos; combine este resultado con otros insumos de selección.';

    return (
        <div
            ref={ref}
            style={{
                width: PAGE_W,
                maxWidth: PAGE_W,
                minHeight: 0,
                fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
                color: '#1e293b',
                background: '#ffffff',
                lineHeight: 1.35,
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            {/* Barra superior: logo Opalo visible + titular */}
            <header
                style={{
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'stretch',
                    gap: 0,
                    borderBottom: `3px solid ${primaryColor}`,
                    minHeight: 68,
                    background: `linear-gradient(90deg, ${primaryColor}12 0%, #fff 28%, ${accentColor}08 100%)`,
                }}
            >
                <div
                    style={{
                        width: '28%',
                        minWidth: 200,
                        backgroundImage: `linear-gradient(165deg, ${primaryColor}d9 0%, ${accentColor}b8 85%), url(${resolvedHeroAccent})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center center',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 10,
                    }}
                >
                    <div
                        style={{
                            background: '#ffffff',
                            borderRadius: 8,
                            padding: '8px 12px',
                            boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
                        }}
                    >
                        {logoUrl ? (
                            <img
                                src={logoUrl}
                                alt=""
                                style={{
                                    height: 36,
                                    maxWidth: 160,
                                    width: 'auto',
                                    display: 'block',
                                    objectFit: 'contain',
                                }}
                                crossOrigin="anonymous"
                            />
                        ) : (
                            <span style={{ fontSize: 16, fontWeight: 800, color: primaryColor }}>{companyName}</span>
                        )}
                    </div>
                </div>
                <div
                    style={{
                        flex: 1,
                        padding: '10px 14px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        gap: 4,
                    }}
                >
                    <p
                        style={{
                            margin: 0,
                            fontSize: 9,
                            letterSpacing: '0.12em',
                            textTransform: 'uppercase',
                            color: '#64748b',
                            fontWeight: 700,
                        }}
                    >
                        {companyName}
                    </p>
                    <h1
                        style={{
                            margin: 0,
                            fontSize: 15,
                            fontWeight: 800,
                            color: '#0f172a',
                            lineHeight: 1.2,
                        }}
                    >
                        INFORME DE EVALUACIÓN PSICOLABORAL
                    </h1>
                    <p style={{ margin: 0, fontSize: 10, color: '#475569', fontWeight: 600 }}>
                        {candidate.name} · {position || 'Evaluación'} · {reportDate}
                    </p>
                    <p style={{ margin: 0, fontSize: 9, color: '#64748b', fontStyle: 'italic', lineHeight: 1.4 }}>
                        {resolvedIntro}
                    </p>
                </div>
                <div style={{ alignSelf: 'center', paddingRight: 12, flexShrink: 0 }}>
                    <span
                        style={{
                            display: 'block',
                            background: suitStyle.bg,
                            color: suitStyle.text,
                            padding: '8px 12px',
                            borderRadius: 8,
                            fontWeight: 800,
                            fontSize: 11,
                            textAlign: 'center',
                            lineHeight: 1.15,
                            maxWidth: 120,
                            boxSizing: 'border-box',
                            border: `1px solid ${suitStyle.text}33`,
                        }}
                    >
                        {suitStyle.label}
                    </span>
                </div>
            </header>

            <main
                style={{
                    flex: '0 0 auto',
                    padding: '8px 10px 10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    fontSize: 9,
                }}
            >
                {/* Fila datos + foto */}
                <section
                    style={{
                        display: 'flex',
                        gap: 8,
                        alignItems: 'stretch',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: 8,
                        padding: 8,
                    }}
                >
                    <div
                        style={{
                            width: 52,
                            height: 52,
                            borderRadius: 6,
                            overflow: 'hidden',
                            flexShrink: 0,
                            background: `#e2e8f0`,
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
                            <span style={{ fontSize: 20, fontWeight: 700, color: primaryColor }}>
                                {candidate.name.charAt(0).toUpperCase()}
                            </span>
                        )}
                    </div>
                    <div
                        style={{
                            flex: 1,
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                            gap: '4px 10px',
                        }}
                    >
                        {[
                            ['Nombre', candidate.name],
                            ['DNI', candidate.dni || '—'],
                            ['Edad', candidate.age ? `${candidate.age}` : '—'],
                            ['Puesto', position],
                        ].map(([k, v]) => (
                            <div key={String(k)}>
                                <div style={{ fontSize: 7, color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                                    {k}
                                </div>
                                <div style={{ fontSize: 9, fontWeight: 600 }}>{String(v)}</div>
                            </div>
                        ))}
                    </div>
                </section>

                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 8,
                        alignItems: 'start',
                        minHeight: 0,
                    }}
                >
                    {/* Columna izquierda */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                        <BlockTitle n={1} title="Nivel intelectual" color={primaryColor} />
                        <div style={{ display: 'flex', gap: 3 }}>
                            {inventory.intellectualLevels.map(level => {
                                const active = level.id === evaluation.intellectualLevelId;
                                return (
                                    <div
                                        key={level.id}
                                        style={{
                                            flex: 1,
                                            textAlign: 'center',
                                            padding: '4px 2px',
                                            borderRadius: 4,
                                            background: active ? primaryColor : '#f1f5f9',
                                            color: active ? '#fff' : '#64748b',
                                            fontSize: 7,
                                            fontWeight: active ? 700 : 600,
                                            lineHeight: 1.2,
                                        }}
                                    >
                                        <div>{level.name}</div>
                                        <div style={{ fontSize: 6, opacity: 0.9 }}>{level.scoreRange}</div>
                                    </div>
                                );
                            })}
                        </div>
                        <div
                            style={{
                                fontSize: 8,
                                color: '#334155',
                                borderLeft: `3px solid ${primaryColor}`,
                                padding: '6px 8px',
                                background: '#fafafa',
                                lineHeight: 1.38,
                            }}
                        >
                            {intellectual?.interpretation}
                        </div>

                        <BlockTitle n={2} title="Recursos de personalidad" color={accentColor} />
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 8 }}>
                            <thead>
                                <tr style={{ background: '#f1f5f9' }}>
                                    <th style={{ padding: '3px', textAlign: 'left', border: '1px solid #e2e8f0' }}>
                                        Rasgo
                                    </th>
                                    <th style={{ padding: '3px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                                        Nivel
                                    </th>
                                    <th style={{ padding: '3px', textAlign: 'left', border: '1px solid #e2e8f0' }}>
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
                                                    padding: '3px',
                                                    border: '1px solid #e2e8f0',
                                                    verticalAlign: 'top',
                                                }}
                                            >
                                                <strong>{trait.name}</strong>
                                                <div style={{ fontSize: 7, color: '#64748b' }}>{trait.definition}</div>
                                            </td>
                                            <td
                                                style={{
                                                    padding: '3px',
                                                    border: '1px solid #e2e8f0',
                                                    textAlign: 'center',
                                                    color: LEVEL_COLORS[level],
                                                    fontWeight: 700,
                                                    textTransform: 'capitalize',
                                                }}
                                            >
                                                {level}
                                            </td>
                                            <td style={{ padding: '3px', border: '1px solid #e2e8f0', fontSize: 7 }}>
                                                {rating?.observations || '—'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Columna derecha */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                        <BlockTitle n={3} title="Competencias psicolaborales" color={primaryColor} />
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                padding: '6px 10px',
                                background: `#f8fafc`,
                                borderRadius: 6,
                                border: `1px solid ${primaryColor}33`,
                            }}
                        >
                            <div
                                style={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: '50%',
                                    background: `conic-gradient(${primaryColor} ${percentage * 3.6}deg, #e2e8f0 0deg)`,
                                    flexShrink: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <div
                                    style={{
                                        width: 34,
                                        height: 34,
                                        borderRadius: '50%',
                                        background: '#fff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 800,
                                        fontSize: 11,
                                        color: primaryColor,
                                    }}
                                >
                                    {percentage}%
                                </div>
                            </div>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 9 }}>{totalObtained} / {totalExpected}</div>
                                <div style={{ fontSize: 7, color: '#64748b' }}>Pts. obt. vs esperado · escala 1–9</div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                            {competencies.map(comp => {
                                const rating = evaluation.competencies.find(r => r.competencyId === comp.id);
                                const obtained = rating?.obtainedScore ?? 0;
                                const pct = Math.min(100, (obtained / 9) * 100);
                                const levelLabel = getCompetencyLevelLabel(obtained);
                                const barColor =
                                    obtained <= 3 ? '#f97316' : obtained <= 6 ? '#3b82f6' : '#10b981';
                                return (
                                    <div key={comp.id}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
                                            <span style={{ fontSize: 8, fontWeight: 600 }}>
                                                {comp.name}: <span style={{ fontWeight: 400, fontSize: 7 }}>{comp.definition}</span>
                                            </span>
                                            <span style={{ fontSize: 7, color: barColor, fontWeight: 700, whiteSpace: 'nowrap' }}>
                                                {obtained} / {comp.expectedScore} ({levelLabel})
                                            </span>
                                        </div>
                                        <div style={{ height: 4, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden', marginTop: 2 }}>
                                            <div
                                                style={{
                                                    width: `${pct}%`,
                                                    height: '100%',
                                                    background: barColor,
                                                }}
                                            />
                                        </div>
                                        {rating?.observations ? (
                                            <div style={{ fontSize: 7, color: '#64748b', marginTop: 1 }}>{rating.observations}</div>
                                        ) : null}
                                    </div>
                                );
                            })}
                        </div>

                        <BlockTitle n={4} title="Conclusiones" color={accentColor} />
                        <div
                            style={{
                                fontSize: 8,
                                lineHeight: 1.43,
                                color: '#334155',
                                padding: '8px 10px',
                                borderLeft: `3px solid ${accentColor}`,
                                background: '#fafafa',
                                textAlign: 'justify',
                                border: '1px solid #e2e8f0',
                                borderLeftWidth: 3,
                            }}
                        >
                            {evaluation.conclusions || 'Sin conclusiones registradas.'}
                        </div>
                    </div>
                </div>
            </main>

            <footer
                style={{
                    flexShrink: 0,
                    padding: '6px 12px',
                    fontSize: 7,
                    color: '#64748b',
                    borderTop: `1px solid #e2e8f0`,
                    background: '#f8fafc',
                }}
            >
                <div style={{ textAlign: 'center', marginBottom: 4, fontWeight: 600, fontSize: 8 }}>{closingLine}</div>
                <div style={{ textAlign: 'center' }}>
                    {['Confidencial', footerLegalText?.trim(), companyName, `Emitido ${reportDate}`].filter(Boolean).join(' · ')}
                </div>
            </footer>
        </div>
    );
});

function BlockTitle({ n, title, color }: { n: number; title: string; color: string }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
                style={{
                    width: 18,
                    height: 18,
                    borderRadius: 5,
                    background: color,
                    color: '#fff',
                    fontSize: 10,
                    fontWeight: 800,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                {n}
            </span>
            <strong style={{ fontSize: 9, color: '#0f172a' }}>{title}</strong>
        </div>
    );
}
