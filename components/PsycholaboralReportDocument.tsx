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

/** Imagen de fondo profesional por defecto (equipo / crecimiento) — Unsplash, usable con CORS. */
export const DEFAULT_PSYCHOLABORAL_HERO =
    'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1400&q=85&auto=format&fit=crop';

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
    /** Prioridad: settings → imagen del proceso → predeterminada */
    heroImageUrl?: string | null;
    introText?: string | null;
    /** Frase de cierre motivador (si no hay, texto predeterminado). */
    closingText?: string | null;
    /** Leyenda legal/confidencialidad debajo del cierre (p. ej. desde Configuración → pie de página). */
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

    const resolvedHero =
        (heroImageUrl && heroImageUrl.trim()) ||
        (process?.flyerUrl && process.flyerUrl.trim()) ||
        DEFAULT_PSYCHOLABORAL_HERO;

    const resolvedIntro =
        (introText && introText.trim()) ||
        'Un informe claro y objetivo para conocer el potencial del candidato. Le invitamos a revisarlo por completo: cada sección aporta contexto valioso para una decisión informada y justa.';

    const closingLine =
        (closingText && closingText.trim()) ||
        'Gracias por dedicar tiempo a este informe — la trayectoria profesional de cada persona merece esta mirada con rigor y empatía.';

    return (
        <div
            ref={ref}
            style={{
                width: '794px',
                fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
                color: '#1e293b',
                background: '#f1f5f9',
                lineHeight: 1.5,
            }}
        >
            {/* Hero visual con imagen + gradiente */}
            <header style={{ position: 'relative', overflow: 'hidden' }}>
                <div
                    style={{
                        position: 'relative',
                        minHeight: 220,
                        backgroundImage: `linear-gradient(105deg, ${primaryColor}e6 0%, ${accentColor}cc 42%, rgba(15,23,42,0.78) 100%), url(${resolvedHero})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center center',
                        padding: '36px 40px 44px',
                    }}
                >
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            background:
                                'radial-gradient(ellipse 80% 60% at 100% 0%, rgba(255,255,255,0.2) 0%, transparent 55%)',
                            pointerEvents: 'none',
                        }}
                    />
                    <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            {logoUrl && (
                                <img
                                    src={logoUrl}
                                    alt=""
                                    style={{ height: 38, marginBottom: 14, filter: 'brightness(0) invert(1)', objectFit: 'contain' }}
                                    crossOrigin="anonymous"
                                />
                            )}
                            <p
                                style={{
                                    color: 'rgba(255,255,255,0.9)',
                                    fontSize: 11,
                                    letterSpacing: '0.18em',
                                    textTransform: 'uppercase',
                                    margin: '0 0 10px',
                                    fontWeight: 600,
                                }}
                            >
                                {companyName}
                            </p>
                            <h1
                                style={{
                                    color: '#fff',
                                    fontSize: 28,
                                    fontWeight: 800,
                                    margin: 0,
                                    lineHeight: 1.15,
                                    maxWidth: 460,
                                    textShadow: '0 2px 24px rgba(0,0,0,0.25)',
                                }}
                            >
                                Informe de Evaluación Psicolaboral
                            </h1>
                            <p
                                style={{
                                    margin: '14px 0 0',
                                    color: 'rgba(255,255,255,0.92)',
                                    fontSize: 13,
                                    maxWidth: 420,
                                    lineHeight: 1.55,
                                }}
                            >
                                {candidate.name}
                                <span style={{ opacity: 0.85 }}> · </span>
                                {position || 'Evaluación integral'}
                            </p>
                        </div>
                        <span
                            style={{
                                background: suitStyle.bg,
                                color: suitStyle.text,
                                padding: '12px 22px',
                                borderRadius: 999,
                                fontWeight: 800,
                                fontSize: 13,
                                letterSpacing: '0.06em',
                                boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                                flexShrink: 0,
                            }}
                        >
                            {suitStyle.label}
                        </span>
                    </div>
                </div>

                {/* Mensaje motivador + transición suave al cuerpo */}
                <div
                    style={{
                        margin: '0 24px 0',
                        marginTop: -20,
                        position: 'relative',
                        zIndex: 2,
                        background: '#fff',
                        borderRadius: 14,
                        padding: '18px 22px',
                        boxShadow: '0 12px 40px rgba(15,23,42,0.12)',
                        border: '1px solid rgba(226,232,240,0.9)',
                    }}
                >
                    <p style={{ margin: 0, fontSize: 13, color: '#475569', lineHeight: 1.65, fontStyle: 'italic' }}>
                        “{resolvedIntro}”
                    </p>
                    <div
                        style={{
                            marginTop: 12,
                            height: 3,
                            borderRadius: 2,
                            background: `linear-gradient(90deg, ${primaryColor}, ${accentColor})`,
                            opacity: 0.85,
                        }}
                    />
                </div>
            </header>

            <main style={{ padding: '28px 32px 40px' }}>
                {/* Tarjeta candidato */}
                <section
                    style={{
                        background: '#fff',
                        borderRadius: 16,
                        boxShadow: '0 4px 24px rgba(15,23,42,0.08)',
                        padding: 24,
                        display: 'flex',
                        gap: 24,
                        marginBottom: 24,
                    }}
                >
                    <div
                        style={{
                            width: 88,
                            height: 88,
                            borderRadius: 12,
                            background: `linear-gradient(145deg, ${primaryColor}22, ${accentColor}33)`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            overflow: 'hidden',
                            border: `2px solid ${primaryColor}33`,
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
                            <span style={{ fontSize: 32, fontWeight: 700, color: primaryColor }}>
                                {candidate.name.charAt(0).toUpperCase()}
                            </span>
                        )}
                    </div>
                    <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px' }}>
                        {[
                            ['Nombre', candidate.name],
                            ['DNI', candidate.dni || '—'],
                            ['Edad', candidate.age ? `${candidate.age} años` : '—'],
                            ['Puesto', position],
                            ['Fecha del informe', reportDate],
                        ].map(([label, value]) => (
                            <div key={String(label)}>
                                <p style={{ margin: 0, fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    {label}
                                </p>
                                <p style={{ margin: '2px 0 0', fontSize: 14, fontWeight: 600 }}>{value}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Nivel intelectual */}
                <SectionBlock title="Nivel intelectual" number={1} color={primaryColor}>
                    <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                        {inventory.intellectualLevels.map((level, i) => {
                            const active = level.id === evaluation.intellectualLevelId;
                            return (
                                <div
                                    key={level.id}
                                    style={{
                                        flex: 1,
                                        textAlign: 'center',
                                        padding: '10px 4px',
                                        borderRadius: 10,
                                        background: active ? primaryColor : '#f1f5f9',
                                        color: active ? '#fff' : '#64748b',
                                        fontSize: 9,
                                        fontWeight: active ? 700 : 500,
                                        boxShadow: active ? `0 4px 12px ${primaryColor}55` : 'none',
                                    }}
                                >
                                    <div style={{ fontSize: 10, marginBottom: 2 }}>{level.name}</div>
                                    <div style={{ opacity: active ? 1 : 0.7, fontSize: 8 }}>{level.scoreRange}</div>
                                </div>
                            );
                        })}
                    </div>
                    <div
                        style={{
                            background: `linear-gradient(90deg, ${primaryColor}11, ${accentColor}11)`,
                            borderLeft: `4px solid ${primaryColor}`,
                            padding: 16,
                            borderRadius: '0 12px 12px 0',
                            fontSize: 13,
                            color: '#334155',
                        }}
                    >
                        {intellectual?.interpretation}
                    </div>
                </SectionBlock>

                {/* Personalidad */}
                <SectionBlock title="Recursos de personalidad" number={2} color={accentColor}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {inventory.personalityTraits.map(trait => {
                            const rating = evaluation.personality.find(p => p.traitId === trait.id);
                            const level = rating?.level || 'promedio';
                            return (
                                <div
                                    key={trait.id}
                                    style={{
                                        border: '1px solid #e2e8f0',
                                        borderRadius: 12,
                                        padding: 14,
                                        background: '#fff',
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                        <div>
                                            <strong style={{ fontSize: 13 }}>{trait.name}</strong>
                                            <p style={{ margin: '4px 0 0', fontSize: 11, color: '#64748b' }}>{trait.definition}</p>
                                        </div>
                                        <span
                                            style={{
                                                background: LEVEL_COLORS[level] + '22',
                                                color: LEVEL_COLORS[level],
                                                padding: '4px 12px',
                                                borderRadius: 999,
                                                fontSize: 11,
                                                fontWeight: 700,
                                                textTransform: 'capitalize',
                                                flexShrink: 0,
                                            }}
                                        >
                                            {level}
                                        </span>
                                    </div>
                                    {rating?.observations && (
                                        <p style={{ margin: 0, fontSize: 11, color: '#475569', fontStyle: 'italic' }}>
                                            {rating.observations}
                                        </p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </SectionBlock>

                {/* Competencias */}
                <SectionBlock title="Competencias psicolaborales" number={3} color={primaryColor}>
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 16,
                            marginBottom: 20,
                            padding: 16,
                            background: `linear-gradient(135deg, ${primaryColor}15, ${accentColor}15)`,
                            borderRadius: 12,
                        }}
                    >
                        <div
                            style={{
                                width: 72,
                                height: 72,
                                borderRadius: '50%',
                                background: `conic-gradient(${primaryColor} ${percentage * 3.6}deg, #e2e8f0 0deg)`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                            }}
                        >
                            <div
                                style={{
                                    width: 56,
                                    height: 56,
                                    borderRadius: '50%',
                                    background: '#fff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 800,
                                    fontSize: 18,
                                    color: primaryColor,
                                }}
                            >
                                {percentage}%
                            </div>
                        </div>
                        <div>
                            <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Competencias alcanzadas</p>
                            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>
                                Puntaje obtenido: <strong>{totalObtained}</strong> / esperado: <strong>{totalExpected}</strong>
                            </p>
                            <p style={{ margin: '4px 0 0', fontSize: 10, color: '#94a3b8' }}>
                                Escala: 1–3 Bajo · 4–6 Promedio · 7–9 Alto
                            </p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {competencies.map(comp => {
                            const rating = evaluation.competencies.find(r => r.competencyId === comp.id);
                            const obtained = rating?.obtainedScore ?? 0;
                            const pct = comp.expectedScore > 0 ? Math.min(100, (obtained / 9) * 100) : 0;
                            const levelLabel = getCompetencyLevelLabel(obtained);
                            const barColor =
                                obtained <= 3 ? '#f97316' : obtained <= 6 ? '#3b82f6' : '#10b981';
                            return (
                                <div key={comp.id}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <span style={{ fontSize: 12, fontWeight: 600 }}>{comp.name}</span>
                                        <span style={{ fontSize: 11, color: barColor, fontWeight: 700 }}>
                                            {obtained}/{comp.expectedScore} esp. · {levelLabel}
                                        </span>
                                    </div>
                                    <div style={{ height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                                        <div
                                            style={{
                                                width: `${pct}%`,
                                                height: '100%',
                                                background: barColor,
                                                borderRadius: 4,
                                            }}
                                        />
                                    </div>
                                    {rating?.observations && (
                                        <p style={{ margin: '4px 0 0', fontSize: 10, color: '#64748b' }}>
                                            {rating.observations}
                                        </p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </SectionBlock>

                {/* Conclusiones */}
                <SectionBlock title="Conclusiones" number={4} color={accentColor}>
                    <blockquote
                        style={{
                            margin: 0,
                            padding: 20,
                            background: '#fff',
                            borderLeft: `5px solid ${accentColor}`,
                            borderRadius: '0 12px 12px 0',
                            fontSize: 13,
                            color: '#334155',
                            lineHeight: 1.7,
                            boxShadow: 'inset 0 0 0 1px #e2e8f0',
                        }}
                    >
                        {evaluation.conclusions || 'Sin conclusiones registradas.'}
                    </blockquote>
                </SectionBlock>
            </main>

            <footer
                style={{
                    padding: '20px 32px 28px',
                    fontSize: 10,
                    color: '#94a3b8',
                    borderTop: '1px solid #e2e8f0',
                    background: `linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)`,
                }}
            >
                <p style={{ margin: '0 0 10px', fontSize: 12, color: '#64748b', lineHeight: 1.6, textAlign: 'center' }}>
                    {closingLine}
                </p>
                <p style={{ margin: 0, textAlign: 'center' }}>
                    {['Documento confidencial', footerLegalText?.trim(), companyName, `Generado el ${reportDate}`]
                        .filter(Boolean)
                        .join(' · ')}
                </p>
            </footer>
        </div>
    );
});

function SectionBlock({
    title,
    number,
    color,
    children,
}: {
    title: string;
    number: number;
    color: string;
    children: React.ReactNode;
}) {
    return (
        <section style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <span
                    style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        background: color,
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 13,
                        fontWeight: 800,
                    }}
                >
                    {number}
                </span>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{title}</h2>
            </div>
            {children}
        </section>
    );
}
