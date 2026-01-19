import fs from 'fs';
import path from 'path';

// Type definitions for GeoJSON
interface GeoJSONGeometry {
    type: string;
    coordinates: number[] | number[][] | number[][][] | number[][][][];
}

interface StateFeature {
    type: 'Feature';
    properties: {
        iso_a2?: string;
        adm0_a3?: string;
        name?: string;
        name_en?: string;
        gn_name?: string;
        [key: string]: unknown;
    };
    geometry: GeoJSONGeometry;
}

interface StateGeoJSON {
    type: 'FeatureCollection';
    features: StateFeature[];
}

interface StateCoordinate {
    lat: number;
    lng: number;
    name: string;
}

// In-memory cache for parsed GeoJSON data
let stateDataCache: Map<string, StateCoordinate[]> | null = null;

/**
 * Normalize state/region name for matching
 */
function normalizeStateName(name: string): string {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s]/g, '') // Remove special characters
        .replace(/\s+/g, ' '); // Normalize whitespace
}

/**
 * Calculate centroid from GeoJSON geometry
 */
function calculateCentroid(geometry: GeoJSONGeometry): { lat: number; lng: number } | null {
    try {
        let coords: number[][] = [];

        // Extract coordinates based on geometry type
        if (geometry.type === 'Polygon') {
            coords = (geometry.coordinates as number[][][])[0] as number[][];
        } else if (geometry.type === 'MultiPolygon') {
            // Use the first polygon of the multipolygon
            coords = (geometry.coordinates as number[][][][])[0][0] as number[][];
        } else if (geometry.type === 'Point') {
            const point = geometry.coordinates as number[];
            return { lng: point[0], lat: point[1] };
        } else {
            return null;
        }

        // Calculate centroid
        let totalLat = 0;
        let totalLng = 0;
        let count = 0;

        for (const coord of coords) {
            if (Array.isArray(coord) && coord.length >= 2) {
                totalLng += coord[0];
                totalLat += coord[1];
                count++;
            }
        }

        if (count === 0) return null;

        return {
            lng: totalLng / count,
            lat: totalLat / count,
        };
    } catch (error) {
        console.error('Error calculating centroid:', error);
        return null;
    }
}

/**
 * Load and parse state GeoJSON file
 */
function loadStateGeoJSON(): Map<string, StateCoordinate[]> {
    if (stateDataCache) {
        return stateDataCache;
    }

    try {
        const geoJsonPath = path.join(process.cwd(), 'public', 'geo', 'ne_10m_admin_1_states_provinces.geojson');
        const fileContent = fs.readFileSync(geoJsonPath, 'utf-8');
        const geoJson: StateGeoJSON = JSON.parse(fileContent);

        const statesByCountry = new Map<string, StateCoordinate[]>();

        for (const feature of geoJson.features) {
            // Get country code (try multiple fields)
            const countryCode = (feature.properties.iso_a2 || feature.properties.adm0_a3 || '').toUpperCase();

            if (!countryCode || countryCode === '-99') continue;

            // Get state name (try multiple fields)
            const stateName = feature.properties.name || feature.properties.name_en || feature.properties.gn_name;

            if (!stateName) continue;

            // Calculate centroid
            const centroid = calculateCentroid(feature.geometry);

            if (!centroid) continue;

            // Add to map
            if (!statesByCountry.has(countryCode)) {
                statesByCountry.set(countryCode, []);
            }

            statesByCountry.get(countryCode)!.push({
                name: stateName,
                lat: centroid.lat,
                lng: centroid.lng,
            });
        }

        stateDataCache = statesByCountry;
        console.log(`✓ Loaded state coordinates for ${statesByCountry.size} countries`);

        return statesByCountry;
    } catch (error) {
        console.error('Error loading state GeoJSON:', error);
        return new Map();
    }
}

/**
 * Get coordinates for a specific state/region
 */
export function getStateCentroid(
    countryCode: string,
    stateName: string
): { lat: number; lng: number } | null {
    const stateData = loadStateGeoJSON();
    const states = stateData.get(countryCode.toUpperCase());

    if (!states) return null;

    const normalizedQuery = normalizeStateName(stateName);

    // Try exact match first
    for (const state of states) {
        if (normalizeStateName(state.name) === normalizedQuery) {
            return { lat: state.lat, lng: state.lng };
        }
    }

    // Try partial match
    for (const state of states) {
        const normalizedStateName = normalizeStateName(state.name);
        if (normalizedStateName.includes(normalizedQuery) || normalizedQuery.includes(normalizedStateName)) {
            return { lat: state.lat, lng: state.lng };
        }
    }

    return null;
}

/**
 * Get all states for a country
 */
export function getAllStatesForCountry(countryCode: string): StateCoordinate[] {
    const stateData = loadStateGeoJSON();
    return stateData.get(countryCode.toUpperCase()) || [];
}
