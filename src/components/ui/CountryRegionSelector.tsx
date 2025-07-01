import React, { useState, useEffect } from 'react'
import { Control, Controller, FieldValues, Path } from 'react-hook-form'
import { allCountries } from 'country-region-data'
import { useTranslations } from 'next-intl'

interface CountryRegionSelectorProps<T extends FieldValues> {
  countryName: Path<T>
  regionName: Path<T>
  control: Control<T>
  label?: string
  description?: string
  error?: string
}

// Generate flag emoji from country code
const getFlagEmoji = (code: string) =>
  code
    .toUpperCase()
    .split('')
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join('')

// Country data with regions
const countriesData: Record<
  string,
  { flag: string; name: string; regions: string[] }
> = allCountries.reduce((acc, [countryName, countryShortCode, regions]) => {
  acc[countryShortCode] = {
    flag: getFlagEmoji(countryShortCode),
    name: countryName,
    regions: regions.map(([regionName]) => regionName),
  }
  return acc
}, {} as Record<string, { flag: string; name: string; regions: string[] }>)

const countries = Object.keys(countriesData)

const CountryRegionSelector = <T extends FieldValues>({
  countryName,
  regionName,
  control,
  label = 'Location',
  description,
  error,
}: CountryRegionSelectorProps<T>) => {
  const [selectedCountry, setSelectedCountry] = useState<string>('')
  const [regions, setRegions] = useState<string[]>([])
  const l = useTranslations('labels')

  useEffect(() => {
    if (
      selectedCountry &&
      countriesData[selectedCountry as keyof typeof countriesData]
    ) {
      setRegions(
        countriesData[selectedCountry as keyof typeof countriesData].regions
      )
    } else {
      setRegions([])
    }
  }, [selectedCountry])

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700">
        {label || l('location')}
      </label>
      {description && (
        <p className="text-xs text-gray-500 mb-1">{description}</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Country Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {l('country')}
          </label>
          <Controller
            name={countryName}
            control={control}
            render={({ field, fieldState }) => (
              <>
                <select
                  {...field}
                  onChange={(e) => {
                    field.onChange(e.target.value)
                    setSelectedCountry(e.target.value)
                  }}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    fieldState.error ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">{l('country')}</option>
                  {countries.map((country) => (
                    <option key={country} value={country}>
                      {
                        countriesData[country as keyof typeof countriesData]
                          .flag
                      }{' '}
                      {
                        countriesData[country as keyof typeof countriesData]
                          .name
                      }
                    </option>
                  ))}
                </select>
                {fieldState.error && (
                  <p className="mt-1 text-sm text-red-600">
                    {fieldState.error.message}
                  </p>
                )}
              </>
            )}
          />
        </div>

        {/* Region Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {l('region')}
          </label>
          <Controller
            name={regionName}
            control={control}
            render={({ field, fieldState }) => (
              <>
                <select
                  {...field}
                  disabled={!selectedCountry}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    fieldState.error ? 'border-red-500' : 'border-gray-300'
                  } ${
                    !selectedCountry ? 'bg-gray-100 cursor-not-allowed' : ''
                  }`}
                >
                  <option value="">
                    {selectedCountry
                      ? l('region')
                      : l('country') + ' ' + l('first')}
                  </option>
                  {regions.map((region) => (
                    <option key={region} value={region}>
                      {region}
                    </option>
                  ))}
                </select>
                {fieldState.error && (
                  <p className="mt-1 text-sm text-red-600">
                    {fieldState.error.message}
                  </p>
                )}
              </>
            )}
          />
        </div>
      </div>

      {/* Display selected country flag and name */}
      {/* {selectedCountry && (
        <div className="mt-2 flex items-center space-x-2">
          <span className="text-2xl">
            {countriesData[selectedCountry as keyof typeof countriesData].flag}
          </span>
          <span className="text-sm text-gray-600">{selectedCountry}</span>
        </div>
      )} */}

      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  )
}

export default CountryRegionSelector
