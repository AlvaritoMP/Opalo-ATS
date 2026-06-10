import React, { useEffect, useMemo, useState } from 'react';
import {
    buildGeoDistrictCounts,
    boundsFromCoordinates,
    createProjector,
    districtFillColor,
    formatDistrictDisplayName,
    mergeBounds,
    ringCentroid,
    ringToSvgPath,
    ringsFromGeometry,
    type LngLat,
} from '../lib/limaDistrictMap';

const GEOJSON_URL = '/data/lima-callao-distritos.geojson';

type DistrictFeature = GeoJSON.Feature<
    GeoJSON.Polygon | GeoJSON.MultiPolygon,
    { distrito: string; distrito2?: string | null; provincia?: string }
>;

interface LimaDistrictMapProps {
    /** Etiqueta de distrito (normalizada) → cantidad de candidatos */
    countsByLabel: Map<string, number>;
    height?: number;
    className?: string;
}

export const LimaDistrictMap: React.FC<LimaDistrictMapProps> = ({
    countsByLabel,
    height = 360,
    className = '',
}) => {
    const [features, setFeatures] = useState<DistrictFeature[]>([]);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [hovered, setHovered] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(GEOJSON_URL);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = (await res.json()) as GeoJSON.FeatureCollection;
                if (!cancelled) {
                    setFeatures((data.features || []) as DistrictFeature[]);
                    setLoadError(null);
                }
            } catch {
                if (!cancelled) {
                    setFeatures([]);
                    setLoadError('No se pudo cargar el mapa de distritos.');
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const geoCounts = useMemo(() => buildGeoDistrictCounts(countsByLabel), [countsByLabel]);
    const maxCount = useMemo(() => Math.max(0, ...geoCounts.values()), [geoCounts]);
    const totalOnMap = useMemo(
        () => [...geoCounts.values()].reduce((sum, n) => sum + n, 0),
        [geoCounts]
    );

    const width = 520;

    const shapes = useMemo(() => {
        if (features.length === 0) return [];

        let bounds = boundsFromCoordinates([]);
        const allCoords: LngLat[] = [];
        for (const feature of features) {
            for (const ring of ringsFromGeometry(feature.geometry)) {
                allCoords.push(...ring);
            }
        }
        bounds = boundsFromCoordinates(allCoords);
        const project = createProjector(bounds, width, height, 14);

        return features.map(feature => {
            const geoKey = feature.properties.distrito;
            const rings = ringsFromGeometry(feature.geometry);
            const outerRing = rings.reduce(
                (best, ring) => (ring.length > best.length ? ring : best),
                rings[0] ?? []
            );
            const centroid = outerRing.length > 0 ? ringCentroid(outerRing) : ([0, 0] as LngLat);
            const [cx, cy] = project(centroid);
            const count = geoCounts.get(geoKey) ?? 0;
            const displayName = formatDistrictDisplayName(geoKey, feature.properties.distrito2);

            return {
                geoKey,
                displayName,
                count,
                cx,
                cy,
                fill: districtFillColor(count, maxCount),
                paths: rings.map(ring => ringToSvgPath(ring, project)),
            };
        });
    }, [features, geoCounts, maxCount, height]);

    if (loadError) {
        return (
            <div
                className={`flex items-center justify-center text-sm text-gray-500 border border-dashed border-gray-200 rounded-lg ${className}`}
                style={{ height }}
            >
                {loadError}
            </div>
        );
    }

    if (features.length === 0) {
        return (
            <div
                className={`flex items-center justify-center text-sm text-gray-500 ${className}`}
                style={{ height }}
            >
                Cargando mapa…
            </div>
        );
    }

    const hoveredShape = hovered ? shapes.find(s => s.geoKey === hovered) : null;

    return (
        <div className={`relative w-full ${className}`}>
            <svg
                viewBox={`0 0 ${width} ${height}`}
                className="w-full h-auto"
                role="img"
                aria-label="Mapa de candidatos por distrito en Lima y Callao"
            >
                <rect x={0} y={0} width={width} height={height} fill="#f8fafc" rx={8} />
                {shapes.map(shape => (
                    <g
                        key={shape.geoKey}
                        onMouseEnter={() => setHovered(shape.geoKey)}
                        onMouseLeave={() => setHovered(null)}
                        style={{ cursor: 'pointer' }}
                    >
                        {shape.paths.map((d, i) => (
                            <path
                                key={`${shape.geoKey}-${i}`}
                                d={d}
                                fill={shape.fill}
                                stroke="#ffffff"
                                strokeWidth={hovered === shape.geoKey ? 2 : 1}
                                opacity={hovered && hovered !== shape.geoKey ? 0.72 : 1}
                            />
                        ))}
                        {shape.count > 0 && (
                            <>
                                <circle
                                    cx={shape.cx}
                                    cy={shape.cy}
                                    r={shape.count >= 100 ? 14 : shape.count >= 10 ? 11 : 9}
                                    fill="white"
                                    fillOpacity={0.92}
                                    stroke="#6d28d9"
                                    strokeWidth={1.5}
                                />
                                <text
                                    x={shape.cx}
                                    y={shape.cy}
                                    textAnchor="middle"
                                    dominantBaseline="central"
                                    fontSize={shape.count >= 100 ? 9 : 10}
                                    fontWeight={700}
                                    fill="#4c1d95"
                                    pointerEvents="none"
                                >
                                    {shape.count}
                                </text>
                            </>
                        )}
                    </g>
                ))}
            </svg>

            {hoveredShape && (
                <div className="absolute top-2 left-2 bg-white/95 border border-gray-200 shadow-sm rounded-md px-2.5 py-1.5 text-xs pointer-events-none">
                    <span className="font-semibold text-gray-900">{hoveredShape.displayName}</span>
                    <span className="text-gray-600">
                        {' '}
                        · {hoveredShape.count} candidato{hoveredShape.count !== 1 ? 's' : ''}
                    </span>
                </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 mt-2 text-[11px] text-gray-500">
                <span>
                    {totalOnMap > 0
                        ? `${totalOnMap} candidato${totalOnMap !== 1 ? 's' : ''} ubicados en Lima / Callao`
                        : 'Sin candidatos emparejados a un distrito del mapa'}
                </span>
                <span className="inline-flex items-center gap-1">
                    <span className="inline-block w-3 h-3 rounded-sm bg-[#e5e7eb]" />
                    0
                    <span className="inline-block w-3 h-3 rounded-sm bg-[#7c3aed] ml-2" />
                    más
                </span>
            </div>
        </div>
    );
};
