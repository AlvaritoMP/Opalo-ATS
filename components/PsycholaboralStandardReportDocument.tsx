import React from 'react';
import { PersonalityLevel, PsycholaboralSuitability } from '../types';
import { formatearFechaPeruana } from '../lib/dateFormatter';
import {
    calculateCompetencyTotals,
    getCompetencyLevelLabel,
    mergePsycholaboralInventory,
} from '../lib/psycholaboralUtils';
import { BEHAVIORAL_REPORT_END, BEHAVIORAL_REPORT_START } from '../lib/assessments/insights';
import type { PsycholaboralReportDocumentProps } from './PsycholaboralReportDocument';

/** A4 vertical a 96 dpi (210 mm). La paginación del PDF corta solo entre elementos `data-pdf-block`. */
const PAGE_W = 794;

/** Isotipo de Opalo (mismo dibujo que favicon.svg) en HTML/CSS: html2canvas no rasteriza bien SVG en <img>. */
function OpaloMark({ size }: { size: number }) {
    const u = size / 32;
    const abs = (left: number, top: number, w: number, h: number, extra: React.CSSProperties) => (
        <div style={{ position: 'absolute', left: left * u, top: top * u, width: w * u, height: h * u, ...extra }} />
    );
    return (
        <div
            style={{
                position: 'relative',
                width: size,
                height: size,
                borderRadius: 7 * u,
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                overflow: 'hidden',
                flexShrink: 0,
            }}
        >
            {abs(7.9, 6.9, 7.2, 7.2, { borderRadius: '50%', background: '#fff' })}
            {abs(5.2, 19, 12.6, 6.8, { borderRadius: `${6.3 * u}px ${6.3 * u}px 0 0`, background: '#fff' })}
            {abs(17, 14.8, 12.4, 12.4, { borderRadius: '50%', background: '#fff' })}
            <div
                style={{
                    position: 'absolute',
                    left: 17 * u,
                    top: 14.8 * u,
                    width: 12.4 * u,
                    height: 12.4 * u,
                    lineHeight: `${12.4 * u}px`,
                    textAlign: 'center',
                    color: '#2563eb',
                    fontSize: 9 * u,
                    fontWeight: 900,
                }}
            >
                ✓
            </div>
        </div>
    );
}

const SUITABILITY: Record<
    PsycholaboralSuitability,
    { label: string; caption: string; symbol: string; fg: string; bg: string; ring: string }
> = {
    apto: { label: 'APTO', caption: 'Cumple con el perfil', symbol: '✓', fg: '#047857', bg: '#ecfdf5', ring: '#10b981' },
    apto_reservas: { label: 'APTO CON RESERVAS', caption: 'Cumple con observaciones', symbol: '!', fg: '#b45309', bg: '#fffbeb', ring: '#f59e0b' },
    no_apto: { label: 'NO APTO', caption: 'No cumple con el perfil', symbol: '✕', fg: '#b91c1c', bg: '#fef2f2', ring: '#ef4444' },
};

const LEVEL_META: Record<PersonalityLevel, { label: string; steps: number; color: string }> = {
    bajo: { label: 'Bajo', steps: 1, color: '#f97316' },
    promedio: { label: 'Promedio', steps: 2, color: '#3b82f6' },
    alto: { label: 'Alto', steps: 3, color: '#10b981' },
};

const INK = '#0f172a';
const MUTED = '#64748b';
const LINE = '#e2e8f0';
const SOFT = '#f8fafc';

function withAlpha(hex: string, alpha: number): string {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
    if (!m) return hex;
    const n = parseInt(m[1], 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

function truncate(text: string | undefined, max: number): string {
    const t = (text || '').replace(/\s+/g, ' ').trim();
    if (t.length <= max) return t;
    return `${t.slice(0, max - 1).trim()}…`;
}

function initials(name: string): string {
    const parts = name.split(/\s+/).filter(Boolean);
    return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '—';
}

/** Separa el dictamen de pruebas de conducta del resto de conclusiones para mostrarlo en su propia tarjeta. */
function splitConclusions(raw: string | undefined): { paragraphs: string[]; behavioral: string[] } {
    const text = (raw || '').trim();
    const start = text.indexOf(BEHAVIORAL_REPORT_START);
    const end = text.indexOf(BEHAVIORAL_REPORT_END);
    let main = text;
    let behavioralText = '';
    if (start >= 0 && end > start) {
        behavioralText = text.slice(start + BEHAVIORAL_REPORT_START.length, end);
        main = `${text.slice(0, start)}\n\n${text.slice(end + BEHAVIORAL_REPORT_END.length)}`;
    }
    const toParagraphs = (s: string) =>
        s.split(/\n\s*\n|\n/).map(p => p.trim()).filter(Boolean);
    return { paragraphs: toParagraphs(main), behavioral: toParagraphs(behavioralText) };
}

export const PsycholaboralStandardReportDocument = React.forwardRef<
    HTMLDivElement,
    PsycholaboralReportDocumentProps
>(function PsycholaboralStandardReportDocument(
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
        introText,
        closingText,
        footerLegalText,
        fullNameForReport,
    },
    ref
) {
    const inventory = mergePsycholaboralInventory(rawInventory);
    const personName = (fullNameForReport?.trim() || candidate.name || '—').trim();
    const levels = inventory.intellectualLevels;
    const activeLevelIndex = levels.findIndex(l => l.id === evaluation.intellectualLevelId);
    const intellectual = activeLevelIndex >= 0 ? levels[activeLevelIndex] : undefined;
    const { totalExpected, totalObtained, percentage } = calculateCompetencyTotals(
        competencies,
        evaluation.competencies
    );
    const suit = SUITABILITY[evaluation.suitabilityStatus || 'apto'];

    const position =
        evaluation.positionApplied ||
        process?.bulkConfig?.psycholaboral?.defaultPositionTitle ||
        process?.title ||
        '';
    const clientName = process?.client?.razonSocial?.trim() || '';
    const reportDate = evaluation.reportDate
        ? formatearFechaPeruana(evaluation.reportDate)
        : formatearFechaPeruana();

    const brandLogo = (poweredByLogoUrl ?? '').trim();
    const companyLogo = (logoUrl ?? '').trim();
    const showCompanyLogo = !!companyLogo && companyLogo !== brandLogo;

    const personalityRows = inventory.personalityTraits.map(trait => {
        const rating = evaluation.personality.find(p => p.traitId === trait.id);
        return { trait, level: (rating?.level || 'promedio') as PersonalityLevel, obs: rating?.observations?.trim() || '' };
    });
    const levelCounts = personalityRows.reduce(
        (acc, r) => ({ ...acc, [r.level]: acc[r.level] + 1 }),
        { bajo: 0, promedio: 0, alto: 0 } as Record<PersonalityLevel, number>
    );

    const competencyRows = competencies.map(comp => {
        const rating = evaluation.competencies.find(r => r.competencyId === comp.id);
        const obtained = rating?.obtainedScore ?? 0;
        return { comp, obtained, meets: obtained >= comp.expectedScore, obs: rating?.observations?.trim() || '' };
    });
    const metCount = competencyRows.filter(r => r.meets).length;

    const { paragraphs, behavioral } = splitConclusions(evaluation.conclusions);
    const intro =
        introText?.trim() ||
        'Síntesis de la evaluación psicolaboral del candidato. Complementar con los demás criterios del proceso de selección.';
    const closing = closingText?.trim() || 'Los resultados deben interpretarse junto con la entrevista y los demás insumos técnicos del proceso.';

    const columnsFor = (n: number) => (n <= 1 ? 1 : n === 2 || n === 4 ? 2 : 3);
    const traitCols = columnsFor(personalityRows.length);
    const traitChunks: typeof personalityRows[] = [];
    for (let i = 0; i < personalityRows.length; i += traitCols) {
        traitChunks.push(personalityRows.slice(i, i + traitCols));
    }

    return (
        <div
            ref={ref}
            style={{
                width: PAGE_W,
                fontFamily: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
                color: INK,
                background: '#fff',
                lineHeight: 1.45,
                fontSize: 11,
                boxSizing: 'border-box',
                paddingBottom: 4,
            }}
        >
            {/* Portada compacta: marca, título y dictamen */}
            <div data-pdf-block>
                <header style={{ background: '#fff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '0 2px 10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                            {brandLogo ? (
                                <img
                                    src={brandLogo}
                                    alt="Opalo"
                                    crossOrigin="anonymous"
                                    style={{ height: 30, maxWidth: 150, width: 'auto', objectFit: 'contain', display: 'block' }}
                                />
                            ) : (
                                <>
                                    <OpaloMark size={30} />
                                    <div style={{ lineHeight: 1 }}>
                                        <div style={{ fontSize: 19, fontWeight: 800, color: '#1d4ed8', letterSpacing: -0.4 }}>Opalo</div>
                                        <div style={{ fontSize: 7.5, fontWeight: 700, color: MUTED, letterSpacing: 1.6, marginTop: 2 }}>
                                            TALENT · ATS
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
                            <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: 2, color: MUTED }}>EVALUACIÓN DE SELECCIÓN</div>
                            <h1 style={{ margin: 0, fontSize: 19, fontWeight: 800, letterSpacing: -0.3, lineHeight: 1.2, color: INK }}>
                                Informe Psicolaboral
                            </h1>
                        </div>
                        <div style={{ textAlign: 'right', fontSize: 9, lineHeight: 1.45, color: MUTED, flexShrink: 0 }}>
                            <div style={{ fontWeight: 700, letterSpacing: 1.1 }}>DOCUMENTO CONFIDENCIAL</div>
                            <div>
                                Emisión: <strong style={{ color: INK }}>{reportDate}</strong>
                            </div>
                        </div>
                    </div>
                    <div
                        style={{
                            height: 3,
                            borderRadius: 2,
                            background: `linear-gradient(90deg, ${primaryColor} 0%, ${accentColor} 100%)`,
                        }}
                    />
                    <p style={{ margin: '6px 2px 0', fontSize: 9.5, color: MUTED, textAlign: 'center' }}>{truncate(intro, 180)}</p>
                </header>

                {/* Ficha del evaluado + resultado */}
                <section
                    style={{
                        marginTop: 14,
                        display: 'flex',
                        gap: 14,
                        alignItems: 'stretch',
                    }}
                >
                    <div
                        style={{
                            flex: 1,
                            minWidth: 0,
                            border: `1px solid ${LINE}`,
                            borderRadius: 12,
                            padding: '14px 16px',
                            display: 'flex',
                            gap: 14,
                            alignItems: 'center',
                        }}
                    >
                        <div
                            style={{
                                width: 58,
                                height: 58,
                                borderRadius: '50%',
                                flexShrink: 0,
                                overflow: 'hidden',
                                background: `linear-gradient(135deg, ${withAlpha(primaryColor, 0.18)}, ${withAlpha(accentColor, 0.18)})`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: `2px solid ${withAlpha(primaryColor, 0.35)}`,
                            }}
                        >
                            {candidate.avatarUrl ? (
                                <img
                                    src={candidate.avatarUrl}
                                    alt=""
                                    crossOrigin="anonymous"
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            ) : (
                                <span style={{ fontSize: 20, fontWeight: 800, color: primaryColor }}>{initials(personName)}</span>
                            )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 9, fontWeight: 700, color: MUTED, letterSpacing: 1.2 }}>EVALUADO</div>
                            <div style={{ fontSize: 17, fontWeight: 800, lineHeight: 1.25, wordBreak: 'break-word' }}>{personName}</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px', marginTop: 8 }}>
                                {[
                                    ['DNI', candidate.dni || '—'],
                                    ['Edad', candidate.age != null && candidate.age > 0 ? `${candidate.age} años` : '—'],
                                    ['Puesto', position || '—'],
                                    ...(clientName ? [['Cliente', clientName]] : []),
                                ].map(([k, v]) => (
                                    <div key={k} style={{ minWidth: 0 }}>
                                        <div style={{ fontSize: 8.5, fontWeight: 700, color: MUTED, letterSpacing: 0.8 }}>{k.toUpperCase()}</div>
                                        <div style={{ fontSize: 11, fontWeight: 600, wordBreak: 'break-word' }}>{v}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div
                        style={{
                            width: 190,
                            flexShrink: 0,
                            borderRadius: 12,
                            background: suit.bg,
                            border: `1.5px solid ${suit.ring}`,
                            padding: '12px 14px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            textAlign: 'center',
                        }}
                    >
                        <div style={{ fontSize: 9, fontWeight: 700, color: suit.fg, letterSpacing: 1.4, opacity: 0.85 }}>RESULTADO</div>
                        <div style={{ margin: '6px 0', display: 'flex', justifyContent: 'center' }}>
                            <CenteredBox size={40} radius="50%" background={suit.ring} color="#fff" fontSize={21} fontWeight={800}>
                                {suit.symbol}
                            </CenteredBox>
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: suit.fg, lineHeight: 1.15 }}>{suit.label}</div>
                        <div style={{ fontSize: 9.5, color: suit.fg, opacity: 0.85, marginTop: 2 }}>{suit.caption}</div>
                    </div>
                </section>

                {/* Indicadores clave */}
                <section style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
                    <KpiCard
                        color={primaryColor}
                        label="Nivel intelectual"
                        value={intellectual?.name || 'Sin calificar'}
                        hint={
                            evaluation.intellectualScore != null
                                ? `Puntaje ${evaluation.intellectualScore}/60`
                                : intellectual
                                    ? `Rango ${intellectual.scoreRange}`
                                    : '—'
                        }
                    />
                    <KpiCard
                        color={accentColor}
                        label="Ajuste en competencias"
                        value={`${percentage}%`}
                        hint={`${totalObtained}/${totalExpected} pts · ${metCount} de ${competencyRows.length} alcanzadas`}
                        progress={Math.min(100, percentage)}
                    />
                    <KpiCard
                        color={primaryColor}
                        label="Perfil de personalidad"
                        value={`${levelCounts.alto} alto · ${levelCounts.promedio} prom.`}
                        hint={`${levelCounts.bajo} rasgo(s) en nivel bajo`}
                    />
                </section>
            </div>

            {/* 1 · Nivel intelectual */}
            <section data-pdf-block style={{ marginTop: 18 }}>
                <SectionTitle n={1} title="Nivel intelectual" color={primaryColor} />
                <div style={{ display: 'flex', gap: 4, marginTop: 10 }}>
                    {levels.map((level, i) => {
                        const active = i === activeLevelIndex;
                        return (
                            <div
                                key={level.id}
                                style={{
                                    flex: 1,
                                    minWidth: 0,
                                    textAlign: 'center',
                                    padding: active ? '8px 4px' : '6px 4px',
                                    marginTop: active ? 0 : 3,
                                    borderRadius: i === 0 ? '8px 3px 3px 8px' : i === levels.length - 1 ? '3px 8px 8px 3px' : 3,
                                    background: active ? primaryColor : withAlpha(primaryColor, 0.07 + i * 0.03),
                                    color: active ? '#fff' : '#475569',
                                    boxShadow: active ? `0 4px 12px ${withAlpha(primaryColor, 0.35)}` : 'none',
                                }}
                            >
                                <div style={{ fontSize: 10, fontWeight: active ? 800 : 600, lineHeight: 1.2 }}>{level.name}</div>
                                <div style={{ fontSize: 8.5, opacity: 0.85 }}>{level.scoreRange}</div>
                            </div>
                        );
                    })}
                </div>
                <p
                    style={{
                        margin: '10px 0 0',
                        padding: '10px 14px',
                        background: SOFT,
                        borderRadius: 8,
                        borderLeft: `3px solid ${primaryColor}`,
                        color: '#334155',
                        fontSize: 10.5,
                        textAlign: 'justify',
                    }}
                >
                    {truncate(intellectual?.interpretation, 600) || 'Nivel intelectual no calificado.'}
                </p>
            </section>

            {/* 2 · Personalidad (una fila de tarjetas por bloque) */}
            {traitChunks.map((chunk, ci) => (
                <div key={ci} data-pdf-block style={{ marginTop: ci === 0 ? 18 : 10 }}>
                    {ci === 0 && (
                        <div style={{ marginBottom: 10 }}>
                            <SectionTitle n={2} title="Recursos de personalidad" color={accentColor} />
                        </div>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${traitCols}, minmax(0, 1fr))`, gap: 10 }}>
                        {chunk.map(({ trait, level, obs }) => {
                            const meta = LEVEL_META[level];
                            return (
                                <div
                                    key={trait.id}
                                    style={{
                                        border: `1px solid ${LINE}`,
                                        borderTop: `3px solid ${meta.color}`,
                                        borderRadius: 10,
                                        padding: '10px 12px',
                                        background: '#fff',
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                                        <div style={{ fontSize: 11.5, fontWeight: 700, lineHeight: 1.25 }}>{trait.name}</div>
                                        <span
                                            style={{
                                                fontSize: 9,
                                                fontWeight: 800,
                                                color: meta.color,
                                                background: withAlpha(meta.color, 0.12),
                                                borderRadius: 999,
                                                padding: '2px 8px',
                                                whiteSpace: 'nowrap',
                                            }}
                                        >
                                            {meta.label.toUpperCase()}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', gap: 3, marginTop: 7 }}>
                                        {[1, 2, 3].map(step => (
                                            <div
                                                key={step}
                                                style={{
                                                    flex: 1,
                                                    height: 6,
                                                    borderRadius: 3,
                                                    background: step <= meta.steps ? meta.color : '#e2e8f0',
                                                }}
                                            />
                                        ))}
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, color: '#94a3b8', marginTop: 2 }}>
                                        <span>Bajo</span>
                                        <span>Promedio</span>
                                        <span>Alto</span>
                                    </div>
                                    <div style={{ fontSize: 9.5, color: '#475569', marginTop: 6, lineHeight: 1.4 }}>
                                        {obs ? truncate(obs, 220) : truncate(trait.definition, 140)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}

            {/* 3 · Competencias (cada fila es un bloque) */}
            {competencyRows.length > 0 && (
                <div data-pdf-block data-pdf-keep style={{ marginTop: 18 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <SectionTitle n={3} title="Competencias psicolaborales" color={primaryColor} />
                        <div style={{ display: 'flex', gap: 12, fontSize: 9, color: MUTED, alignItems: 'center' }}>
                            <Legend color={primaryColor} label="Alcanzada" />
                            <Legend color="#f59e0b" label="Por debajo de lo esperado" />
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span style={{ width: 2, height: 10, background: INK, display: 'inline-block' }} />
                                Esperado
                            </span>
                        </div>
                    </div>
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 230px 70px',
                            gap: 12,
                            marginTop: 10,
                            padding: '6px 12px',
                            background: SOFT,
                            borderRadius: 8,
                            fontSize: 8.5,
                            fontWeight: 700,
                            color: MUTED,
                            letterSpacing: 0.8,
                        }}
                    >
                        <span>COMPETENCIA</span>
                        <span>PUNTAJE (ESCALA 1 – 9)</span>
                        <span style={{ textAlign: 'right' }}>NIVEL</span>
                    </div>
                </div>
            )}
            {competencyRows.map(({ comp, obtained, meets, obs }) => {
                const barColor = meets ? primaryColor : '#f59e0b';
                const pct = (v: number) => `${(Math.max(0, Math.min(9, v)) / 9) * 100}%`;
                return (
                    <div
                        key={comp.id}
                        data-pdf-block
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 230px 70px',
                            gap: 12,
                            alignItems: 'center',
                            padding: '9px 12px',
                            marginTop: 8,
                            border: `1px solid ${LINE}`,
                            borderRadius: 8,
                        }}
                    >
                        <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, lineHeight: 1.3 }}>{comp.name}</div>
                            <div style={{ fontSize: 9, color: MUTED, lineHeight: 1.35, marginTop: 1 }}>
                                {truncate(comp.definition, 150) || '—'}
                            </div>
                            {obs && (
                                <div style={{ fontSize: 9, color: '#334155', marginTop: 3, fontStyle: 'italic' }}>
                                    Obs.: {truncate(obs, 220)}
                                </div>
                            )}
                        </div>
                        <div>
                            <div style={{ position: 'relative', height: 10, borderRadius: 5, background: '#eef2f7' }}>
                                <div
                                    style={{
                                        position: 'absolute',
                                        left: 0,
                                        top: 0,
                                        bottom: 0,
                                        width: pct(obtained),
                                        borderRadius: 5,
                                        background: barColor,
                                    }}
                                />
                                <div
                                    style={{
                                        position: 'absolute',
                                        left: pct(comp.expectedScore),
                                        top: -3,
                                        width: 2,
                                        height: 16,
                                        marginLeft: -1,
                                        background: INK,
                                        borderRadius: 1,
                                    }}
                                />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, marginTop: 4, color: MUTED }}>
                                <span>
                                    Obtenido <strong style={{ color: INK, fontSize: 10.5 }}>{obtained}</strong>
                                </span>
                                <span>
                                    Esperado <strong style={{ color: INK, fontSize: 10.5 }}>{comp.expectedScore}</strong>
                                </span>
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <span
                                style={{
                                    display: 'inline-block',
                                    fontSize: 9,
                                    fontWeight: 800,
                                    color: barColor,
                                    background: withAlpha(meets ? primaryColor : '#f59e0b', 0.12),
                                    borderRadius: 999,
                                    padding: '3px 9px',
                                }}
                            >
                                {getCompetencyLevelLabel(obtained).toUpperCase()}
                            </span>
                        </div>
                    </div>
                );
            })}

            {/* 4 · Conclusiones (cada párrafo es una tarjeta independiente: los cortes de página caen entre tarjetas) */}
            <div data-pdf-block data-pdf-keep style={{ marginTop: 18 }}>
                <SectionTitle n={4} title="Conclusiones" color={accentColor} />
            </div>
            {(paragraphs.length ? paragraphs : ['Sin conclusiones registradas.']).map((p, i) => (
                <div
                    key={`c-${i}`}
                    data-pdf-block
                    style={{
                        background: withAlpha(accentColor, 0.05),
                        borderLeft: `3px solid ${accentColor}`,
                        padding: '11px 16px',
                        marginTop: 10,
                        borderRadius: 8,
                        fontSize: 11,
                        color: '#1e293b',
                        textAlign: 'justify',
                        lineHeight: 1.55,
                    }}
                >
                    {p}
                </div>
            ))}
            {behavioral.map((p, i) => (
                <div
                    key={`b-${i}`}
                    data-pdf-block
                    style={{
                        marginTop: 10,
                        border: `1px solid ${LINE}`,
                        borderRadius: 10,
                        padding: '10px 14px',
                        fontSize: 10,
                        color: '#334155',
                        textAlign: 'justify',
                        background: '#fff',
                    }}
                >
                    {i === 0 && (
                        <div style={{ fontSize: 9, fontWeight: 800, color: primaryColor, letterSpacing: 1.2, marginBottom: 4 }}>
                            DICTAMEN DE PRUEBAS DE CONDUCTA
                        </div>
                    )}
                    {p}
                </div>
            ))}

            {/* Cierre */}
            <div
                data-pdf-block
                style={{
                    marginTop: 22,
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'space-between',
                    gap: 24,
                }}
            >
                <div style={{ flex: 1, fontSize: 9, color: MUTED, lineHeight: 1.5 }}>
                    <div style={{ fontWeight: 600, color: '#475569' }}>{closing}</div>
                    {footerLegalText?.trim() && <div style={{ marginTop: 3 }}>{footerLegalText.trim()}</div>}
                    <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <OpaloMark size={14} />
                        <span>
                            Generado con <strong style={{ color: '#1d4ed8' }}>Opalo</strong>
                            {companyName && companyName !== 'Opalo' ? ` · ${companyName}` : ''}
                        </span>
                        {showCompanyLogo && (
                            <img
                                src={companyLogo}
                                alt=""
                                crossOrigin="anonymous"
                                style={{ height: 16, maxWidth: 90, objectFit: 'contain', marginLeft: 6 }}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
});

function SectionTitle({ n, title, color }: { n: number; title: string; color: string }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <CenteredBox size={26} radius={8} background={color} color="#fff" fontSize={12} fontWeight={800}>
                {n}
            </CenteredBox>
            <div style={{ fontSize: 14, fontWeight: 800, color: INK, letterSpacing: -0.2 }}>{title}</div>
        </div>
    );
}

/**
 * Centra texto/ícono en una caja fija. Usa celda de tabla porque html2canvas no centra
 * de forma fiable con line-height ni con flex (el contenido sale desplazado hacia abajo/izquierda).
 */
function CenteredBox({
    size,
    radius,
    background,
    color,
    fontSize,
    fontWeight,
    children,
}: {
    size: number;
    radius: number | string;
    background: string;
    color: string;
    fontSize: number;
    fontWeight: number;
    children: React.ReactNode;
}) {
    return (
        <span
            style={{
                display: 'inline-table',
                tableLayout: 'fixed',
                width: size,
                height: size,
                borderRadius: radius,
                background,
                overflow: 'hidden',
                flexShrink: 0,
                boxSizing: 'border-box',
            }}
        >
            <span
                style={{
                    display: 'table-cell',
                    width: size,
                    height: size,
                    verticalAlign: 'middle',
                    textAlign: 'center',
                    color,
                    fontSize,
                    fontWeight,
                    lineHeight: 1,
                    padding: 0,
                }}
            >
                {children}
            </span>
        </span>
    );
}

function KpiCard({
    color,
    label,
    value,
    hint,
    progress,
}: {
    color: string;
    label: string;
    value: string;
    hint: string;
    progress?: number;
}) {
    return (
        <div
            style={{
                borderRadius: 12,
                padding: '11px 14px',
                background: withAlpha(color, 0.06),
                border: `1px solid ${withAlpha(color, 0.2)}`,
            }}
        >
            <div style={{ fontSize: 8.5, fontWeight: 700, color: MUTED, letterSpacing: 1 }}>{label.toUpperCase()}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color, lineHeight: 1.3, marginTop: 2 }}>{value}</div>
            {progress != null && (
                <div style={{ height: 6, borderRadius: 3, background: withAlpha(color, 0.15), marginTop: 5 }}>
                    <div style={{ width: `${progress}%`, height: 6, borderRadius: 3, background: color }} />
                </div>
            )}
            <div style={{ fontSize: 9, color: MUTED, marginTop: 4 }}>{hint}</div>
        </div>
    );
}

function Legend({ color, label }: { color: string; label: string }) {
    return (
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 10, height: 6, borderRadius: 3, background: color, display: 'inline-block' }} />
            {label}
        </span>
    );
}
