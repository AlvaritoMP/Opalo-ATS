import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AXES, AXIS_HEAT_COLOR, interpolateSay, looseSectionLabel, type AxisHeat, type AxisId, type ScriptNode } from '../../lib/persuasion/model';

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

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

/** Giro horario de SVG: el nodo queda donde se ve después de `rotate(spin)`. */
function rotatePoint(x: number, y: number, cx: number, cy: number, degrees: number): { x: number; y: number } {
    const rad = (degrees * Math.PI) / 180;
    const dx = x - cx;
    const dy = y - cy;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
}

interface Camera {
    scale: number;
    x: number;
    y: number;
}

const MIN_SCALE = 0.35;
const MAX_SCALE = 16;
const FRAME = 680;

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
    const frameRef = useRef<HTMLDivElement>(null);
    const [cam, setCam] = useState<Camera>({ scale: 1, x: 0, y: 0 });
    const camRef = useRef(cam);
    camRef.current = cam;
    const userMoved = useRef(false);
    const dragRef = useRef<{ id: number; px: number; py: number; x: number; y: number } | null>(null);

    const looseLabel = looseSectionLabel(loose);
    const layout = useMemo(() => {
        const sectors = [...groups.map(group => ({ group, nodes: group.nodes })), ...(loose.length ? [{ group: null, nodes: loose }] : [])];
        const count = Math.max(1, sectors.length);
        const sector = (Math.PI * 2) / count;
        const levelMaps = sectors.map(item => levelsInGroup(item.nodes));
        const maxLevel = Math.max(1, ...levelMaps.flatMap(map => [...map.values()]));
        const axisRadius = 86;
        const step = 108;
        const minChord = 52;

        const placedDraft: Array<Omit<Placed, 'x' | 'y'> & { radius: number }> = [];
        let maxR = axisRadius + 24;

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
            if (item.group) {
                placedDraft.push({
                    key: `axis-${item.group.id}`,
                    angle: mid,
                    kind: 'axis',
                    axisId: item.group.id,
                    level: 0,
                    radius: axisRadius,
                });
            } else {
                placedDraft.push({
                    key: 'loose-hub',
                    angle: mid,
                    kind: 'axis',
                    level: 0,
                    radius: axisRadius,
                });
            }
            for (const [level, nodes] of byLevel) {
                const countN = nodes.length;
                const span = countN <= 1 ? 0 : Math.min(sector * 0.92, Math.max(sector * 0.62, (countN - 1) * 0.2));
                const gap = countN <= 1 ? 0 : span / (countN - 1);
                const needed = gap > 0.001 ? minChord / (2 * Math.sin(gap / 2)) : 0;
                const radius = Math.max(axisRadius + level * step, needed);
                maxR = Math.max(maxR, radius);
                nodes.forEach((node, index) => {
                    const offset = countN === 1 ? 0 : -span / 2 + index * gap;
                    placedDraft.push({
                        key: node.id,
                        angle: mid + offset,
                        kind: 'question',
                        node,
                        index,
                        level,
                        axisId: item.group?.id,
                        radius,
                    });
                });
            }
        });

        const pad = 72;
        const outer = maxR + pad;
        const size = outer * 2;
        const cx = outer;
        const cy = outer;
        const placed: Placed[] = placedDraft.map(point => ({
            ...polar(cx, cy, point.radius, point.angle),
            key: point.key,
            angle: point.angle,
            kind: point.kind,
            axisId: point.axisId,
            node: point.node,
            index: point.index,
            level: point.level,
        }));
        const positionOf = new Map(placed.filter(point => point.node).map(point => [point.node!.id, point]));
        const edges: Edge[] = [];
        const wedges: { key: string; d: string; active: boolean }[] = [];

        sectors.forEach((item, sectorIndex) => {
            const mid = -Math.PI / 2 + sectorIndex * sector + sector / 2;
            const levelOf = levelMaps[sectorIndex];
            const hub = item.group
                ? placed.find(point => point.kind === 'axis' && point.axisId === item.group?.id)
                : placed.find(point => point.key === 'loose-hub');
            if (hub) {
                wedges.push({
                    key: item.group?.id ?? 'loose',
                    d: wedge(cx, cy, 46, maxR + 16, mid - sector * 0.46, mid + sector * 0.46),
                    active: false,
                });
            }

            const roots = item.nodes.filter(node => (levelOf.get(node.id) ?? 1) === 1);
            for (const root of roots) {
                const point = positionOf.get(root.id);
                if (!point || !hub) continue;
                const fromKey = item.group ? `axis-${item.group.id}` : 'loose-hub';
                edges.push({
                    key: `${fromKey}-${root.id}`,
                    x1: hub.x,
                    y1: hub.y,
                    x2: point.x,
                    y2: point.y,
                    hot: !!answers[root.id],
                    fromKey,
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
        ].filter(ring => ring.radius <= maxR + 8);

        return { size, cx, cy, placed, edges, wedges, rings, axisRadius };
    }, [answers, groups, loose]);

    const related = useMemo(
        () => relatedKeys(groups, loose, focusedId, focusedAxis),
        [focusedAxis, focusedId, groups, loose],
    );
    const layoutRef = useRef(layout);
    layoutRef.current = layout;

    const framePoint = (point: { x: number; y: number }, degrees: number, forceReadable: boolean) => {
        const currentLayout = layoutRef.current;
        const seen = rotatePoint(point.x, point.y, currentLayout.cx, currentLayout.cy, degrees);
        setCam(current => {
            const readable = clamp(currentLayout.size / FRAME, MIN_SCALE, MAX_SCALE);
            const width = currentLayout.size / current.scale;
            const inside =
                seen.x > current.x + 48 &&
                seen.x < current.x + width - 48 &&
                seen.y > current.y + 48 &&
                seen.y < current.y + width - 48;
            const tooSmall = current.scale < readable * 0.85;
            if (inside && !tooSmall && userMoved.current && !forceReadable) return current;
            const scale = tooSmall || forceReadable || !userMoved.current ? readable : current.scale;
            const next = currentLayout.size / scale;
            return { scale, x: seen.x - next / 2, y: seen.y - next / 2 };
        });
    };

    const shapeKey = `${groups.map(group => `${group.id}:${group.nodes.map(node => node.id).join('.')}`).join('|')}|${loose.map(node => node.id).join('.')}`;

    useEffect(() => {
        if (userMoved.current) return;
        const currentLayout = layoutRef.current;
        const target = focusedId
            ? currentLayout.placed.find(point => point.node?.id === focusedId)
            : focusedAxis
              ? currentLayout.placed.find(point => point.kind === 'axis' && point.axisId === focusedAxis)
              : undefined;
        if (!target) return;
        const faceTop = -90 - (target.angle * 180) / Math.PI;
        const dest = nearestSpin(spinRef.current, faceTop);
        spinRef.current = dest;
        setSpin(dest);
        framePoint(target, dest, true);
    }, [focusedAxis, focusedId, shapeKey]);

    useEffect(() => {
        const el = frameRef.current;
        if (!el) return;
        const onWheel = (event: WheelEvent) => {
            event.preventDefault();
            const rect = el.getBoundingClientRect();
            if (rect.width < 1 || rect.height < 1) return;
            const currentLayout = layoutRef.current;
            const current = camRef.current;
            const vbW = currentLayout.size / current.scale;
            const vbH = currentLayout.size / current.scale;
            const fit = Math.min(rect.width / vbW, rect.height / vbH);
            const contentW = vbW * fit;
            const contentH = vbH * fit;
            const ox = (rect.width - contentW) / 2;
            const oy = (rect.height - contentH) / 2;
            const px = (event.clientX - rect.left - ox) / contentW;
            const py = (event.clientY - rect.top - oy) / contentH;
            const factor = event.deltaY < 0 ? 1.16 : 1 / 1.16;
            const nextScale = clamp(current.scale * factor, MIN_SCALE, MAX_SCALE);
            const anchorX = current.x + px * vbW;
            const anchorY = current.y + py * vbH;
            const nextW = currentLayout.size / nextScale;
            const nextH = currentLayout.size / nextScale;
            userMoved.current = true;
            setCam({ scale: nextScale, x: anchorX - px * nextW, y: anchorY - py * nextH });
        };
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, []);

    const zoomBy = (factor: number) => {
        const currentLayout = layoutRef.current;
        userMoved.current = true;
        setCam(current => {
            const nextScale = clamp(current.scale * factor, MIN_SCALE, MAX_SCALE);
            const width = currentLayout.size / current.scale;
            const midX = current.x + width / 2;
            const midY = current.y + width / 2;
            const next = currentLayout.size / nextScale;
            return { scale: nextScale, x: midX - next / 2, y: midY - next / 2 };
        });
    };

    const showAll = () => {
        userMoved.current = true;
        setCam({ scale: 1, x: 0, y: 0 });
    };

    const aimAt = (target: Placed, forceReadable: boolean) => {
        const faceTop = -90 - (target.angle * 180) / Math.PI;
        const dest = nearestSpin(spinRef.current, faceTop);
        spinRef.current = dest;
        setSpin(dest);
        framePoint(target, dest, forceReadable);
    };

    const nodeIsReadable = (target: Placed) => {
        const current = camRef.current;
        const currentLayout = layoutRef.current;
        const seen = rotatePoint(target.x, target.y, currentLayout.cx, currentLayout.cy, spinRef.current);
        const width = currentLayout.size / current.scale;
        const readable = clamp(currentLayout.size / FRAME, MIN_SCALE, MAX_SCALE);
        const inside =
            seen.x > current.x + 28 &&
            seen.x < current.x + width - 28 &&
            seen.y > current.y + 28 &&
            seen.y < current.y + width - 28;
        return inside && current.scale >= readable * 0.85;
    };

    const chooseNode = (id: string) => {
        const target = layoutRef.current.placed.find(point => point.node?.id === id);
        if (target && nodeIsReadable(target)) {
            userMoved.current = true;
        } else if (target) {
            userMoved.current = true;
            aimAt(target, true);
        }
        onFocusNode(id);
    };
    const chooseLoose = () => {
        const pending = loose.find(node => !answers[node.id]) ?? loose[0];
        if (pending) chooseNode(pending.id);
    };
    const chooseAxis = (id: AxisId) => {
        const group = groups.find(item => item.id === id);
        const pending = group?.nodes.find(node => !answers[node.id]) ?? group?.nodes[0];
        const target = pending
            ? layoutRef.current.placed.find(point => point.node?.id === pending.id)
            : layoutRef.current.placed.find(point => point.kind === 'axis' && point.axisId === id);
        userMoved.current = true;
        if (target) aimAt(target, true);
        onFocusAxis(id);
    };

    const startDrag = (event: React.PointerEvent<SVGRectElement>) => {
        dragRef.current = {
            id: event.pointerId,
            px: event.clientX,
            py: event.clientY,
            x: camRef.current.x,
            y: camRef.current.y,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
    };
    const moveDrag = (event: React.PointerEvent<SVGRectElement>) => {
        const drag = dragRef.current;
        const el = frameRef.current;
        if (!drag || drag.id !== event.pointerId || !el) return;
        const rect = el.getBoundingClientRect();
        const currentLayout = layoutRef.current;
        const scale = camRef.current.scale;
        const vbW = currentLayout.size / scale;
        const vbH = currentLayout.size / scale;
        const fit = Math.min(rect.width / vbW, rect.height / vbH) || 1;
        const dx = ((event.clientX - drag.px) / (vbW * fit)) * vbW;
        const dy = ((event.clientY - drag.py) / (vbH * fit)) * vbH;
        userMoved.current = true;
        setCam({ scale, x: drag.x - dx, y: drag.y - dy });
    };
    const endDrag = () => {
        dragRef.current = null;
    };
    const looseActive = !focusedAxis && loose.some(node => node.id === focusedId);

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
                            {group.label} <span className="opacity-70">{group.nodes.length}</span>
                        </button>
                    );
                })}
                {loose.length > 0 && (
                    <button
                        type="button"
                        onPointerDown={event => {
                            event.preventDefault();
                            event.stopPropagation();
                            chooseLoose();
                        }}
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            looseActive ? 'bg-indigo-700 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-indigo-50'
                        }`}
                    >
                        {looseLabel} <span className="opacity-70">{loose.length}</span>
                    </button>
                )}
            </div>
            <div ref={frameRef} className="relative min-h-0 flex-1 overflow-hidden" style={{ touchAction: 'none' }}>
            <svg
                viewBox={`${cam.x} ${cam.y} ${layout.size / cam.scale} ${layout.size / cam.scale}`}
                className="block h-full w-full"
                role="img"
                aria-label="Red circular de la llamada"
            >
                <rect
                    x={cam.x}
                    y={cam.y}
                    width={layout.size / cam.scale}
                    height={layout.size / cam.scale}
                    fill="transparent"
                    pointerEvents="all"
                    className="cursor-grab"
                    onPointerDown={startDrag}
                    onPointerMove={moveDrag}
                    onPointerUp={endDrag}
                    onPointerCancel={endDrag}
                />
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
                        <path key={item.key} d={item.d} pointerEvents="none" fill={focusedAxis === item.key || (item.key === 'loose' && looseActive) ? '#e0e7ff' : '#f8fafc'} stroke="none" />
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
                        if (point.key === 'loose-hub') {
                            const done = loose.filter(node => answers[node.id]).length;
                            return (
                                <g key={point.key} className="cursor-pointer" transform={upright}>
                                    <circle
                                        r="30"
                                        fill="transparent"
                                        pointerEvents="all"
                                        onPointerDown={event => {
                                            event.preventDefault();
                                            event.stopPropagation();
                                            chooseLoose();
                                        }}
                                    />
                                    <circle r="22" fill="#ffffff" stroke={looseActive ? '#312e81' : '#64748b'} strokeWidth={looseActive ? 3.4 : 2} pointerEvents="none" />
                                    <text y="32" pointerEvents="none" textAnchor="middle" fontSize="12" fontWeight="700" fill={looseActive ? '#312e81' : '#334155'}>
                                        <tspan x="0" dy="0">{looseLabel}</tspan>
                                        <tspan x="0" dy="14" fontSize="11" fill="#64748b">{done}/{loose.length}</tspan>
                                    </text>
                                </g>
                            );
                        }
                        if (point.kind === 'axis' && point.axisId) {
                            const group = groups.find(item => item.id === point.axisId);
                            const done = group ? group.nodes.filter(node => answers[node.id]).length : 0;
                            const total = group?.nodes.length ?? 0;
                            const selected = focusedAxis === point.axisId;
                            const [line1, line2] = axisLines(group?.label || '');
                            return (
                                <g key={point.key} className="cursor-pointer" transform={upright}>
                                    <circle
                                        r="30"
                                        fill="transparent"
                                        pointerEvents="all"
                                        data-hit="1"
                                        onPointerDown={event => {
                                            event.preventDefault();
                                            event.stopPropagation();
                                            chooseAxis(point.axisId!);
                                        }}
                                    />
                                    <circle
                                        r="22"
                                        fill={heatColor || '#ffffff'}
                                        stroke={selected ? '#312e81' : heatColor || '#64748b'}
                                        strokeWidth={selected ? 3.4 : 2}
                                        pointerEvents="none"
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
                                    r="24"
                                    fill="transparent"
                                    pointerEvents="all"
                                    data-hit="1"
                                    onPointerDown={event => {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        chooseNode(node.id);
                                    }}
                                />
                                <circle
                                    r={current ? 20 : 16}
                                    fill={fill}
                                    stroke={current ? '#1e1b4b' : heatColor || (answered ? '#065f46' : '#94a3b8')}
                                    strokeWidth={current ? 3 : 1.6}
                                    pointerEvents="none"
                                />
                                <text y="5" pointerEvents="none" textAnchor="middle" fontSize="12" fontWeight="700" fill={current || answered ? '#ffffff' : '#475569'}>
                                    {point.level}
                                </text>
                            </g>
                        );
                    })}
                </g>
            </svg>
            <div className="absolute inset-x-1 bottom-1 z-20 flex items-center justify-between gap-1">
                <p className="pointer-events-none text-[10px] text-slate-400">Rueda: zoom · arrastra el fondo</p>
                <div className="flex gap-1">
                    <button
                        type="button"
                        title="Alejar"
                        onPointerDown={event => {
                            event.preventDefault();
                            event.stopPropagation();
                            zoomBy(1 / 1.25);
                        }}
                        className="h-6 w-6 rounded-md bg-white text-sm font-bold text-slate-700 shadow ring-1 ring-slate-200 hover:bg-slate-50"
                    >
                        −
                    </button>
                    <button
                        type="button"
                        title="Acercar"
                        onPointerDown={event => {
                            event.preventDefault();
                            event.stopPropagation();
                            zoomBy(1.25);
                        }}
                        className="h-6 w-6 rounded-md bg-white text-sm font-bold text-slate-700 shadow ring-1 ring-slate-200 hover:bg-slate-50"
                    >
                        +
                    </button>
                    <button
                        type="button"
                        title="Ver toda la red"
                        onPointerDown={event => {
                            event.preventDefault();
                            event.stopPropagation();
                            showAll();
                        }}
                        className="h-6 rounded-md bg-white px-2 text-[10px] font-semibold text-slate-700 shadow ring-1 ring-slate-200 hover:bg-slate-50"
                    >
                        Toda
                    </button>
                </div>
            </div>
            </div>
        </div>
    );
};
