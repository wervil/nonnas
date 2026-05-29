/**
 * Location helpers built on `country-state-city`.
 * CSC omits city lists for many Italian provinces (e.g. Metropolitan City of Messina).
 */
import { City, ICity, State } from "country-state-city";

const STATE_NAME_PATTERNS: RegExp[] = [
  /^Metropolitan City of (.+)$/i,
  /^(.+?) Province$/i,
  /^Libero consorzio comunale di (.+)$/i,
  /^Provincia di (.+)$/i,
  /^Citt[aà] metropolitana di (.+)$/i,
];

/** Normalize admin labels for comparison (lowercase, trimmed). */
export function normalizeLocationLabel(
  value: string | undefined | null,
): string {
  return (value || "").toLowerCase().trim();
}

/**
 * Extract the primary place name from verbose admin labels
 * e.g. "Metropolitan City of Messina" → "Messina"
 */
export function extractPrimaryPlaceName(
  stateOrRegionName: string | undefined | null,
): string | null {
  const name = (stateOrRegionName || "").trim();
  if (!name) return null;

  for (const pattern of STATE_NAME_PATTERNS) {
    const match = name.match(pattern);
    if (match?.[1]) return match[1].trim();
  }

  return null;
}

function findExactCityInCountry(
  countryIso: string,
  cityName: string,
): ICity | null {
  const target = normalizeLocationLabel(cityName);
  if (!target) return null;

  for (const state of State.getStatesOfCountry(countryIso) || []) {
    for (const city of City.getCitiesOfState(countryIso, state.isoCode) || []) {
      if (normalizeLocationLabel(city.name) === target) {
        return city;
      }
    }
  }
  return null;
}

/** Macro-region state names that contain `cityName` (exact) in CSC data. */
export function findMacroRegionsForCity(
  countryIso: string,
  cityName: string,
): string[] {
  const target = normalizeLocationLabel(cityName);
  if (!target) return [];

  const regions: string[] = [];
  for (const state of State.getStatesOfCountry(countryIso) || []) {
    const cities = City.getCitiesOfState(countryIso, state.isoCode) || [];
    if (cities.some((c) => normalizeLocationLabel(c.name) === target)) {
      regions.push(state.name);
    }
  }
  return regions;
}

/**
 * Cities for a state, with fallback when CSC returns none (common in Italy).
 */
export function getCitiesForState(
  countryIso: string,
  stateIso: string,
): ICity[] {
  const direct = City.getCitiesOfState(countryIso, stateIso) || [];
  if (direct.length > 0) return direct;

  const state = State.getStateByCodeAndCountry(stateIso, countryIso);
  if (!state) return [];

  const primary = extractPrimaryPlaceName(state.name);
  if (!primary) return [];

  const match = findExactCityInCountry(countryIso, primary);
  return match ? [match] : [];
}

/**
 * Whether two region/state labels refer to the same area (handles Italy metro provinces).
 */
export function regionLabelsMatch(
  a: string | undefined | null,
  b: string | undefined | null,
  countryIso?: string | null,
): boolean {
  const na = normalizeLocationLabel(a);
  const nb = normalizeLocationLabel(b);
  if (!na || !nb) return false;
  if (na === nb) return true;

  const pa = normalizeLocationLabel(extractPrimaryPlaceName(a) || a);
  const pb = normalizeLocationLabel(extractPrimaryPlaceName(b) || b);
  if (pa && pb && pa === pb) return true;

  if (countryIso) {
    const macroForA = pa ? findMacroRegionsForCity(countryIso, pa) : [];
    const macroForB = pb ? findMacroRegionsForCity(countryIso, pb) : [];

    if (
      macroForA.some((m) => normalizeLocationLabel(m) === nb) ||
      macroForB.some((m) => normalizeLocationLabel(m) === na)
    ) {
      return true;
    }

    if (
      pa &&
      macroForA.some((m) => normalizeLocationLabel(m) === pb)
    ) {
      return true;
    }
    if (
      pb &&
      macroForB.some((m) => normalizeLocationLabel(m) === na)
    ) {
      return true;
    }
  }

  return na.includes(nb) || nb.includes(na);
}

/**
 * Prefer a geocoder-friendly region string (macro-region when available).
 */
export function resolveGeocodeRegionName(
  regionName: string | undefined | null,
  countryIso?: string | null,
): string | undefined {
  const trimmed = regionName?.trim();
  if (!trimmed) return undefined;

  const primary = extractPrimaryPlaceName(trimmed);
  if (primary && countryIso) {
    const macros = findMacroRegionsForCity(countryIso, primary);
    if (macros.length === 1) return macros[0];
    if (macros.length > 1) {
      const withoutMetro = macros.find(
        (m) => !/metropolitan|citt[aà] metropolitana/i.test(m),
      );
      return withoutMetro ?? macros[0];
    }
  }

  return trimmed;
}
