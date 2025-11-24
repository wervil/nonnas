import { allCountries } from 'country-region-data'

export const getFlagEmoji = (code: string) =>
  code
    .toUpperCase()
    .split('')
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join('')

export const countriesData: Record<
  string,
  { flag: string; name: string; regions: string[]; countryShortCode: string }
> = allCountries.reduce((acc, [countryName, countryShortCode, regions]) => {
  acc[countryShortCode] = {
    flag: getFlagEmoji(countryShortCode),
    name: countryName,
    regions: regions.map(([regionName]) => regionName),
    countryShortCode,
  }
  return acc
}, {} as Record<string, { flag: string; name: string; regions: string[]; countryShortCode: string }>)

export const countriesReverseMap = allCountries.reduce(
  (acc, [countryName, countryShortCode, regions]) => {
    acc[countryName] = {
      flag: getFlagEmoji(countryShortCode),
      name: countryName,
      regions: regions.map(([regionName]) => regionName),
      countryShortCode,
    }
    return acc
  },
  {} as Record<
    string,
    { flag: string; name: string; regions: string[]; countryShortCode: string }
  >
)
