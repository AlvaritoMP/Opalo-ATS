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

function rotateAround(x: number, y: number, cx: number, cy: number, degrees: number): { x: number; y: number } {
    const radians = (degrees * Math.PI) / 180;
    const dx = x - cx;
    const dy = y - cy;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
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
    const cameraRef = useRef({ spin: 0, zoom: 1, fx: 0, fy: 0 });
    const [camera, setCamera] = useState(cameraRef.current);
    const [overview, setOverview] = useState(false);

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
        () => (overview ? new Set<string>() : relatedKeys(groups, loose, focusedId, focusedAxis)),
        [focusedAxis, focusedId, groups, loose, overview],
    );

    useEffect(() => {
        const target = focusedId
            ? layout.placed.find(point => point.node?.id === focusedId)
            : focusedAxis
              ? layout.placed.find(point => point.kind === 'axis' && point.axisId === focusedAxis)
              : undefined;
        const keys = overview ? new Set<string>() : relatedKeys(groups, loose, focusedId, focusedAxis);
        const fromSpin = spinRef.current;
        const faceTop = target ? -90 - (target.angle * 180) / Math.PI : fromSpin;
        const destSpin = target && !overview ? nearestSpin(fromSpin, faceTop) : fromSpin;
        const sample = (spinValue: number) => {
            if (!target || overview) return { zoom: 1, fx: layout.cx, fy: layout.cy };
            const pool = layout.placed
                .filter(point => keys.has(point.key))
                .map(point => rotateAround(point.x, point.y, layout.cx, layout.cy, spinValue));
            const selected = rotateAround(target.x, target.y, layout.cx, layout.cy, spinValue);
            const points = pool.length ? pool : [selected];
            const fx = selected.x * 0.42 + layout.cx * 0.58;
            const fy = selected.y * 0.42 + layout.cy * 0.58;
            let maxDist = 90;
            for (const point of points) maxDist = Math.max(maxDist, Math.hypot(point.x - fx, point.y - fy));
            const zoom = Math.max(1.12, Math.min(1.55, (layout.size * 0.46) / maxDist));
            return { zoom, fx, fy };
        };
        const dest = sample(destSpin);
        const fromZoom = cameraRef.current.zoom || 1;
        const started = performance.now();
        let frame = 0;
        const step = (now: number) => {
            const t = Math.min(1, (now - started) / 520);
            const eased = 1 - (1 - t) ** 3;
            const spinValue = fromSpin + (destSpin - fromSpin) * eased;
            const live = sample(spinValue);
            const next = {
                spin: spinValue,
                zoom: fromZoom + (dest.zoom - fromZoom) * eased,
                fx: live.fx,
                fy: live.fy,
            };
            spinRef.current = spinValue;
            cameraRef.current = next;
            setCamera(next);
            if (t < 1) frame = requestAnimationFrame(step);
        };
        frame = requestAnimationFrame(step);
        return () => cancelAnimationFrame(frame);
    }, [focusedAxis, focusedId, groups, layout, loose, overview]);

    const spin = camera.spin;
    const focusQuestion = (id: string) => {
        setOverview(false);
        onFocusNode(id);
    };
    const focusAxis = (id: AxisId) => {
        setOverview(false);
        onFocusAxis(id);
    };

    return (
        <div className="flex h-full min-h-0 flex-col">
            <div className="flex shrink-0 flex-wrap gap-1 px-1 pt-1">
                {groups.map(group => {
                    const active = focusedAxis === group.id;
                    return (
                        <button
                            key={group.id}
                            type="button"
                            onClick={() => focusAxis(group.id)}
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                active ? 'bg-indigo-700 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-indigo-50'
                            }`}
                        >
                            {group.label}
                        </button>
                    );
                })}
            </div>
            <div className="relative min-h-0 flex-1">
            <button
                type="button"
                className="absolute right-1 top-1 z-10 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-semibold text-slate-600 shadow-sm ring-1 ring-slate-200"
                onClick={() => setOverview(value => !value)}
            >
                {overview ? 'Acercar al nodo' : 'Ver toda la red'}
            </button>
            <svg viewBox={`0 0 ${layout.size} ${layout.size}`} className="h-full w-full" role="img" aria-label="Red circular de la llamada">
                <g transform={`translate(${layout.cx} ${layout.cy}) scale(${camera.zoom || 1}) translate(${-(camera.fx || layout.cx)} ${-(camera.fy || layout.cy)})`}>
                {layout.rings.map(ring => (
                    <g key={ring.label} pointerEvents="none" opacity={camera.zoom > 1.35 ? 0 : 1}>
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
                        <path key={item.key} d={item.d} pointerEvents="none" fill={focusedAxis === item.key ? '#e0e7ff' : '#f8fafc'} stroke="none" opacity={overview || related.size === 0 || focusedAxis === item.key ? 1 : 0.35} />
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
                                strokeWidth={linked && !overview ? (edge.hot ? 3.2 : 2.2) : edge.hot ? 2.4 : 1.4}
                                pointerEvents="none"
                                opacity={linked ? 1 : 0.12}
                            />
                        );
                    })}
                    {layout.placed.map(point => {
                        const heatLevel = point.axisId ? heat?.[point.axisId] : undefined;
                        const heatColor = heatLevel !== undefined ? AXIS_HEAT_COLOR[heatLevel] : undefined;
                        const upright = `translate(${point.x} ${point.y}) rotate(${-spin})`;
                        const linked = related.size === 0 || related.has(point.key);
                        const faded = linked ? 1 : 0.72;
                        if (point.kind === 'axis' && point.axisId) {
                            const group = groups.find(item => item.id === point.axisId);
                            const done = group ? group.nodes.filter(node => answers[node.id]).length : 0;
                            const total = group?.nodes.length ?? 0;
                            const selected = focusedAxis === point.axisId && !focusedId;
                            const near = linked && !overview;
                            const [line1, line2] = axisLines(group?.label || '');
                            return (
                                <g key={point.key} className="cursor-pointer" opacity={faded} transform={upright} onClick={() => focusAxis(point.axisId!)}>
                                    <circle r={selected || near ? 24 : 16} fill={heatColor || '#ffffff'} stroke={selected ? '#312e81' : heatColor || '#64748b'} strokeWidth={selected ? 3.4 : 2} />
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
                        const radius = current ? 28 : linked && !overview ? 18 : 14;
                        return (
                            <g key={point.key} className="cursor-pointer" opacity={faded} transform={upright} onClick={() => focusQuestion(node.id)}>
                                <title>{`Nivel ${point.level}. ${answered ? `${say} — respondida` : say}`}</title>
                                <circle r={radius} fill={fill} stroke={current ? '#1e1b4b' : heatColor || (answered ? '#065f46' : '#94a3b8')} strokeWidth={current ? 3.4 : 1.6} />
                                <text y="5" pointerEvents="none" textAnchor="middle" fontSize={current ? 14 : 12} fontWeight="700" fill={current || answered ? '#ffffff' : '#475569'}>
                                    {point.level}
                                </text>
                                {current && (
                                    <text y="42" pointerEvents="none" textAnchor="middle" fontSize="12" fontWeight="600" fill="#312e81">
                                        {say.length > 64 ? `${say.slice(0, 64)}…` : say}
                                    </text>
                                )}
                            </g>
                        );
                    })}
                </g>
                </g>
            </svg>
            </div>
        </div>
    );
};
