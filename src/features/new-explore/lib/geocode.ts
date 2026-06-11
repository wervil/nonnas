export function parseAdminLevelsFromGeocodeResult(result: any) {
  let country: string | null = null,
    state: string | null = null,
    city: string | null = null;
  let countryCode: string | null = null,
    stateCode: string | null = null;
  for (const c of result?.address_components ?? []) {
    const types: string[] = c.types || [];
    if (types.includes("country")) {
      country = c.long_name || null;
      countryCode = c.short_name || null;
    }
    if (types.includes("administrative_area_level_1")) {
      state = c.long_name || null;
      stateCode = c.short_name || null;
    }
    if (
      !city &&
      (types.includes("locality") ||
        types.includes("postal_town") ||
        types.includes("administrative_area_level_2"))
    ) {
      city = c.long_name || null;
    }
  }
  return { country, countryCode, state, stateCode, city };
}
