declare module 'countries-cities' {
  export function getCities(country: string): string[];
  export function getCountries(): string[];
  export function getStates(country: string): string[];
}
