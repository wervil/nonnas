import React, { useState, useEffect } from 'react'
import { Control, Controller, FieldValues, Path } from 'react-hook-form'

import { useTranslations } from 'next-intl'
import { Typography } from './Typography'
import { countriesData } from '@/utils/countries'

export interface CountryRegionSelectorProps<T extends FieldValues> {
  countryName: Path<T>
  regionName: Path<T>
  control: Control<T>
  label?: string
  description?: string
  error?: string
}

const countries = Object.keys(countriesData)

const CountryRegionSelector = <T extends FieldValues>({
  countryName,
  regionName,
  control,
  description,
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Country Selector */}
        <div>
          <Typography as="label" color="primaryFocus" className="mb-2">
            {`${l('country')}*`}
          </Typography>
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
                  className={`w-full px-3 py-4 border rounded-lg focus:outline-none bg-primary-hover text-base text-text-pale font-[var(--font-merriweather)] ${
                    fieldState.error ? 'border-red-500' : 'border-primary-main'
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
                  <Typography size="bodyXS" color="dangerMain" className="mt-2">
                    {fieldState.error.message}
                  </Typography>
                )}
              </>
            )}
          />
        </div>

        {/* Region Selector */}
        <div>
          <Typography as="label" color="primaryFocus" className="mb-2">
            {l('region')}*
          </Typography>

          <Controller
            name={regionName}
            control={control}
            render={({ field, fieldState }) => (
              <>
                <select
                  {...field}
                  disabled={!selectedCountry}
                  className={`w-full px-3 py-4 border rounded-lg focus:outline-none bg-primary-hover text-base text-text-pale font-[var(--font-merriweather)] ${
                    fieldState.error ? 'border-red-500' : 'border-primary-main'
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
                  <Typography size="bodyXS" color="dangerMain" className="mt-2">
                    {fieldState.error.message}
                  </Typography>
                )}
              </>
            )}
          />
        </div>
      </div>
      {description ? (
        <Typography size="bodyXS" color="primaryFocus" className="mt-2">
          {description}
        </Typography>
      ) : null}

      {/* Display selected country flag and name */}
      {/* {selectedCountry && (
        <div className="mt-2 flex items-center space-x-2">
          <span className="text-2xl">
            {countriesData[selectedCountry as keyof typeof countriesData].flag}
          </span>
          <span className="text-sm text-gray-600">{selectedCountry}</span>
        </div>
      )} */}
    </div>
  )
}

export default CountryRegionSelector
