import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AXES, AXIS_HEAT_COLOR, interpolateSay, type AxisHeat, type AxisId, type ScriptNode } from '../../lib/persuasion/model';

export interface NetworkGroup {
    id: AxisId;
    label: string;
    objective: string;
    nodes: ScriptNode[];
}

interface Edge {
    key: string;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    hot: boolean;
    fromKey: string;
    toKey: string;
}

interface Placed {
    key: string;
    x: number;
    y: number;
    angle: number;
    kind: 'axis' | 'question';
    axisId?: AxisId;
    node?: ScriptNode;
    index?: number;
    level: number;
}

interface ScriptNetworkProps {
    groups: NetworkGroup[];
    loose: ScriptNode[];
    answers: Record<string, string>;
    focusedId?: string;
    focusedAxis?: AxisId;
    heat?: Partial<Record<AxisId, AxisHeat>>;
    nombre: string;
    puesto: string;
    onFocusNode: (id: string) => void;
    onFocusAxis: (id: AxisId) => void;
}

function axisLines(label: string): [string, string] {
    const known = AXES.find(axis => axis.label === label);
    if (known?.id === 'familia_hijos') return ['Familia', 'e hijos'];
    if (known?.id === 'capacidades') return ['Capacidades', ''];
    if (known?.id === 'curriculum') return ['Mejorar', 'su CV'];
    if (known?.id === 'rapidez') return ['Rapidez', ''];
    if (known?.id === 'competencia') return ['Competencia', ''];
    if (known?.id === 'contexto') return ['Contexto', ''];
    const words = label.split(' ');
    if (words.length < 2) return [label, ''];
    const mid = Math.ceil(words.length / 2);
    return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
}

function polar(cx: number, cy: number, radius: number, angle: number): { x: number; y: number } {
    return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
}

/** Nivel 1 = primera pregunta del eje. Cada `opens` empuja un anillo más afuera. */
function levelsInGroup(nodes: ScriptNode[]): Map<string, number> {
    const ids = new Set(nodes.map(node => node.id));
    const parents = new Map<string, string[]>();
    for (const node of nodes) {
        for (const alternative of node.alternatives) {
            for (const childId of alternative.opens) {
                if (!ids.has(childId)) continue;
                const list = parents.get(childId) ?? [];
                list.push(node.id);
                parents.set(childId, list);
            }
        }
    }
    const level = new Map<string, number>();
    const visit = (id: string, trail: Set<string>): number => {
        const known = level.get(id);
        if (known) return known;
        if (trail.has(id)) return 1;
        trail.add(id);
        const incoming = parents.get(id) ?? [];
        const next = incoming.length === 0 ? 1 : 1 + Math.max(...incoming.map(parentId => visit(parentId, trail)));
        level.set(id, next);
        return next;
    };
    for (const node of nodes) visit(node.id, new Set());
    return level;
}

function wedge(cx: number, cy: number, inner: number, outer: number, start: number, end: number): string {
    const at = (radius: number, angle: number) => polar(cx, cy, radius, angle);
    const a = at(inner, start);
    const b = at(outer, start);
    const c = at(outer, end);
    const d = at(inner, end);
    const large = end - start > Math.PI ? 1 : 0;
    return `M ${a.x} ${a.y} L ${b.x} ${b.y} A ${outer} ${outer} 0 ${large} 1 ${c.x} ${c.y} L ${d.x} ${d.y} A ${inner} ${inner} 0 ${large} 0 ${a.x} ${a.y} Z`;
}

function relatedKeys(groups: NetworkGroup[], loose: ScriptNode[], focusedId?: string, focusedAxis?: AxisId): Set<string> {
    const keys = new Set<string>();
    const owned = [
        ...groups.flatMap(group => group.nodes.map(node => ({ node, axisId: group.id as AxisId | undefined }))),
        ...loose.map(node => ({ node, axisId: undefined as AxisId | undefined })),
    ];
    if (focusedId) {
        keys.add(focusedId);
        const owner = owned.find(item => item.node.id === focusedId);
        if (owner?.axisId) keys.add(`axis-${owner.axisId}`);
        for (const alternative of owner?.node.alternatives ?? []) {
            for (const childId of alternative.opens) keys.add(childId);
        }
        for (const item of owned) {
            if (item.node.alternatives.some(alternative => alternative.opens.includes(focusedId))) keys.add(item.node.id);
        }
        return keys;
    }
    if (focusedAxis) {
        keys.add(`axis-${focusedAxis}`);
        groups.find(group => group.id === focusedAxis)?.nodes.forEach(node => keys.add(node.id));
    }
    return keys;
}

function nearestSpin(current: number, target: number): number {
    let next = target;
    while (next - current > 180) next -= 360;
    while (current - next > 180) next += 360;
    return next;
}

export const ScriptNetwork: React.FC<ScriptNetworkProps> = ({
    groups,
    loose,
    answers,
    focusedId,
    focusedAxis,
    heat,
    nombre,
    puesto,
    onFocusNode,
    onFocusAxis,
}) => {
    const spinRef = useRef(0);
    const [spin, setSpin] = useState(0);

    const layout = useMemo(() => {
        const sectors = [...groups.map(group => ({ group, nodes: group.nodes })), ...(loose.length ? [{ group: null, nodes: loose }] : [])];
        const count = Math.max(1, sectors.length);
        const sector = (Math.PI * 2) / count;
        const levelMaps = sectors.map(item => levelsInGroup(item.nodes));
        const maxLevel = Math.max(1, ...levelMaps.flatMap(map => [...map.values()]));
        const axisRadius = 78;
        const step = 92;
        const outer = axisRadius + maxLevel * step;
        const pad = 28;
        const size = (outer + pad) * 2;
        const cx = size / 2;
        const cy = size / 2;

        const placed: Placed[] = [];
        const edges: Edge[] = [];
        const wedges: { key: string; d: string; active: boolean }[] = [];

        sectors.forEach((item, sectorIndex) => {
            const mid = -Math.PI / 2 + sectorIndex * sector + sector / 2;
            const levelOf = levelMaps[sectorIndex];
            const byLevel = new Map<number, ScriptNode[]>();
            for (const node of item.nodes) {
                const level = levelOf.get(node.id) ?? 1;
                const list = byLevel.get(level) ?? [];
                list.push(node);
                byLevel.set(level, list);
            }
            const axisPoint = polar(cx, cy, axisRadius, mid);
            if (item.group) {
                placed.push({
                    key: `axis-${item.group.id}`,
                    ...axisPoint,
                    angle: mid,
                    kind: 'axis',
                    axisId: item.group.id,
                    level: 0,
                });
                wedges.push({
                    key: item.group.id,
                    d: wedge(cx, cy, 46, outer - 8, mid - sector * 0.46, mid + sector * 0.46),
                    active: false,
                });
            }

            const positionOf = new Map<string, { x: number; y: number }>();
            for (const [level, nodes] of byLevel) {
                const span = sector * 0.62;
                nodes.forEach((node, index) => {
                    const offset = nodes.length === 1 ? 0 : -span / 2 + (index / (nodes.length - 1)) * span;
                    const angle = mid + offset;
                    const point = polar(cx, cy, axisRadius + level * step, angle);
                    positionOf.set(node.id, point);
                    placed.push({
                        key: node.id,
                        ...point,
                        angle,
                        kind: 'question',
                        node,
                        index,
                        level,
                        axisId: item.group?.id,
                    });
                });
            }

            const roots = item.nodes.filter(node => (levelOf.get(node.id) ?? 1) === 1);
            for (const root of roots) {
                const point = positionOf.get(root.id);
                if (!point || !item.group) continue;
                edges.push({
                    key: `axis-${item.group.id}-${root.id}`,
                    x1: axisPoint.x,
                    y1: axisPoint.y,
                    x2: point.x,
                    y2: point.y,
                    hot: !!answers[root.id],
                    fromKey: `axis-${item.group.id}`,
                    toKey: root.id,
                });
            }
            for (const node of item.nodes) {
                const from = positionOf.get(node.id);
                if (!from) continue;
                const children = [...new Set(node.alternatives.flatMap(alternative => alternative.opens))].filter(id => positionOf.has(id));
                for (const childId of children) {
                    const to = positionOf.get(childId)!;
                    edges.push({
                        key: `${node.id}-${childId}`,
                        x1: from.x,
                        y1: from.y,
                        x2: to.x,
                        y2: to.y,
                        hot: !!answers[node.id],
                        fromKey: node.id,
                        toKey: childId,
                    });
                }
            }
        });

        const rings = [
            { radius: axisRadius, label: 'Ejes' },
            ...Array.from({ length: maxLevel }, (_, index) => ({
                radius: axisRadius + (index + 1) * step,
                label: `Nivel ${index + 1}`,
            })),
        ];

        return { size, cx, cy, placed, edges, wedges, rings, axisRadius };
    }, [answers, groups, loose]);

    const related = useMemo(
        () => relatedKeys(groups, loose, focusedId, focusedAxis),
        [focusedAxis, focusedId, groups, loose],
    );

    useEffect(() => {
        const target = focusedId
            ? layout.placed.find(point => point.node?.id === focusedId)
            : focusedAxis
              ? layout.placed.find(point => point.kind === 'axis' && point.axisId === focusedAxis)
              : undefined;
        if (!target) return;
        const faceTop = -90 - (target.angle * 180) / Math.PI;
        const dest = nearestSpin(spinRef.current, faceTop);
        spinRef.current = dest;
        setSpin(dest);
    }, [focusedAxis, focusedId, layout.placed]);

    const chooseNode = (id: string) => {
        onFocusNode(id);
    };
    const chooseAxis = (id: AxisId) => {
        onFocusAxis(id);
    };

    return (
        <div className="flex h-full min-h-0 flex-col">
            <div className="relative z-20 flex shrink-0 flex-wrap gap-1 px-1 pt-1">
                {groups.map(group => {
                    const active = focusedAxis === group.id;
                    return (
                        <button
                            key={group.id}
                            type="button"
                            onPointerDown={event => {
                                event.preventDefault();
                                event.stopPropagation();
                                chooseAxis(group.id);
                            }}
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                active ? 'bg-indigo-700 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-indigo-50'
                            }`}
                        >
                            {group.label}
                        </button>
                    );
                })}
            </div>
            <div className="relative min-h-0 flex-1 overflow-hidden">
            <svg viewBox={`0 0 ${layout.size} ${layout.size}`} className="block h-full w-full" role="img" aria-label="Red circular de la llamada">
                {layout.rings.map(ring => (
                    <g key={ring.label} pointerEvents="none">
                        <circle cx={layout.cx} cy={layout.cy} r={ring.radius} fill="none" stroke="#e2e8f0" strokeWidth="1" />
                        <text
                            x={layout.cx}
                            y={layout.cy - ring.radius - 6}
                            textAnchor="middle"
                            fontSize="11"
                            fontWeight="700"
                            fill="#94a3b8"
                        >
                            {ring.label}
                        </text>
                    </g>
                ))}
                <g pointerEvents="none">
                    <circle cx={layout.cx} cy={layout.cy} r="18" fill="#f8fafc" stroke="#cbd5e1" />
                    <text x={layout.cx} y={layout.cy + 4} textAnchor="middle" fontSize="9" fontWeight="700" fill="#64748b">
                        Inicio
                    </text>
                </g>
                <g transform={`rotate(${spin} ${layout.cx} ${layout.cy})`}>
                    {layout.wedges.map(item => (
                        <path key={item.key} d={item.d} pointerEvents="none" fill={focusedAxis === item.key ? '#e0e7ff' : '#f8fafc'} stroke="none" />
                    ))}
                    {layout.edges.map(edge => {
                        const linked = related.size === 0 || related.has(edge.fromKey) || related.has(edge.toKey);
                        return (
                            <line
                                key={edge.key}
                                x1={edge.x1}
                                y1={edge.y1}
                                x2={edge.x2}
                                y2={edge.y2}
                                stroke={edge.hot ? '#059669' : '#cbd5e1'}
                                strokeWidth={linked ? (edge.hot ? 2.6 : 1.6) : 1.2}
                                pointerEvents="none"
                                opacity={linked ? 1 : 0.35}
                            />
                        );
                    })}
                    {layout.placed.map(point => {
                        const heatLevel = point.axisId ? heat?.[point.axisId] : undefined;
                        const heatColor = heatLevel !== undefined ? AXIS_HEAT_COLOR[heatLevel] : undefined;
                        const upright = `translate(${point.x} ${point.y}) rotate(${-spin})`;
                        const linked = related.size === 0 || related.has(point.key);
                        if (point.kind === 'axis' && point.axisId) {
                            const group = groups.find(item => item.id === point.axisId);
                            const done = group ? group.nodes.filter(node => answers[node.id]).length : 0;
                            const total = group?.nodes.length ?? 0;
                            const selected = focusedAxis === point.axisId;
                            const [line1, line2] = axisLines(group?.label || '');
                            return (
                                <g key={point.key} className="cursor-pointer" transform={upright}>
                                    <circle
                                        r="22"
                                        fill={heatColor || '#ffffff'}
                                        stroke={selected ? '#312e81' : heatColor || '#64748b'}
                                        strokeWidth={selected ? 3.4 : 2}
                                        onPointerDown={event => {
                                            event.preventDefault();
                                            event.stopPropagation();
                                            chooseAxis(point.axisId!);
                                        }}
                                    />
                                    <text y={32} pointerEvents="none" textAnchor="middle" fontSize="12" fontWeight="700" fill={selected ? '#312e81' : '#334155'}>
                                        <tspan x="0" dy="0">{line1}</tspan>
                                        {line2 && <tspan x="0" dy="13">{line2}</tspan>}
                                        <tspan x="0" dy="14" fontSize="11" fill={heatColor || '#64748b'}>{done}/{total}</tspan>
                                    </text>
                                </g>
                            );
                        }
                        const node = point.node;
                        if (!node) return null;
                        const answered = !!answers[node.id];
                        const current = focusedId === node.id;
                        const say = interpolateSay(node.say, nombre, puesto);
                        const fill = current ? '#4338ca' : answered ? heatColor || '#059669' : '#ffffff';
                        return (
                            <g key={point.key} className="cursor-pointer" opacity={linked || current ? 1 : 0.85} transform={upright}>
                                <title>{`Nivel ${point.level}. ${answered ? `${say} — respondida` : say}`}</title>
                                <circle
                                    r={current ? 20 : 16}
                                    fill={fill}
                                    stroke={current ? '#1e1b4b' : heatColor || (answered ? '#065f46' : '#94a3b8')}
                                    strokeWidth={current ? 3 : 1.6}
                                    onPointerDown={event => {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        chooseNode(node.id);
                                    }}
                                />
                                <text y="5" pointerEvents="none" textAnchor="middle" fontSize="12" fontWeight="700" fill={current || answered ? '#ffffff' : '#475569'}>
                                    {point.level}
                                </text>
                            </g>
                        );
                    })}
                </g>
            </svg>
            </div>
        </div>
    );
};
